import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { logAudit } from "@/lib/authz";
import { isFedaPayConfigured, isFedaPayLiveConfigured, createFedapayTransaction } from "@/lib/fedapay";

/**
 * Création de commande.
 * - FedaPay configuré : création d'une transaction et retour de son lien.
 * - Sinon : simulation locale uniquement hors production.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  if (process.env.NODE_ENV === "production" && !isFedaPayLiveConfigured()) {
    return NextResponse.json({ error: "PAIEMENT_NON_CONFIGURE" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const productCode = typeof body?.productCode === "string" ? body.productCode : "";
  const raceId = typeof body?.raceId === "string" && body.raceId ? body.raceId : null;

  const product = await prisma.product.findUnique({ where: { code: productCode } });
  if (!product || !product.active) {
    return NextResponse.json({ error: "PRODUIT_INCONNU" }, { status: 400 });
  }

  // Les produits VIP sont globaux : pas de course rattachée.
  const isVip = product.code === "VIP_24H" || product.code === "VIP_7D";
  if (!isVip) {
    if (!raceId) return NextResponse.json({ error: "COURSE_REQUISE" }, { status: 400 });
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) return NextResponse.json({ error: "COURSE_INCONNUE" }, { status: 404 });
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      productId: product.id,
      raceId: isVip ? null : raceId,
      amountXof: product.priceXof,
      currency: "XOF",
      status: "PENDING",
      providerRef: null,
    },
    include: { product: true },
  });

  await logAudit(user.id, "ORDER_CREATED", "Order", order.id, {
    productCode: product.code,
    raceId: order.raceId,
    amountXof: order.amountXof,
  });

  // FedaPay creates the charge; only its signed webhook grants access.
  if (isFedaPayConfigured()) {
    try {
      const origin = (process.env.APP_URL ?? new URL(request.url).origin).replace(/\/+$/, "");
      const tx = await createFedapayTransaction({
        orderId: order.id,
        description: `TURF PRO — ${product.label}`,
        amountXof: product.priceXof,
        customerEmail: user.email,
        callbackUrl: `${origin}/mon-compte`,
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { providerRef: `FEDAPAY-${tx.transactionId}` },
      });
      await logAudit(user.id, "FEDAPAY_TRANSACTION_CREATED", "Order", order.id, {
        transactionId: tx.transactionId,
      });
      return NextResponse.json(
        {
          order: { id: order.id, product: product.code, label: product.label, amountXof: product.priceXof, currency: order.currency, status: order.status, raceId: order.raceId },
          payment: { provider: "fedapay", paymentUrl: tx.paymentUrl },
        },
        { status: 201 },
      );
    } catch (e) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });
      await logAudit(user.id, "FEDAPAY_TRANSACTION_FAILED", "Order", order.id, {
        error: e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json({ error: "PAIEMENT_INDISPONIBLE" }, { status: 502 });
    }
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "PAIEMENT_NON_CONFIGURE" }, { status: 503 });
  }

  // Local development only: simulation is never used for production orders.
  await prisma.order.update({
    where: { id: order.id },
    data: { providerRef: `SIM-${randomUUID()}` },
  });

  return NextResponse.json(
    {
      order: {
        id: order.id,
        product: order.product.code,
        label: order.product.label,
        amountXof: order.amountXof,
        currency: order.currency,
        status: order.status,
        raceId: order.raceId,
      },
      payment: { provider: "simulation" },
    },
    { status: 201 },
  );
}
