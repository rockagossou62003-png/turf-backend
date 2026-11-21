import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isStaff } from "@/lib/session";
import { logAudit } from "@/lib/authz";

/** File de validation + pronostics publiés (staff uniquement). */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const [queue, published] = await Promise.all([
    prisma.prediction.findMany({
      where: { status: { in: ["DRAFT", "AI_GENERATED", "PENDING_REVIEW", "APPROVED", "REVISION_REQUESTED"] } },
      orderBy: { createdAt: "desc" },
      include: { race: true },
    }),
    prisma.prediction.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 50,
      include: { race: true },
    }),
  ]);

  return NextResponse.json({
    queue: queue.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      race: { id: p.race.id, name: p.race.name, startsAt: p.race.startsAt },
      modelName: p.modelName,
      createdAt: p.createdAt,
    })),
    published: published.map((p) => ({
      id: p.id,
      title: p.title,
      publishedAt: p.publishedAt,
      race: { id: p.race.id, name: p.race.name },
    })),
  });
}

/** Actions de validation : approuver, rejeter, publier (staff uniquement). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const predictionId = typeof body?.predictionId === "string" ? body.predictionId : "";
  const action = typeof body?.action === "string" ? body.action : "";
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

  const prediction = await prisma.prediction.findUnique({ where: { id: predictionId } });
  if (!prediction) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const transitions: Record<string, { status: "APPROVED" | "REJECTED" | "REVISION_REQUESTED" | "PUBLISHED" | "SCHEDULED"; requiresApproval: boolean; review: string }> = {
    APPROVE: { status: "APPROVED", requiresApproval: true, review: "APPROVED" },
    REJECT: { status: "REJECTED", requiresApproval: true, review: "REJECTED" },
    REVISE: { status: "REVISION_REQUESTED", requiresApproval: true, review: "REVISION_REQUESTED" },
    PUBLISH: { status: "PUBLISHED", requiresApproval: false, review: "APPROVED" },
    SCHEDULE: { status: "SCHEDULED", requiresApproval: false, review: "APPROVED" },
  };
  const t = transitions[action];
  if (!t) return NextResponse.json({ error: "ACTION_INCONNUE" }, { status: 400 });

  if (t.requiresApproval && prediction.status === "PUBLISHED") {
    return NextResponse.json({ error: "DEJA_PUBLIE" }, { status: 409 });
  }
  if ((action === "PUBLISH" || action === "SCHEDULE") && prediction.status !== "APPROVED") {
    return NextResponse.json({ error: "VALIDATION_REQUISE" }, { status: 409 });
  }

  // Publication programmée : heure cible obligatoire, dans le futur, avant le départ.
  let scheduledFor: Date | null = null;
  if (action === "SCHEDULE") {
    const raw = typeof body?.scheduledFor === "string" ? body.scheduledFor : "";
    const d = raw ? new Date(raw) : null;
    if (!d || Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
      return NextResponse.json({ error: "HEURE_PUBLICATION_INVALIDE" }, { status: 400 });
    }
    scheduledFor = d;
  }

  const updated = await prisma.prediction.update({
    where: { id: prediction.id },
    data: {
      status: t.status,
      approvedAt: t.requiresApproval ? new Date() : prediction.approvedAt,
      publishedAt: action === "PUBLISH" ? new Date() : prediction.publishedAt,
      ...(scheduledFor ? { inputSnapshot: { ...(prediction.inputSnapshot as object ?? {}), scheduledFor: scheduledFor.toISOString() } } : {}),
    },
  });

  await prisma.predictionReview.create({
    data: { predictionId: prediction.id, userId: user.id, decision: t.review, comment: comment || null },
  });

  await logAudit(user.id, `PREDICTION_${action}`, "Prediction", prediction.id, { from: prediction.status, to: t.status, comment });

  return NextResponse.json({ ok: true, status: updated.status });
}
