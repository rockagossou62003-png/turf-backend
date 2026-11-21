import { prisma } from "./prisma";
import type { SessionUser } from "./session";
import type { ProductType } from "@prisma/client";

export type EntitlementCheck =
  | { allowed: true; source: "purchase" | "vip" | "free" }
  | { allowed: false; reason: string; requiredProduct?: ProductType };

/** VIP products grant global, time-limited access. */
export const VIP_PRODUCTS: ProductType[] = ["VIP_24H", "VIP_7D"];

/** Mapping from a purchasable product to the prediction "content kind" it unlocks. */
export const PRODUCT_UNLOCKS: Record<string, string> = {
  COUPLE: "couple",
  TRIO_DISORDER: "trio_disorder",
  TRIO_ORDER: "trio_order",
  QUINTE_7: "quinte_7",
};

export function productUnlocksKind(code: string): string | null {
  return PRODUCT_UNLOCKS[code] ?? null;
}

/** Does this prediction carry content kind(s) that the given product unlocks? */
export function predictionKinds(selections: unknown): string[] {
  if (!Array.isArray(selections)) return [];
  return selections
    .map((s) => (typeof s === "object" && s !== null ? String((s as { kind?: string }).kind ?? "") : ""))
    .filter(Boolean);
}

/**
 * Server-side authorization: decides whether `user` may read a paid prediction.
 * Never called on data already sent to the browser — the paid payload must be
 * withheld from any response until this returns allowed.
 */
export async function canReadPrediction(
  user: SessionUser | null,
  raceId: string,
  predictionSelections: unknown,
): Promise<EntitlementCheck> {
  if (!user) {
    return { allowed: false, reason: "AUTH_REQUIRED" };
  }

  const kinds = predictionKinds(predictionSelections);
  const needsProduct = kinds.length > 0;

  // Staff can always read.
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "EDITOR") {
    return { allowed: true, source: "purchase" };
  }

  const now = new Date();

  // Active VIP entitlement unlocks everything within its validity window.
  const vip = await prisma.entitlement.findFirst({
    where: {
      userId: user.id,
      product: { in: VIP_PRODUCTS },
      expiresAt: { gt: now },
    },
    orderBy: { expiresAt: "desc" },
  });
  if (vip) return { allowed: true, source: "vip" };

  if (!needsProduct) {
    // Prediction without paid kinds behaves like free content.
    return { allowed: true, source: "free" };
  }

  // Look for a matching à-la-carte purchase for this race.
  const purchasableKinds = Object.entries(PRODUCT_UNLOCKS)
    .filter(([product]) => kinds.includes(PRODUCT_UNLOCKS[product]))
    .map(([product, kind]) => ({ product: product as ProductType, kind }));

  if (purchasableKinds.length > 0) {
    const covered = await Promise.all(
      purchasableKinds.map(async ({ product, kind }) => {
        const owned = await prisma.entitlement.findFirst({
          where: { userId: user.id, raceId, product },
        });
        return owned ? kind : null;
      }),
    );
    if (kinds.every((kind) => covered.includes(kind))) {
      return { allowed: true, source: "purchase" };
    }
  }

  const purchasable = purchasableKinds[0]?.product;
  return {
    allowed: false,
    reason: "ENTITLEMENT_REQUIRED",
    requiredProduct: purchasable,
  };
}

/** Public projection of a prediction: paid fields stripped unless authorized. */
export function projectPrediction(
  prediction: {
    id: string;
    raceId: string;
    title: string;
    status: string;
    publishedAt: Date | null;
    selections: unknown;
    analysis: string;
  },
  check: EntitlementCheck,
) {
  if (check.allowed) {
    return {
      id: prediction.id,
      raceId: prediction.raceId,
      title: prediction.title,
      status: prediction.status,
      publishedAt: prediction.publishedAt,
      locked: false,
      analysis: prediction.analysis,
      selections: prediction.selections,
    };
  }
  // Locked: no paid payload leaves the server.
  return {
    id: prediction.id,
    raceId: prediction.raceId,
    title: prediction.title,
    status: prediction.status,
    publishedAt: prediction.publishedAt,
    locked: true,
    lockReason: check.reason,
    requiredProduct: check.requiredProduct ?? null,
  };
}

export async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: unknown,
) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      entityType,
      entityId: entityId ?? undefined,
      details: details === undefined ? undefined : (details as object),
    },
  });
}
