import { describe, it, expect } from "vitest";
import { generateAnalysisForRace, ANALYSIS_MODEL_NAME } from "@/lib/analysis";
import { prisma } from "@/lib/prisma";

/**
 * Tests du moteur d'analyse sur une course de démonstration créée en base.
 * Nécessite DATABASE_URL (PostgreSQL local) : `npm run db:push` avant.
 */
describe("generateAnalysisForRace", () => {
  let raceId: string | null = null;

  it("génère une base gratuite + couplé payant, jamais publiée", async () => {
    const race = await prisma.race.create({
      data: {
        provider: "test",
        providerRaceId: `TEST-${Date.now()}`,
        country: "DEMO",
        venue: "Hippodrome de test",
        name: "Course de test",
        startsAt: new Date(Date.now() + 24 * 3600 * 1000),
        status: "VERIFIED",
        runners: {
          create: [
            { number: 1, horseName: "Alpha" },
            { number: 2, horseName: "Beta" },
            { number: 3, horseName: "Gamma" },
            { number: 4, horseName: "Delta" },
            { number: 5, horseName: "Epsilon", isNonRunner: true },
          ],
        },
      },
    });
    raceId = race.id;

    const gen = await generateAnalysisForRace(race.id);
    expect(gen).not.toBeNull();
    expect(gen!.selections.filter((s) => s.kind === "free_base")).toHaveLength(2);
    expect(gen!.selections.filter((s) => s.kind === "couple")).toHaveLength(2);
    // Le non-partant ne doit jamais apparaître dans la sélection.
    expect(gen!.selections.map((s) => s.horseName)).not.toContain("Epsilon");
    expect(gen!.evidence.runnerCount).toBe(4);
    expect(gen!.evidence.nonRunnerCount).toBe(1);
  });

  it("refuse une course en quarantaine ou annulée", async () => {
    if (!raceId) return;
    await prisma.race.update({ where: { id: raceId }, data: { status: "DATA_QUARANTINED" } });
    expect(await generateAnalysisForRace(raceId)).toBeNull();
  });

  it("refuse une course avec trop peu de partants", async () => {
    const race = await prisma.race.create({
      data: {
        provider: "test",
        providerRaceId: `TEST-SMALL-${Date.now()}`,
        country: "DEMO",
        venue: "Hippodrome de test",
        name: "Course trop petite",
        startsAt: new Date(Date.now() + 24 * 3600 * 1000),
        status: "VERIFIED",
        runners: {
          create: [
            { number: 1, horseName: "Alpha" },
            { number: 2, horseName: "Beta" },
          ],
        },
      },
    });
    expect(await generateAnalysisForRace(race.id)).toBeNull();
  });

  it("utilise le nom de modèle attendu (traçabilité)", () => {
    expect(ANALYSIS_MODEL_NAME).toBe("turf-rules-engine");
  });
});
