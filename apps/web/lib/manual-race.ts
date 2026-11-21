import { z } from "zod";

const runnerSchema = z.object({
  number: z.number().int().positive().max(99).optional(),
  horseName: z.string().trim().min(1).max(120),
  jockeyName: z.string().trim().max(120).optional(),
  trainerName: z.string().trim().max(120).optional(),
  isNonRunner: z.boolean().default(false),
});

export const manualRaceSchema = z
  .object({
    raceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
      }),
    meetingName: z.string().trim().min(1).max(100),
    venue: z.string().trim().min(1).max(100),
    raceNumber: z.string().trim().min(1).max(20).regex(/^[a-zA-Z0-9._-]+$/),
    name: z.string().trim().min(1).max(160),
    startsAt: z.string().datetime(),
    distanceMeters: z.number().int().positive().max(10000).optional(),
    surface: z.string().trim().max(60).optional(),
    source: z.string().trim().min(2).max(200),
    rightsConfirmed: z.literal(true),
    runners: z.array(runnerSchema).min(1).max(40),
  })
  .superRefine((race, context) => {
    const numbers = new Set<number>();
    const names = new Set<string>();

    race.runners.forEach((runner, index) => {
      if (runner.number !== undefined) {
        if (numbers.has(runner.number)) {
          context.addIssue({
            code: "custom",
            path: ["runners", index, "number"],
            message: "Chaque numéro de partant doit être unique.",
          });
        }
        numbers.add(runner.number);
      }

      const normalizedName = runner.horseName.toLocaleLowerCase("fr-FR");
      if (names.has(normalizedName)) {
        context.addIssue({
          code: "custom",
          path: ["runners", index, "horseName"],
          message: "Un même cheval ne peut apparaître qu’une fois.",
        });
      }
      names.add(normalizedName);
    });
  });

export type ManualRaceInput = z.infer<typeof manualRaceSchema>;

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createManualRaceId(race: Pick<ManualRaceInput, "raceDate" | "venue" | "raceNumber">) {
  return `manual-${race.raceDate}-${slug(race.venue)}-${slug(race.raceNumber)}`;
}
