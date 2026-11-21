import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canReadPrediction, projectPrediction } from "@/lib/authz";
import { getVisibleRaceProviders } from "@/lib/race-providers";

export const dynamic = "force-dynamic";

export default async function ProgrammePage() {
  const user = await getSessionUser();

  const races = await prisma.race.findMany({
    where: {
      provider: { in: getVisibleRaceProviders() },
      status: { in: ["SCHEDULED", "VERIFIED", "LIVE", "FINISHED", "RESULT_CONFIRMED"] },
    },
    orderBy: { startsAt: "asc" },
    include: {
      predictions: { where: { status: "PUBLISHED" } },
    },
  });

  const shaped = await Promise.all(
    races.map(async (race) => ({
      race,
      predictions: await Promise.all(
        race.predictions.map(async (p) => {
          const check = await canReadPrediction(user, race.id, p.selections);
          return projectPrediction(
            { id: p.id, raceId: p.raceId, title: p.title, status: p.status, publishedAt: p.publishedAt, selections: p.selections, analysis: p.analysis },
            check,
          );
        }),
      ),
    })),
  );

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <div className="eyebrow">Programme</div>
      <h1 style={{ fontSize: 38 }}>Réunions et courses</h1>
      <p className="muted">
        Les courses peuvent être synchronisées depuis le fournisseur configuré ou saisies manuellement par l’équipe.
        En mode démonstration, la course marquée « démo » est fictive et sert à valider les règles d’accès.
      </p>
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        {shaped.length === 0 && <p className="muted">Aucune course programmée.</p>}
        {shaped.map(({ race, predictions }) => (
          <article className="panel" key={race.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  <Link href={`/course/${race.id}`}>{race.name}</Link>
                </h3>
                <span className="muted" style={{ fontSize: 13 }}>
                  {race.venue} · {race.country} · {new Date(race.startsAt).toLocaleString("fr-FR")}
                  {race.distanceMeters ? ` · ${race.distanceMeters} m` : ""}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                {race.provider === "manual" && <span className="pill">Saisie manuelle</span>}
                <span className="pill">{race.status}</span>
              </div>
            </div>
            {predictions.length > 0 && (
              <ul style={{ margin: "14px 0 0", paddingLeft: 18 }}>
                {predictions.map((p) => (
                  <li key={p.id} style={{ marginBottom: 6 }}>
                    {p.locked ? (
                      <>
                        <span className="pill">Contenu protégé</span> {p.title} —{" "}
                        <Link className="muted" href={`/course/${race.id}`}>
                          débloquer
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="pill">Publié</span> {p.title} — {p.analysis?.slice(0, 110)}…
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
