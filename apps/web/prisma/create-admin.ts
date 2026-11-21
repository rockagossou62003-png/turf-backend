import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Crée (ou promeut) un administrateur en production.
 * Usage : npx tsx prisma/create-admin.ts <email> <motDePasse>
 * À exécuter sur le serveur uniquement ; ne crée jamais de compte client.
 */
async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage : npx tsx prisma/create-admin.ts <email> <motDePasse>");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Le mot de passe doit contenir au moins 12 caractères.");
    process.exit(1);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Adresse email invalide.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: { role: "SUPER_ADMIN", passwordHash },
      create: {
        email: email.toLowerCase(),
        passwordHash,
        displayName: "Administrateur",
        role: "SUPER_ADMIN",
      },
    });
    console.log(`Administrateur prêt : ${admin.email} (rôle ${admin.role})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
