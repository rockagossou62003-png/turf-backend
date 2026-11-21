import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTheRacingApiRaces, mapTheRacingApiRacecard } from "@/lib/providers/theracingapi";

const racecard = {
  race_id: "rac_123",
  course: "Ascot",
  date: "2026-06-20",
  off_time: "1:00",
  off_dt: "2026-06-20T13:00:00+01:00",
  race_name: "Test Stakes",
  distance_f: "8.5",
  region: "GB",
  surface: "Turf",
  race_status: "declared",
  runners: [
    { number: "1", horse: "Horse One", jockey: "Jockey One", trainer: "Trainer One" },
    { number: "NR", horse: "Non Runner", jockey: "", trainer: "Trainer Two" },
    { number: "R12", horse: "Reserve", jockey: "", trainer: "Trainer Three" },
  ],
};

describe("mapTheRacingApiRacecard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("maps declared runners and preserves non-runner state without importing reserves", () => {
    const race = mapTheRacingApiRacecard(racecard);

    expect(race).toMatchObject({
      providerRaceId: "rac_123",
      country: "GB",
      venue: "Ascot",
      startsAt: "2026-06-20T12:00:00.000Z",
      distanceMeters: 1710,
    });
    expect(race?.runners).toEqual([
      {
        number: 1,
        horseName: "Horse One",
        jockeyName: "Jockey One",
        trainerName: "Trainer One",
        isNonRunner: false,
      },
      {
        number: undefined,
        horseName: "Non Runner",
        jockeyName: undefined,
        trainerName: "Trainer Two",
        isNonRunner: true,
      },
    ]);
  });

  it("does not import abandoned races", () => {
    expect(mapTheRacingApiRacecard({ ...racecard, race_status: "abandoned" })).toBeNull();
  });

  it("maps French racecards", () => {
    expect(mapTheRacingApiRacecard({ ...racecard, course: "Longchamp", region: "FR" })).toMatchObject({
      country: "FR",
      venue: "Longchamp",
    });
  });

  it("rejects races without a timezone-aware start time", () => {
    expect(() => mapTheRacingApiRacecard({ ...racecard, off_dt: null })).toThrow(
      "n’a pas d’heure de départ avec fuseau horaire",
    );
    expect(() => mapTheRacingApiRacecard({ ...racecard, off_dt: "2026-06-20T13:00:00" })).toThrow(
      "n’a pas d’heure de départ avec fuseau horaire",
    );
  });
});

describe("fetchTheRacingApiRaces", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests only French racecards for today and tomorrow", async () => {
    vi.stubEnv("RACING_API_USERNAME", "test-user");
    vi.stubEnv("RACING_API_PASSWORD", "test-password");
    const requestedUrls: URL[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        requestedUrls.push(new URL(input.toString()));
        return new Response(JSON.stringify({ racecards: [], total: 0, limit: 500, skip: 0 }), { status: 200 });
      }),
    );

    await fetchTheRacingApiRaces();

    expect(requestedUrls.map((url) => url.searchParams.get("day"))).toEqual(["today", "tomorrow"]);
    expect(requestedUrls.every((url) => url.searchParams.getAll("region_codes").join(",") === "fr")).toBe(true);
  });
});
