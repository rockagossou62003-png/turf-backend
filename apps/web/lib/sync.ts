import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/authz";

/**
 * Connecteur de synchronisation hippique.
 *
 * Règle métier : aucune donnée n'est inventée. Le connecteur lit une source
 * configurée (fichier d'import structuré ou API sous contrat écrit) et
 * applique les règles de qualité :
 * - course déjà connue  -> mise à jour idempotente (upsert par provider+id),
 * - partants             -> upsert par (raceId, numéro/nom),
 * - changement critique  (non-partant, heure) -> course repassée en
 *   DATA_QUARANTINED jusqu'à re-validation humaine, pronostics publiés
 *   suspendus (WITHDRAWN).
 */

export type IncomingRunner = {
  number?: number;
  horseName: string;
  jockeyName?: string;
  trainerName?: string;
  isNonRunner?: boolean;
};

export type IncomingRace = {
  providerRaceId: string;
  country: string;
  venue: string;
  meetingName?: string;
  name: string;
  startsAt: string;
  distanceMeters?: number;
  surface?: string;
  runners: IncomingRunner[];
};

export type SyncResult = {
  syncRunId: string;
  status: "SUCCESS" | "FAILED";
  error: string | null;
  racesUpserted: number;
  runnersUpserted: number;
  quarantined: number;
  predictionsWithdrawn: number;
};

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function upsertRace(race: IncomingRace, providerCode: string) {
  const startsAt = new Date(race.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new Error(`Date invalide : ${race.startsAt}`);
  if (!race.runners.length) throw new Error(`Course ${race.providerRaceId} sans partants`);

  const payloadHash = hashPayload(race);
  const isFrenchProvider = providerCode === "theracingapi";
  const isManualProvider = providerCode === "manual";
  const existing = await prisma.race.findUnique({
    where: { provider_providerRaceId: { provider: providerCode, providerRaceId: race.providerRaceId } },
    include: { runners: true },
  });

  // Contrôle qualité : un changement critique suspend la course et ses pronostics.
  let criticalChange = false;
  if (existing) {
    const timeChanged = existing.startsAt.getTime() !== startsAt.getTime();
    const previouslyDeclared = new Map(
      existing.runners.filter((r) => !r.isNonRunner).map((r) => [r.horseName.toLowerCase(), true]),
    );
    const nowNonRunner = race.runners.some(
      (r) => r.isNonRunner && previouslyDeclared.has(r.horseName.toLowerCase()),
    );
    const manualDataChanged = isManualProvider && existing.rawPayloadHash !== payloadHash;
    criticalChange = timeChanged || nowNonRunner || manualDataChanged;
  }
  const requiresQuarantine = criticalChange && !isManualProvider;
  const manualRaceIsTerminal = ["FINISHED", "RESULT_CONFIRMED", "CANCELLED"].includes(existing?.status ?? "");

  const upserted = await prisma.race.upsert({
    where: { provider_providerRaceId: { provider: providerCode, providerRaceId: race.providerRaceId } },
    create: {
      provider: providerCode,
      providerRaceId: race.providerRaceId,
      country: race.country,
      venue: race.venue,
      meetingName: race.meetingName ?? null,
      name: race.name,
      startsAt,
      distanceMeters: race.distanceMeters ?? null,
      surface: race.surface ?? null,
      status: requiresQuarantine ? "DATA_QUARANTINED" : isFrenchProvider || isManualProvider ? "SCHEDULED" : "DISCOVERED",
      sourceUpdatedAt: new Date(),
      rawPayloadHash: payloadHash,
    },
    update: {
      name: race.name,
      startsAt,
      venue: race.venue,
      meetingName: race.meetingName ?? null,
      distanceMeters: race.distanceMeters ?? null,
      surface: race.surface ?? null,
      sourceUpdatedAt: new Date(),
      rawPayloadHash: payloadHash,
      ...(requiresQuarantine ? { status: "DATA_QUARANTINED" as const } : {}),
      ...(!requiresQuarantine && isManualProvider && !manualRaceIsTerminal ? { status: "SCHEDULED" as const } : {}),
      ...(!requiresQuarantine && existing?.status === "DISCOVERED" && isFrenchProvider
        ? { status: "SCHEDULED" as const }
        : {}),
    },
  });

  let runnersUpserted = 0;
  const retainedRunnerIds: string[] = [];
  for (const r of race.runners) {
    const data = {
      number: r.number ?? null,
      horseName: r.horseName,
      jockeyName: r.jockeyName ?? null,
      trainerName: r.trainerName ?? null,
      isNonRunner: r.isNonRunner ?? false,
      sourceUpdatedAt: new Date(),
    };
    // Match par nom de cheval en priorité (les numéros peuvent changer tardivement).
    const byName = await prisma.runner.findFirst({
      where: { raceId: upserted.id, horseName: { equals: r.horseName } },
    });
    if (byName) {
      const updated = await prisma.runner.update({ where: { id: byName.id }, data });
      retainedRunnerIds.push(updated.id);
    } else if (r.number != null) {
      const byNumber = await prisma.runner.findFirst({
        where: { raceId: upserted.id, number: r.number },
      });
      if (byNumber) {
        const updated = await prisma.runner.update({ where: { id: byNumber.id }, data });
        retainedRunnerIds.push(updated.id);
      } else {
        const created = await prisma.runner.create({ data: { ...data, raceId: upserted.id } });
        retainedRunnerIds.push(created.id);
      }
    } else {
      const created = await prisma.runner.create({ data: { ...data, raceId: upserted.id } });
      retainedRunnerIds.push(created.id);
    }
    runnersUpserted++;
  }

  if (isManualProvider) {
    await prisma.runner.deleteMany({
      where: { raceId: upserted.id, id: { notIn: retainedRunnerIds } },
    });
  }

  if (criticalChange) {
    const withdrawn = await prisma.prediction.updateMany({
      where: { raceId: upserted.id, status: "PUBLISHED" },
      data: { status: "WITHDRAWN" },
    });
    return {
      upserted,
      runnersUpserted,
      quarantined: requiresQuarantine ? 1 : 0,
      predictionsWithdrawn: withdrawn.count,
    };
  }
  return { upserted, runnersUpserted, quarantined: 0, predictionsWithdrawn: 0 };
}

/**
 * Lance une synchronisation. En mode `demo`, un jeu de données de démonstration
 * clairement marqué est importé. En production, `races` provient d'un flux
 * réel sous contrat écrit (aucun accord, aucune synchronisation).
 */
export async function runSync(
  providerCode: string,
  races: IncomingRace[],
  actorId: string | null,
): Promise<SyncResult> {
  const provider = await prisma.provider.upsert({
    where: { code: providerCode },
    update: {
      enabled: providerCode !== "demo",
      ...(providerCode === "manual" ? { name: "Saisie manuelle" } : {}),
    },
    create: {
      code: providerCode,
      name:
        providerCode === "theracingapi"
          ? "The Racing API"
          : providerCode === "manual"
            ? "Saisie manuelle"
            : providerCode,
      enabled: providerCode !== "demo",
    },
  });

  const run = await prisma.syncRun.create({
    data: { providerId: provider.id, status: "RUNNING" },
  });

  let racesUpserted = 0;
  let runnersUpserted = 0;
  let quarantined = 0;
  let predictionsWithdrawn = 0;
  let error: string | null = null;

  try {
    for (const race of races) {
      const res = await upsertRace(race, providerCode);
      racesUpserted++;
      runnersUpserted += res.runnersUpserted;
      quarantined += res.quarantined;
      predictionsWithdrawn += res.predictionsWithdrawn;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const finished = await prisma.syncRun.update({
    where: { id: run.id },
    data: {
      status: error ? "FAILED" : "SUCCESS",
      finishedAt: new Date(),
      recordsRead: racesUpserted,
      error,
    },
  });

  await logAudit(actorId, "SYNC_RUN", "SyncRun", finished.id, {
    provider: providerCode,
    racesUpserted,
    quarantined,
    predictionsWithdrawn,
    error,
  });

  return {
    syncRunId: finished.id,
    status: error ? "FAILED" : "SUCCESS",
    error,
    racesUpserted,
    runnersUpserted,
    quarantined,
    predictionsWithdrawn,
  };
}
