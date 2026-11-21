import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { logAudit } from "@/lib/authz";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "SIMULATION_DESACTIVE_EN_PRODUCTION" }, { status: 404 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });

  if (!order) return NextResponse.json({ error: "COMMANDE_INCONNUE" }, { status: 404 });
  if (order.userId !== user.id) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (order.status !== "PENDING") {
    return NextResponse.json({ ok: true, status: order.status, duplicate: true });
  }

  const eventId = `SIM-EVT-${order.id}`;
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: order.id,
        providerName: "simulation",
        externalId: eventId,
        status: "SUCCEEDED",
        amountXof: order.amountXof,
        currency: order.currency,
        rawEvent: { eventId, orderId: order.id, status: "SUCCEEDED", amountXof: order.amountXof },
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "SUCCEEDED" },
    });

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
  });

  await logAudit(user.id, "PAYMENT_CONFIRMED", "Order", order.id, {
    eventId,
    simulation: true,
  });
  return NextResponse.json({ ok: true, status: "SUCCEEDED" });
}
