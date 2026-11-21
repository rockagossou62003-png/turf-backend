import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/authz";
import { verifyFedapaySignature } from "@/lib/fedapay";

/**
 * Webhook FedaPay (vérifié, idempotent).
 *
 * Signature `x-fedapay-signature: t=<ts>,v1=<hmac>` (FEDAPAY_WEBHOOK_SECRET),
 * anti-rejeu 5 min. Le droit d'accès n'est créé QUE si le montant de
 * l'événement correspond à la commande et que l'orderId n'a pas encore
 * de droit (clé d'unicité Entitlement.orderId).
 *
 * Payload FedaPay (event transaction.status) :
 * { event: "transaction.status", data: { id, custom_metadata: { orderId }, status, amount, currency } }
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-fedapay-signature");

  if (!verifyFedapaySignature(raw, signature)) {
    return NextResponse.json({ error: "SIGNATURE_INVALIDE" }, { status: 401 });
  }

  let body: {
    event?: string;
    data?: {
      id?: number | string;
      status?: string;
      amount?: number;
      currency?: { iso?: string } | string;
      custom_metadata?: { orderId?: string };
    };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "PAYLOAD_INVALIDE" }, { status: 400 });
  }

  const orderId = body.data?.custom_metadata?.orderId;
  const txId = body.data?.id;
  const status = body.data?.status ?? "";
  if (!orderId || !txId) {
    return NextResponse.json({ error: "PAYLOAD_INCOMPLET" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { product: true } });
  if (!order) return NextResponse.json({ error: "COMMANDE_INCONNUE" }, { status: 404 });

  // Le montant doit correspondre exactement à la commande.
  const amount = body.data?.amount ?? null;
  if (amount !== order.amountXof) {
    await logAudit(null, "PAYMENT_AMOUNT_MISMATCH", "Order", order.id, {
      expected: order.amountXof,
      received: amount,
    });
    return NextResponse.json({ error: "MONTANT_INCOHERENT" }, { status: 409 });
  }

  const succeeded = status === "approved" || status === "transferred" || status === "paid";
  const failed = ["failed", "canceled", "declined", "refunded"].includes(status);
  if (!succeeded && !failed) {
    // Statut intermédiaire (pending, processing…) : acquitté sans effet.
    return NextResponse.json({ ok: true, ignored: status });
  }

  // Idempotence : un paiement déjà traité pour cette transaction est acquitté.
  const already = await prisma.payment.findUnique({ where: { externalId: `FEDAPAY-${txId}` } });
  if (already) return NextResponse.json({ ok: true, duplicate: true });

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: order.id,
        providerName: "fedapay",
        externalId: `FEDAPAY-${txId}`,
        status: succeeded ? "SUCCEEDED" : "FAILED",
        amountXof: order.amountXof,
        currency: order.currency,
        rawEvent: body as object,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: succeeded ? "SUCCEEDED" : "FAILED" },
    });

    if (succeeded) {
      const isVip = order.product.code === "VIP_24H" || order.product.code === "VIP_7D";
      const expiresAt = isVip
        ? new Date(Date.now() + (order.product.code === "VIP_24H" ? 24 : 24 * 7) * 3600 * 1000)
        : null;

      const existing = await tx.entitlement.findUnique({ where: { orderId: order.id } });
      if (!existing) {
        await tx.entitlement.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            product: order.product.code,
            raceId: order.raceId,
            startsAt: new Date(),
            expiresAt,
          },
        });
      }
    }
  });

  await logAudit(order.userId, succeeded ? "PAYMENT_CONFIRMED" : "PAYMENT_FAILED", "Order", order.id, {
    provider: "fedapay",
    transactionId: txId,
  });

  return NextResponse.json({ ok: true });
}
