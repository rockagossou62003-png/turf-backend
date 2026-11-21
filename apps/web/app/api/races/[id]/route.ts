import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canReadPrediction, projectPrediction } from "@/lib/authz";
import { getVisibleRaceProviders } from "@/lib/race-providers";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const race = await prisma.race.findFirst({
    where: { id, provider: { in: getVisibleRaceProviders() } },
    include: {
      runners: { orderBy: [{ isNonRunner: "asc" }, { number: "asc" }] },
      predictions: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } },
    },
  });
  if (!race) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const user = await getSessionUser();

  const predictions = await Promise.all(
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
  );

  return NextResponse.json({
    race: {
      id: race.id,
      name: race.name,
      country: race.country,
      venue: race.venue,
      meetingName: race.meetingName,
      startsAt: race.startsAt,
      distanceMeters: race.distanceMeters,
      surface: race.surface,
      status: race.status,
      sourceUpdatedAt: race.sourceUpdatedAt,
      runners: race.runners.map((r) => ({
        number: r.number,
        horseName: r.horseName,
        jockeyName: r.jockeyName,
        trainerName: r.trainerName,
        isNonRunner: r.isNonRunner,
      })),
      predictions,
    },
  });
}
