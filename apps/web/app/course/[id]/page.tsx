import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canReadPrediction, projectPrediction } from "@/lib/authz";
import BuyButton from "@/components/BuyButton";
import type { ProductType } from "@prisma/client";

export const dynamic = "force-dynamic";

const PRODUCT_LABELS: Record<string, string> = {
  COUPLE: "Couplé",
  TRIO_DISORDER: "Trio désordre",
  TRIO_ORDER: "Trio ordre",
  QUINTE_7: "Quinté 7 chevaux",
};

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const race = await prisma.race.findUnique({
    where: { id },
    include: {
      runners: { orderBy: [{ isNonRunner: "asc" }, { number: "asc" }] },
      predictions: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } },
    },
  });
  if (!race) notFound();

  const user = await getSessionUser();
  const products = await prisma.product.findMany({ where: { active: true } });
  const productByCode = new Map<string, (typeof products)[number]>(products.map((p) => [p.code as string, p]));

  const predictions = await Promise.all(
    race.predictions.map(async (p) => {
      const check = await canReadPrediction(user, race.id, p.selections);
      return { projected: projectPrediction({ id: p.id, raceId: p.raceId, title: p.title, status: p.status, publishedAt: p.publishedAt, selections: p.selections, analysis: p.analysis }, check), requiredProduct: check.allowed ? null : check.requiredProduct };
    }),
  );

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <p>
        <Link className="muted" href="/programme">
          ← Programme
        </Link>
      </p>
      <div className="eyebrow">
        {race.venue} · {race.country}
      </div>
      <h1 style={{ fontSize: 36 }}>{race.name}</h1>
      <p className="muted">
        {new Date(race.startsAt).toLocaleString("fr-FR")}
        {race.distanceMeters ? ` · ${race.distanceMeters} m` : ""} {race.surface ? `· ${race.surface}` : ""} · statut :{" "}
        {race.status}
      </p>

      <section className="panel">
        <h2>Partants</h2>
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Cheval</th>
              <th>Jockey</th>
              <th>Entraîneur</th>
            </tr>
          </thead>
          <tbody>
            {race.runners.map((r) => (
              <tr key={r.id} style={r.isNonRunner ? { opacity: 0.45 } : undefined}>
                <td>{r.number}</td>
                <td>
                  {r.horseName} {r.isNonRunner && <span className="pill">non-partant</span>}
                </td>
                <td>{r.jockeyName ?? "—"}</td>
                <td>{r.trainerName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Pronostics</h2>
        {predictions.length === 0 && <p className="muted">Aucun pronostic publié pour cette course.</p>}
        {predictions.map(({ projected, requiredProduct }) => (
          <article key={projected.id} style={{ borderTop: "1px solid #2a384d", paddingTop: 14, marginTop: 14 }}>
            <h3>{projected.title}</h3>
            {projected.locked ? (
              <div>
                <p className="muted">
                  Ce contenu est protégé. Il n’a jamais été envoyé à votre navigateur : le déblocage se fait
                  côté serveur après achat (ou Pass VIP actif).
                </p>
                {requiredProduct && productByCode.get(requiredProduct) && (
                  <BuyButton
                    productCode={requiredProduct as ProductType}
                    raceId={race.id}
                    label={PRODUCT_LABELS[requiredProduct] ?? requiredProduct}
                    priceXof={productByCode.get(requiredProduct)!.priceXof}
                  />
                )}
              </div>
            ) : (
              <div>
                <p>{projected.analysis}</p>
                <ul style={{ paddingLeft: 18 }}>
                  {(projected.selections as { number?: number; horseName?: string }[] | null)?.map((s, i) => (
                    <li key={i}>
                      {s.number ? `${s.number}. ` : ""}
                      {s.horseName}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
        {!user && (
          <p className="muted" style={{ marginTop: 14 }}>
            <Link href="/connexion">Connectez-vous</Link> pour acheter un pronostic ou activer un Pass VIP.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Pass VIP</h2>
        <p className="muted">Le Pass VIP ouvre tous les contenus VIP pendant sa durée de validité.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["VIP_24H", "VIP_7D"].map((code) => {
            const p = productByCode.get(code);
            if (!p) return null;
            return (
              <BuyButton key={code} productCode={code as ProductType} raceId={null} label={p.label} priceXof={p.priceXof} />
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
          Paiement simulé : aucune transaction réelle n’est effectuée. En production, un prestataire (ex. FedaPay)
          confirmera via le même webhook signé.
        </p>
      </section>
    </main>
  );
}
