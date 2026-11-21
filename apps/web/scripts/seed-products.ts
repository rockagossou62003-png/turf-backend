import { prisma } from "../lib/prisma";

const PRODUCTS = [
  { code: "FREE", label: "Accès gratuit — 2 chevaux + analyse publique", priceXof: 0 },
  { code: "COUPLE", label: "Couplé — par combinaison", priceXof: 500 },
  { code: "TRIO_DISORDER", label: "Trio désordre", priceXof: 2500 },
  { code: "TRIO_ORDER", label: "Trio ordre", priceXof: 8000 },
  { code: "QUINTE_7", label: "Quinté 7 chevaux", priceXof: 5000 },
  { code: "VIP_24H", label: "Pass VIP 24 h", priceXof: 10000 },
  { code: "VIP_7D", label: "Pass VIP 7 jours", priceXof: 34680 },
] as const;

async function main() {
  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: { label: product.label, priceXof: product.priceXof, active: true },
      create: product,
    });
  }
  console.log(`Catalogue synchronisé : ${PRODUCTS.length} produits.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
