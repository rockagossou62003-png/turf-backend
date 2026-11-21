import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isStaff } from "@/lib/session";
import AdminQueue from "@/components/AdminQueue";
import AdminOps from "@/components/AdminOps";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  if (!isStaff(user.role)) {
    return (
      <main className="container" style={{ paddingTop: 40 }}>
        <h1 style={{ fontSize: 32 }}>Accès réservé</h1>
        <p className="muted">Cette section est réservée à l’équipe éditoriale.</p>
        <Link className="btn btn-secondary" href="/">
          Retour
        </Link>
      </main>
    );
  }

  const queue = await prisma.prediction.findMany({
    where: { status: { in: ["DRAFT", "AI_GENERATED", "PENDING_REVIEW", "APPROVED", "REVISION_REQUESTED"] } },
    orderBy: { createdAt: "desc" },
    include: { race: true },
  });
  const publishedCount = await prisma.prediction.count({ where: { status: "PUBLISHED" } });
  const audit = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 });

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <div className="eyebrow">Back-Office · Centre de contrôle</div>
      <h1 style={{ fontSize: 36 }}>Pilotage des pronostics</h1>
      <div className="grid">
        <section className="panel">
          <span className="muted">File de validation</span>
          <h2>{queue.length}</h2>
          <span className="pill">Validation humaine obligatoire</span>
        </section>
        <section className="panel">
          <span className="muted">Pronostics publiés</span>
          <h2>{publishedCount}</h2>
          <span className="pill">Visibles selon droits</span>
        </section>
        <section className="panel">
          <span className="muted">Publication automatique</span>
          <h2>Désactivée</h2>
          <span className="pill">Contrôle éditorial</span>
        </section>
      </div>

      <section className="panel">
        <h2>Opérations</h2>
        <AdminOps providerCode={process.env.HORSE_RACING_PROVIDER ?? "demo"} />
      </section>

      <section className="panel">
        <h2>File de validation</h2>
        <AdminQueue
          queue={queue.map((p) => ({ id: p.id, title: p.title, status: p.status, race: { name: p.race.name } }))}
        />
      </section>

      <section className="panel">
        <h2>Journal d’audit (15 dernières actions)</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Entité</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleString("fr-FR")}</td>
                <td>{a.action}</td>
                <td>
                  {a.entityType} {a.entityId ? `· ${a.entityId.slice(0, 10)}…` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
