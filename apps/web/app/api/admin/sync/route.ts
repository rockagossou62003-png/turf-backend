import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isStaff } from "@/lib/session";
import { logAudit } from "@/lib/authz";
import { runSync, type IncomingRace } from "@/lib/sync";
import { fetchTheRacingApiRaces } from "@/lib/providers/theracingapi";

/**
 * Synchronisation hippique (staff uniquement, jamais public).
 *
 * - POST { races?: IncomingRace[] } : synchronise le fournisseur configuré.
 *   Sans `races` et si le fournisseur configuré est `demo`, importe un jeu de
 *   démonstration clairement marqué (aucune donnée réelle inventée).
 * - GET : historique des exécutions de synchronisation.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const runs = await prisma.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { provider: true },
  });
  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      provider: r.provider.code,
      status: r.status,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      recordsRead: r.recordsRead,
      error: r.error,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const races = Array.isArray(body?.races) ? (body.races as IncomingRace[]) : null;

  const providerCode = typeof body?.provider === "string" ? body.provider : process.env.HORSE_RACING_PROVIDER ?? "demo";

  if (providerCode !== "demo" && providerCode !== "theracingapi") {
    return NextResponse.json({ error: "FOURNISSEUR_INCONNU" }, { status: 400 });
  }

  // Les données réelles ne sont utilisées qu'après autorisation écrite du fournisseur.
  if (providerCode === "theracingapi" && process.env.THERACINGAPI_CONTRACT_ACCEPTED !== "1") {
    await logAudit(user.id, "SYNC_BLOCKED_NO_CONTRACT", "Provider", null, { provider: providerCode });
    return NextResponse.json(
      { error: "CONTRAT_FOURNISSEUR_REQUIS", detail: "Définissez THERACINGAPI_CONTRACT_ACCEPTED=1 uniquement après avoir obtenu l'autorisation écrite de The Racing API pour cet usage." },
      { status: 409 },
    );
  }

  // Jeu de démonstration (fournisseur demo) : courses fictives, clairement marquées.
  const demoRaces: IncomingRace[] = [
    {
      providerRaceId: `DEMO-${new Date().toISOString().slice(0, 10)}-R1C2`,
      country: "DEMO",
      venue: "Hippodrome de démonstration",
      meetingName: "Réunion démo",
      name: "Course de démonstration #2",
      startsAt: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
      distanceMeters: 2100,
      surface: "herbe",
      runners: [
        { number: 1, horseName: "Brume du Matin", jockeyName: "Jockey A", trainerName: "Entraîneur A" },
        { number: 2, horseName: "Sillage d'Écume", jockeyName: "Jockey B", trainerName: "Entraîneur B" },
        { number: 3, horseName: "Cœur Vaillant", jockeyName: "Jockey C", trainerName: "Entraîneur C" },
        { number: 4, horseName: "Ombre Claire", jockeyName: "Jockey D", trainerName: "Entraîneur D", isNonRunner: true },
        { number: 5, horseName: "Rythme Bleu", jockeyName: "Jockey E", trainerName: "Entraîneur E" },
        { number: 6, horseName: "Piste Neuve", jockeyName: "Jockey F", trainerName: "Entraîneur F" },
      ],
    },
  ];

  let racesToSync = races;
  if (providerCode === "theracingapi" && (!racesToSync || racesToSync.length === 0)) {
    try {
      racesToSync = await fetchTheRacingApiRaces();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erreur inconnue du fournisseur.";
      await logAudit(user.id, "SYNC_PROVIDER_FETCH_FAILED", "Provider", null, {
        provider: providerCode,
        detail,
      });
      return NextResponse.json(
        { error: "FOURNISSEUR_INDISPONIBLE", detail },
        { status: 502 },
      );
    }
  }

  const result = await runSync(providerCode, racesToSync ?? demoRaces, user.id);
  const ok = result.status === "SUCCESS";
  return NextResponse.json({ ok, ...result }, { status: ok ? 200 : 502 });
}
