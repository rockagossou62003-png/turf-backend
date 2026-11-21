import { z } from "zod";
import type { IncomingRace } from "@/lib/sync";

const runnerSchema = z.object({
  number: z.string(),
  horse: z.string().min(1),
  jockey: z.string().nullable().optional(),
  trainer: z.string().nullable().optional(),
});

const racecardSchema = z.object({
  race_id: z.string().min(1),
  course: z.string().min(1),
  date: z.string().min(1),
  off_time: z.string().min(1),
  off_dt: z.string().nullable().optional(),
  race_name: z.string().min(1),
  distance_f: z.string().min(1),
  region: z.enum(["GB", "IRE"]),
  surface: z.string().nullable().optional(),
  race_status: z.string().nullable().optional(),
  runners: z.array(runnerSchema),
});

const racecardsPageSchema = z.object({
  racecards: z.array(racecardSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  skip: z.number().int().nonnegative(),
});

type Racecard = z.infer<typeof racecardSchema>;
type RacecardsDay = "today" | "tomorrow";

const API_URL = "https://api.theracingapi.com/v1/racecards/basic";
const PAGE_SIZE = 500;
const RATE_LIMIT_DELAY_MS = 600;

function getAuthorizationHeader() {
  const username = process.env.RACING_API_USERNAME;
  const password = process.env.RACING_API_PASSWORD;
  if (!username || !password) {
    throw new Error("RACING_API_USERNAME et RACING_API_PASSWORD sont requis pour The Racing API.");
  }
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchRacecardsForDay(day: RacecardsDay, authorization: string): Promise<Racecard[]> {
  const racecards: Racecard[] = [];
  let skip = 0;
  let total = 0;

  do {
    const url = new URL(API_URL);
    url.searchParams.set("day", day);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("skip", String(skip));
    url.searchParams.append("region_codes", "gb");
    url.searchParams.append("region_codes", "ire");

    const response = await fetch(url, {
      headers: { Authorization: authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`The Racing API a répondu avec le statut HTTP ${response.status}.`);
    }

    const page = racecardsPageSchema.parse(await response.json());
    if (page.racecards.length === 0 && skip < page.total) {
      throw new Error(`The Racing API a renvoyé une page vide avant la fin du programme (${day}).`);
    }

    racecards.push(...page.racecards);
    total = page.total;
    skip += page.racecards.length;
    if (skip < total) await delay(RATE_LIMIT_DELAY_MS);
  } while (skip < total);

  return racecards;
}

export function mapTheRacingApiRacecard(input: unknown): IncomingRace | null {
  const race = racecardSchema.parse(input);
  const raceStatus = race.race_status?.toLowerCase();
  if (raceStatus === "abandoned" || raceStatus === "void") return null;

  if (!race.off_dt || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(race.off_dt)) {
    throw new Error(`La course ${race.race_id} n’a pas d’heure de départ avec fuseau horaire.`);
  }
  const startsAt = new Date(race.off_dt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error(`La course ${race.race_id} a une heure de départ invalide.`);
  }

  const distanceFurlongs = Number(race.distance_f);
  if (!Number.isFinite(distanceFurlongs) || distanceFurlongs <= 0) {
    throw new Error(`La course ${race.race_id} a une distance invalide.`);
  }

  const runners = race.runners
    .filter((runner) => !/^R/i.test(runner.number))
    .map((runner) => {
      const number = /^\d+$/.test(runner.number) ? Number(runner.number) : undefined;
      return {
        number,
        horseName: runner.horse,
        jockeyName: runner.jockey || undefined,
        trainerName: runner.trainer || undefined,
        isNonRunner: runner.number.toUpperCase() === "NR",
      };
    });

  return {
    providerRaceId: race.race_id,
    country: race.region,
    venue: race.course,
    name: race.race_name,
    startsAt: startsAt.toISOString(),
    distanceMeters: Math.round(distanceFurlongs * 201.168),
    surface: race.surface || undefined,
    runners,
  };
}

export async function fetchTheRacingApiRaces(): Promise<IncomingRace[]> {
  const authorization = getAuthorizationHeader();
  const today = await fetchRacecardsForDay("today", authorization);
  await delay(RATE_LIMIT_DELAY_MS);
  const tomorrow = await fetchRacecardsForDay("tomorrow", authorization);

  return [...today, ...tomorrow]
    .map(mapTheRacingApiRacecard)
    .filter((race): race is IncomingRace => race !== null);
}
