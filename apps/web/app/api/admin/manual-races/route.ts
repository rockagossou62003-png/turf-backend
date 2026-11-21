import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/lib/session";
import { logAudit } from "@/lib/authz";
import { createManualRaceId, manualRaceSchema } from "@/lib/manual-race";
import { runSync, type IncomingRace } from "@/lib/sync";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON_INVALIDE", detail: "Le formulaire envoyé n’est pas valide." },
      { status: 400 },
    );
  }

  const parsed = manualRaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "DONNEES_COURSE_INVALIDES", detail: parsed.error.issues[0]?.message ?? "Vérifie les champs." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const race: IncomingRace = {
    providerRaceId: createManualRaceId(input),
    country: "FR",
    venue: input.venue,
    meetingName: input.meetingName,
    name: input.name,
    startsAt: input.startsAt,
    distanceMeters: input.distanceMeters,
    surface: input.surface || undefined,
    runners: input.runners.map((runner) => ({
      number: runner.number,
      horseName: runner.horseName,
      jockeyName: runner.jockeyName || undefined,
      trainerName: runner.trainerName || undefined,
      isNonRunner: runner.isNonRunner,
    })),
  };

  const result = await runSync("manual", [race], user.id);
  await logAudit(user.id, "MANUAL_RACE_SOURCE", "SyncRun", result.syncRunId, {
    providerRaceId: race.providerRaceId,
    source: input.source,
    rightsConfirmed: input.rightsConfirmed,
  });

  return NextResponse.json(
    { ok: result.status === "SUCCESS", ...result, providerRaceId: race.providerRaceId },
    { status: result.status === "SUCCESS" ? 200 : 502 },
  );
}
