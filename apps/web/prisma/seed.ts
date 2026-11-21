import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: { label: p.label, priceXof: p.priceXof, active: true },
      create: { ...p },
    });
  }

  // Comptes de démonstration — UNIQUEMENT hors production.
  // En production, créez le premier admin avec : npm run db:admin -- email motdepasse
  let admin;
  if (process.env.NODE_ENV === "production" || process.env.SEED_DEMO_ACCOUNTS === "0") {
    admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    if (!admin) {
      console.log("[seed] Production : aucun compte créé automatiquement.");
      console.log("        Créez le premier admin : npm run db:admin -- admin@example.com MotDePasseFort!");
    }
  } else {
    const adminEmail = "admin@turfpro.local";
    admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        passwordHash: await bcrypt.hash("Admin2026!", 12),
        displayName: "Admin TURF PRO",
        role: "SUPER_ADMIN",
      },
    });

    const demoEmail = "demo@turfpro.local";
    await prisma.user.upsert({
      where: { email: demoEmail },
      update: {},
      create: {
        email: demoEmail,
        passwordHash: await bcrypt.hash("Demo2026!", 12),
        displayName: "Compte démo",
        role: "CUSTOMER",
      },
    });
  }

  // Courses de DÉMONSTRATION clairement marquées (aucune donnée réelle inventée).
  const existing = await prisma.race.count();
  if (existing === 0) {
    const demoRace = await prisma.race.create({
      data: {
        provider: "demo",
        providerRaceId: "DEMO-R1-C1",
        country: "DEMO",
        venue: "Hippodrome de démonstration",
        meetingName: "Réunion démo",
        name: "Course de démonstration",
        startsAt: new Date(Date.now() + 24 * 3600 * 1000),
        distanceMeters: 1600,
        surface: "sable",
        status: "SCHEDULED",
        sourceUpdatedAt: new Date(),
        runners: {
          create: [
            { number: 1, horseName: "Étoile du Nord", jockeyName: "Jockey A", trainerName: "Entraîneur A" },
            { number: 2, horseName: "Vent d'Automne", jockeyName: "Jockey B", trainerName: "Entraîneur B" },
            { number: 3, horseName: "Perle Noire", jockeyName: "Jockey C", trainerName: "Entraîneur C" },
            { number: 4, horseName: "Roc Hardy", jockeyName: "Jockey D", trainerName: "Entraîneur D" },
            { number: 5, horseName: "Lune Grise", jockeyName: "Jockey E", trainerName: "Entraîneur E" },
            { number: 6, horseName: "Sirocco", jockeyName: "Jockey F", trainerName: "Entraîneur F" },
          ],
        },
      },
    });

    await prisma.prediction.create({
      data: {
        raceId: demoRace.id,
        status: "PUBLISHED",
        title: "Sélection démo — base gratuite",
        analysis:
          "Exemple d'analyse publié pour valider le parcours de validation éditoriale. Cette course et ces partants sont fictifs.",
        selections: [
          { number: 1, horseName: "Étoile du Nord", kind: "free_base" },
          { number: 2, horseName: "Vent d'Automne", kind: "free_base" },
        ],
        evidence: { note: "Données de démonstration, aucune donnée réelle." },
        modelName: "demo",
        modelVersion: "0",
        approvedAt: new Date(),
        publishedAt: new Date(),
      },
    });

    await prisma.prediction.create({
      data: {
        raceId: demoRace.id,
        status: "APPROVED",
        title: "Couplé démo — contenu payant",
        analysis: "Analyse payante de démonstration. Visible uniquement après achat (ou Pass VIP).",
        selections: [
          { number: 3, horseName: "Perle Noire", kind: "couple" },
          { number: 5, horseName: "Lune Grise", kind: "couple" },
        ],
        evidence: { note: "Démonstration du contrôle d'accès serveur." },
        modelName: "demo",
        modelVersion: "0",
        approvedAt: new Date(),
      },
    });

    console.log("Seed démo créé : courses et pronostics fictifs, produits, comptes.");
  }

  if (admin) {
    console.log(`Admin: ${admin.email} (changer le mot de passe si compte de démo)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
