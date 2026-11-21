import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/authz";

/**
 * Tâche planifiée : publie les pronostics APPROVED dont l'heure de
 * publication programmée est atteinte. Appelée par un cron externe
 * (ex. toutes les minutes) avec le header `x-cron-secret`.
 * Idempotent : ne publie que ce qui est exactement en attente.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!secret || !provided) {
    return NextResponse.json({ error: "NON_CONFIGURE" }, { status: 503 });
  }
  const a = Buffer.from(createHmac("sha256", "cmp").update(secret).digest());
  const b = Buffer.from(createHmac("sha256", "cmp").update(provided).digest());
  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "NON_AUTORISE" }, { status: 401 });
  }

  // Candidats : pronostics SCHEDULED dont l'heure programmée (stockée dans
  // inputSnapshot.scheduledFor) est passée, la course n'étant pas annulée/quarantaine.
  const candidates = await prisma.prediction.findMany({
    where: { status: "SCHEDULED" },
    include: { race: true },
  });

  const now = Date.now();
  let published = 0;
  const skipped: string[] = [];

  for (const p of candidates) {
    const snap = (p.inputSnapshot ?? {}) as { scheduledFor?: string };
    const target = snap.scheduledFor ? new Date(snap.scheduledFor).getTime() : NaN;
    if (!Number.isFinite(target)) {
      skipped.push(p.id);
      continue;
    }
    if (target > now) continue; // pas encore l'heure
    if (["CANCELLED", "POSTPONED", "DATA_QUARANTINED"].includes(p.race.status)) {
      await prisma.prediction.update({ where: { id: p.id }, data: { status: "WITHDRAWN" } });
      continue;
    }
    await prisma.prediction.update({
      where: { id: p.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    published++;
  }

  if (published > 0) {
    await logAudit(null, "CRON_PUBLISHED", "Prediction", null, { published });
  }
  return NextResponse.json({ ok: true, published, skippedOrphaned: skipped.length });
}
