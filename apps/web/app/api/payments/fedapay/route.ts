import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/authz";
import { verifyFedapaySignature } from "@/lib/fedapay";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-fedapay-signature");

  if (!verifyFedapaySignature(raw, signature)) {
    return NextResponse.json({ error: "SIGNATURE_INVALIDE" }, { status: 401 });
  }

  let event: JsonRecord;
  let eventPayload: Prisma.InputJsonValue;
  try {
    const parsedPayload: unknown = JSON.parse(raw);
    const parsedEvent = asRecord(parsedPayload);
    if (!parsedEvent) return NextResponse.json({ error: "PAYLOAD_INVALIDE" }, { status: 400 });
    event = parsedEvent;
    eventPayload = parsedPayload as Prisma.InputJsonValue;
  } catch {
    return NextResponse.json({ error: "PAYLOAD_INVALIDE" }, { status: 400 });
  }

  const transaction =
    asRecord(event.object) ??
    asRecord(asRecord(event.data)?.object) ??
    asRecord(event.data);
  const metadata = asRecord(transaction?.custom_metadata);
  const orderId = metadata?.orderId;
  const txId = transaction?.id;
  const eventName = typeof event.name === "string" ? event.name : "";
  const transactionStatus = typeof transaction?.status === "string" ? transaction.status.toLowerCase() : "";
  const eventStatus = eventName.startsWith("transaction.") ? eventName.slice("transaction.".length).toLowerCase() : "";
  const terminalStatuses = new Set([
    "approved",
    "transferred",
    "paid",
    "refunded",
    "canceled",
    "cancelled",
    "failed",
    "declined",
  ]);
  const status = terminalStatuses.has(eventStatus) ? eventStatus : transactionStatus;
  const eventId = event?.id;
  if (typeof orderId !== "string" || (typeof txId !== "string" && typeof txId !== "number")) {
    return NextResponse.json({ error: "PAYLOAD_INCOMPLET" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { product: true } });
  if (!order) return NextResponse.json({ error: "COMMANDE_INCONNUE" }, { status: 404 });

  if (order.providerRef !== `FEDAPAY-${txId}`) {
    return NextResponse.json({ error: "TRANSACTION_INCOHERENTE" }, { status: 409 });
  }

  const rawAmount = transaction?.amount;
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : typeof rawAmount === "string" && /^\d+$/.test(rawAmount)
        ? Number(rawAmount)
        : null;
  const currency = asRecord(transaction?.currency)?.iso ?? transaction?.currency;
  if (
    amount !== order.amountXof ||
    (currency !== undefined && currency !== null && currency !== "XOF")
  ) {
    await logAudit(null, "PAYMENT_AMOUNT_MISMATCH", "Order", order.id, {
      expected: order.amountXof,
      received: amount,
    });
    return NextResponse.json({ error: "MONTANT_INCOHERENT" }, { status: 409 });
  }

  const succeeded = ["approved", "transferred", "paid"].includes(status);
  const refunded = status === "refunded";
  const cancelled = ["canceled", "cancelled"].includes(status);
  const failed = status === "failed" || status === "declined";
  if (!succeeded && !refunded && !cancelled && !failed) {
    // Statut intermédiaire (pending, processing…) : acquitté sans effet.
    return NextResponse.json({ ok: true, ignored: status });
  }

  const safeEventId = typeof eventId === "string" || typeof eventId === "number" ? String(eventId) : `${txId}-${status}`;
  const externalId = `FEDAPAY-EVENT-${safeEventId}`;
  const already = await prisma.payment.findUnique({ where: { externalId } });
  if (already) return NextResponse.json({ ok: true, duplicate: true });

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: order.id,
        providerName: "fedapay",
        externalId,
        status: succeeded ? "SUCCEEDED" : refunded ? "REFUNDED" : cancelled ? "CANCELLED" : "FAILED",
        amountXof: order.amountXof,
        currency: order.currency,
        rawEvent: eventPayload,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: succeeded ? "SUCCEEDED" : refunded ? "REFUNDED" : cancelled ? "CANCELLED" : "FAILED" },
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
      } else if (refunded) {
        await tx.entitlement.deleteMany({ where: { orderId: order.id } });
      }
    }
  });

  await logAudit(
    order.userId,
    succeeded
      ? "PAYMENT_CONFIRMED"
      : refunded
        ? "PAYMENT_REFUNDED"
        : cancelled
          ? "PAYMENT_CANCELLED"
          : "PAYMENT_FAILED",
    "Order",
    order.id,
    { provider: "fedapay", transactionId: txId },
  );

  return NextResponse.json({ ok: true });
}
