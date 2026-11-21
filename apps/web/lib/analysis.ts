import { prisma } from "@/lib/prisma";

/**
 * Moteur d'analyse — prévisualisation déterministe.
 *
 * Règles produit (docs/regles-metier.md) :
 * - Le moteur ne publie JAMAIS : toute sortie passe par le statut
 *   AI_GENERATED puis PENDING_REVIEW, validation humaine obligatoire.
 * - Le moteur ne copie jamais les données d'un fournisseur vers le client :
 *   il produit une analyse éditoriale à partir des partants vérifiés.
 * - Traçabilité complète : modèle, version, empreinte des entrées.
 */

export const ANALYSIS_MODEL_NAME = "turf-rules-engine";
export const ANALYSIS_MODEL_VERSION = "0.2";

export type GeneratedSelection = {
  number: number | null;
  horseName: string;
  kind: "free_base" | "couple";
  rationale: string;
};

export type GeneratedAnalysis = {
  title: string;
  analysis: string;
  selections: GeneratedSelection[];
  evidence: { basis: string; runnerCount: number; nonRunnerCount: number; generatedFrom: string };
};

/** Génère une analyse déterministe à partir des partants VÉRIFIÉS d'une course. */
export async function generateAnalysisForRace(raceId: string): Promise<GeneratedAnalysis | null> {
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    include: { runners: { orderBy: [{ isNonRunner: "asc" }, { number: "asc" }] } },
  });
  if (!race) return null;

  // Aucune analyse sur des données non contrôlées ou une course passée.
  if (race.status !== "VERIFIED" && race.status !== "SCHEDULED") return null;

  const declared = race.runners.filter((r) => !r.isNonRunner);
  if (declared.length < 4) return null; // insuffisant pour une base exploitable

  // Base gratuite : les 2 premiers numéros déclarés (règle produit "2 chevaux gratuits").
  const base = declared.slice(0, 2);
  // Couplé payant : le champ constitué des deux suivants.
  const paid = declared.slice(2, 4);

  const selections: GeneratedSelection[] = [
    ...base.map((r) => ({
      number: r.number ?? null,
      horseName: r.horseName,
      kind: "free_base" as const,
      rationale: "Base gratuite (2 premiers partants déclarés).",
    })),
    ...paid.map((r) => ({
      number: r.number ?? null,
      horseName: r.horseName,
      kind: "couple" as const,
      rationale: "Contenu payant : couplé à valider par l'équipe éditoriale.",
    })),
  ];

  const title = `Analyse — ${race.name}`;
  const analysis =
    `Sélection établie à partir des ${declared.length} partants déclarés de ${race.venue} ` +
    `(${race.country}), hors non-partants. Base gratuite : ${base.map((r) => r.horseName).join(" / ")}. ` +
    `Le couplé proposé (${paid.map((r) => r.horseName).join(" / ")}) est un contenu payant soumis ` +
    `à validation humaine avant publication. Cette analyse est un contenu éditorial : elle ne ` +
    `constitue ni une promesse de gains ni une invitation à parier.`;

  return {
    title,
    analysis,
    selections,
    evidence: {
      basis: `partants déclarés au ${new Date().toISOString()}`,
      runnerCount: declared.length,
      nonRunnerCount: race.runners.length - declared.length,
      generatedFrom: race.rawPayloadHash ?? "sans-empreinte",
    },
  };
}

/** Génère (si besoin) un pronostic AI_GENERATED pour une course éligible. Idempotent. */
export async function createAiPredictionForRace(raceId: string) {
  const already = await prisma.prediction.findFirst({
    where: {
      raceId,
      status: { in: ["AI_GENERATED", "PENDING_REVIEW", "APPROVED", "PUBLISHED"] },
      modelName: ANALYSIS_MODEL_NAME,
    },
  });
  if (already) return { created: false, prediction: already };

  const generated = await generateAnalysisForRace(raceId);
  if (!generated) return { created: false, prediction: null };

  const prediction = await prisma.prediction.create({
    data: {
      raceId,
      status: "AI_GENERATED",
      title: generated.title,
      analysis: generated.analysis,
      selections: generated.selections,
      evidence: generated.evidence,
      modelName: ANALYSIS_MODEL_NAME,
      modelVersion: ANALYSIS_MODEL_VERSION,
      inputSnapshot: generated.evidence,
      generatedAt: new Date(),
    },
  });
  return { created: true, prediction };
}
