import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/authz";

const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ??
  (process.env.NODE_ENV === "production" ? "" : "dev-simulation-secret");

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Webhook de paiement (idempotent).
 * En développement sans prestataire réel, un endpoint de simulation signé
 * permet de confirmer une commande. Signature HMAC-SHA256 obligatoire,
 * événement traité une seule fois (clé d'unicité sur Payment.externalId).
 *
 * Payload : { eventId, orderId, status: "SUCCEEDED"|"FAILED", amountXof }
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "SIMULATION_DESACTIVE_EN_PRODUCTION" }, { status: 404 });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-payment-signature");

  if (!verifySignature(raw, signature)) {
    return NextResponse.json({ error: "SIGNATURE_INVALIDE" }, { status: 401 });
  }

  let event: { eventId?: string; orderId?: string; status?: string; amountXof?: number };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "PAYLOAD_INVALIDE" }, { status: 400 });
  }

  if (!event.eventId || !event.orderId || !event.status) {
    return NextResponse.json({ error: "PAYLOAD_INCOMPLET" }, { status: 400 });
  }

  // Idempotence : un eventId déjà traité est acquitté sans effet.
  const already = await prisma.payment.findUnique({ where: { externalId: event.eventId } });
  if (already) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const order = await prisma.order.findUnique({ where: { id: event.orderId }, include: { product: true } });
  if (!order) return NextResponse.json({ error: "COMMANDE_INCONNUE" }, { status: 404 });

  if (event.amountXof !== order.amountXof) {
    await logAudit(null, "PAYMENT_AMOUNT_MISMATCH", "Order", order.id, {
      expected: order.amountXof,
      received: event.amountXof,
    });
    return NextResponse.json({ error: "MONTANT_INCOHERENT" }, { status: 409 });
  }

  const succeeded = event.status === "SUCCEEDED";

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: order.id,
        providerName: "simulation",
        externalId: event.eventId ?? "",
        status: succeeded ? "SUCCEEDED" : "FAILED",
        amountXof: order.amountXof,
        currency: order.currency,
        rawEvent: event as object,
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

      // Idempotence métier : une commande déjà pourvue d'un droit n'en reçoit pas un second.
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
    eventId: event.eventId,
  });

  return NextResponse.json({ ok: true });
}
