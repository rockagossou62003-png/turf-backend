import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const now = new Date();
  const entitlements = await prisma.entitlement.findMany({
    where: { userId: user.id, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { startsAt: "desc" },
  });

  return NextResponse.json({
    user,
    entitlements: entitlements.map((e) => ({
      id: e.id,
      product: e.product,
      raceId: e.raceId,
      startsAt: e.startsAt,
      expiresAt: e.expiresAt,
    })),
  });
}
