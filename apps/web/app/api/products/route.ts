import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Offres actives (publique). */
export async function GET() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { priceXof: "asc" },
  });
  return NextResponse.json({
    products: products.map((p) => ({
      code: p.code,
      label: p.label,
      priceXof: p.priceXof,
      isVipPass: p.code === "VIP_24H" || p.code === "VIP_7D",
    })),
  });
}
