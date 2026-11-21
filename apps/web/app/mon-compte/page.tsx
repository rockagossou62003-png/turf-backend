import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PRODUCT_LABELS: Record<string, string> = {
  FREE: "Accès gratuit",
  COUPLE: "Couplé",
  TRIO_DISORDER: "Trio désordre",
  TRIO_ORDER: "Trio ordre",
  QUINTE_7: "Quinté 7 chevaux",
  VIP_24H: "Pass VIP 24 h",
  VIP_7D: "Pass VIP 7 jours",
};

export default async function MonComptePage() {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");

  const now = new Date();
  const [entitlements, orders] = await Promise.all([
    prisma.entitlement.findMany({
      where: { userId: user.id },
      orderBy: { startsAt: "desc" },
      include: { order: true },
    }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { product: true, payments: true },
    }),
  ]);

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <div className="eyebrow">Espace client</div>
      <h1 style={{ fontSize: 36 }}>Bonjour {user.displayName ?? user.email}</h1>

      <section className="panel">
        <h2>Mes droits d’accès</h2>
        {entitlements.length === 0 && <p className="muted">Aucun droit actif. Achetez un pronostic ou un Pass VIP.</p>}
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Course</th>
              <th>Début</th>
              <th>Fin</th>
              <th>État</th>
            </tr>
          </thead>
          <tbody>
            {entitlements.map((e) => {
              const active = !e.expiresAt || e.expiresAt > now;
              return (
                <tr key={e.id}>
                  <td>{PRODUCT_LABELS[e.product] ?? e.product}</td>
                  <td>{e.raceId ? <Link href={`/course/${e.raceId}`}>voir la course</Link> : "—"}</td>
                  <td>{new Date(e.startsAt).toLocaleString("fr-FR")}</td>
                  <td>{e.expiresAt ? new Date(e.expiresAt).toLocaleString("fr-FR") : "—"}</td>
                  <td>{active ? <span className="pill">Actif</span> : <span className="pill">Expiré</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Mes commandes</h2>
        {orders.length === 0 && <p className="muted">Aucune commande.</p>}
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Produit</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Référence</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{new Date(o.createdAt).toLocaleString("fr-FR")}</td>
                <td>{PRODUCT_LABELS[o.product.code] ?? o.product.code}</td>
                <td>
                  {o.amountXof} {o.currency}
                </td>
                <td>{o.status}</td>
                <td style={{ fontSize: 12 }}>{o.providerRef ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
