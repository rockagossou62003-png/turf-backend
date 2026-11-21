import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canReadPrediction, projectPrediction } from "@/lib/authz";
import { getVisibleRaceProviders } from "@/lib/race-providers";

/** Liste des courses à venir (publique). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country");
  const includeFinished = url.searchParams.get("all") === "1";

  const user = await getSessionUser();

  const races = await prisma.race.findMany({
    where: {
      provider: { in: getVisibleRaceProviders() },
      ...(country ? { country } : {}),
      ...(includeFinished ? {} : { status: { in: ["SCHEDULED", "VERIFIED", "LIVE"] } }),
    },
    orderBy: { startsAt: "asc" },
    include: {
      runners: { orderBy: { number: "asc" } },
      predictions: { where: { status: "PUBLISHED" } },
    },
  });

  const shaped = await Promise.all(
    races.map(async (race) => ({
      id: race.id,
      name: race.name,
      country: race.country,
      venue: race.venue,
      meetingName: race.meetingName,
      startsAt: race.startsAt,
      distanceMeters: race.distanceMeters,
      surface: race.surface,
      status: race.status,
      runnerCount: race.runners.length,
      nonRunners: race.runners.filter((r) => r.isNonRunner).length,
      predictions: await Promise.all(
        race.predictions.map(async (p) => {
          const check = await canReadPrediction(user, race.id, p.selections);
          return projectPrediction(
            {
              id: p.id,
              raceId: p.raceId,
              title: p.title,
              status: p.status,
              publishedAt: p.publishedAt,
              selections: p.selections,
              analysis: p.analysis,
            },
            check,
          );
        }),
      ),
    })),
  );

  return NextResponse.json({ races: shaped });
}
