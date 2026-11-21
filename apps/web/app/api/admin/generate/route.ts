import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isStaff } from "@/lib/session";
import { logAudit } from "@/lib/authz";
import { createAiPredictionForRace } from "@/lib/analysis";

/**
 * Génération d'analyses par le moteur (staff uniquement).
 * POST { raceIds?: string[] } — sans `raceIds`, toutes les courses
 * VERIFIED/SCHEDULED à venir éligibles. Sortie : statut AI_GENERATED,
 * JAMAIS publiée automatiquement (validation humaine obligatoire).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const raceIds = Array.isArray(body?.raceIds)
    ? (body.raceIds.filter((r: unknown) => typeof r === "string") as string[])
    : null;

  const races = await prisma.race.findMany({
    where: {
      ...(raceIds ? { id: { in: raceIds } } : {}),
      status: { in: ["VERIFIED", "SCHEDULED"] },
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 50,
  });

  let created = 0;
  let skipped = 0;
  const details: { raceId: string; created: boolean }[] = [];

  for (const race of races) {
    const res = await createAiPredictionForRace(race.id);
    if (res.created) created++;
    else skipped++;
    details.push({ raceId: race.id, created: res.created });
  }

  await logAudit(user.id, "AI_BATCH_GENERATED", "Prediction", null, {
    eligibleRaces: races.length,
    created,
    skipped,
  });

  return NextResponse.json({ ok: true, eligibleRaces: races.length, created, skipped, details });
}

/** Statut du parc d'analyses générées en attente de validation. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const pending = await prisma.prediction.findMany({
    where: { status: "AI_GENERATED", modelName: { not: null } },
    orderBy: { createdAt: "desc" },
    include: { race: true },
  });
  return NextResponse.json({
    pending: pending.map((p) => ({
      id: p.id,
      title: p.title,
      race: { id: p.race.id, name: p.race.name },
      model: `${p.modelName}@${p.modelVersion ?? "?"}`,
      generatedAt: p.generatedAt,
    })),
  });
}
