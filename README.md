# TURF PRO — socle applicatif v0.1

Base initiale du produit web TURF PRO, issue du prototype HTML et des règles métier existantes.

## Livré
- Application Next.js / TypeScript.
- Page publique responsive et tarifs initiaux.
- Prévisualisation du Back-Office IA.
- Endpoint de santé `/api/health`.
- Schéma PostgreSQL/Prisma : comptes, rôles, courses, partants, pronostics, validations, produits, commandes, droits et audit.
- Docker Compose PostgreSQL + Redis.
- Ancien prototype conservé dans `legacy/`.

## Démarrage local
Prérequis : Node.js 22+ et Docker Desktop.

```bash
cp apps/web/.env.example apps/web/.env
docker compose up -d
npm install
npm run db:generate
npm run db:push
npm run dev
```
Site : http://localhost:3000 — Back-Office de prévisualisation : http://localhost:3000/admin

## Connexion Neon

Le projet est lié à la branche `production` de Neon. `neon.ts` déclare le bucket privé `assets` ; `neon deploy` le provisionne et écrit les variables dans `.env.local` à la racine. Les commandes `dev`, `build`, `start`, `db:generate`, `db:push` et `db:seed:products` chargent ces variables automatiquement.

L’application utilise l’adaptateur Prisma Neon avec `DATABASE_URL` (connexion poolée). Les commandes Prisma de schéma utilisent `DATABASE_URL_UNPOOLED` pour la connexion directe. Le stockage utilise les variables `AWS_*` générées par Neon et l’API S3 compatible, sans exposer les identifiants au navigateur.

Après un déploiement de schéma, `npm run storage:check` effectue un test réel HEAD/PUT/GET/DELETE dans le bucket. `/api/health` vérifie la connexion PostgreSQL et la présence du bucket.

`npm run db:seed:products` peuple uniquement le catalogue initial. Ne lancez pas `npm run db:seed` sur la branche de production : ce seed crée également des comptes et des courses fictifs de démonstration.

## Fournisseur hippique

Le produit vise les courses françaises. Le connecteur The Racing API peut demander les cartes françaises du jour (`region_codes=fr`), mais ne l’activez qu’avec un abonnement couvrant ces cartes et une autorisation écrite pour l’affichage public/commercial et l’usage dans les analyses. Les identifiants doivent rester dans l’environnement serveur. La synchronisation est déclenchée par un membre du staff depuis `/admin`; le mode `demo` reste le défaut. Les calendriers publics de France Galop et LeTROT ne constituent pas, à eux seuls, une autorisation de recopier ou redistribuer leurs données.

Neon héberge la base et le stockage, pas le site web. L’accès depuis les pays d’Afrique de l’Ouest visés devra être vérifié après le choix d’un hébergeur web, la configuration du domaine et des tests réseau dans ces pays.

## Limites actuelles — ne pas utiliser en production
Aucun flux hippique réel n'est activé par défaut : le connecteur ne fonctionne qu'après configuration des identifiants et autorisation écrite spécifique. Le mode `demo` ne doit jamais être présenté comme un flux réel.

## Suite
1. Authentification et rôles serveur.
2. Autorisation d’un fournisseur français couvrant l’affichage et l’usage des données pour les analyses.
3. Configuration du flux français, synchronisation et contrôle qualité avant publication.
4. Moteur d'analyse et file de validation.
5. Publication sécurisée et audit.
6. FedaPay serveur et webhook vérifié.
7. Tests, sécurité, sauvegardes et déploiement.

Les secrets restent dans les variables d'environnement serveur.
