import { describe, expect, it } from "vitest";
import { createManualRaceId, manualRaceSchema } from "@/lib/manual-race";

const validRace = {
  raceDate: "2026-11-21",
  meetingName: "Réunion 1",
  venue: "Vincennes",
  raceNumber: "R1C1",
  name: "Prix de la Course",
  startsAt: "2026-11-21T18:00:00.000Z",
  source: "Flux autorisé",
  rightsConfirmed: true,
  runners: [{ number: 1, horseName: "Cheval Un" }],
};

describe("manual race input", () => {
  it("accepts a race with a declared source and defaults runners to active", () => {
    const parsed = manualRaceSchema.parse(validRace);
    expect(parsed.runners[0].isNonRunner).toBe(false);
  });

  it("rejects unconfirmed reuse rights and duplicate runner numbers", () => {
    expect(manualRaceSchema.safeParse({ ...validRace, rightsConfirmed: false }).success).toBe(false);
    expect(
      manualRaceSchema.safeParse({
        ...validRace,
        runners: [
          { number: 1, horseName: "Cheval Un" },
          { number: 1, horseName: "Cheval Deux" },
        ],
      }).success,
    ).toBe(false);
  });

  it("creates a stable key for editing the same meeting race", () => {
    expect(createManualRaceId(validRace)).toBe("manual-2026-11-21-vincennes-r1c1");
    expect(createManualRaceId({ ...validRace, raceNumber: "R1C2" })).not.toBe(createManualRaceId(validRace));
  });
});
