import { describe, expect, it } from "vitest";
import { mapTheRacingApiRacecard } from "@/lib/providers/theracingapi";

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

  it("rejects races without a timezone-aware start time", () => {
    expect(() => mapTheRacingApiRacecard({ ...racecard, off_dt: null })).toThrow(
      "n’a pas d’heure de départ avec fuseau horaire",
    );
    expect(() => mapTheRacingApiRacecard({ ...racecard, off_dt: "2026-06-20T13:00:00" })).toThrow(
      "n’a pas d’heure de départ avec fuseau horaire",
    );
  });
});
