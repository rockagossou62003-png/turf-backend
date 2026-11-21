# État initial — TURF PRO

## Décisions métier
Plateforme éditoriale qui vend l'accès à des contenus d'analyse et de pronostics ; elle ne reçoit pas de mises et ne promet pas de gains. Les pronostics IA restent en attente d'une validation humaine. Aucune course, aucun partant, aucune cote et aucun résultat ne doivent être inventés.

## Tarifs initiaux
Gratuit 0 XOF ; Couplé 500 XOF par combinaison ; Trio désordre 2 500 XOF ; Trio ordre 8 000 XOF ; Quinté 7 chevaux 5 000 XOF ; VIP 24 h 10 000 XOF ; VIP 7 jours 34 680 XOF. Le VIP mensuel à 80 000 XOF est à confirmer.

## Données
Les conditions publiques de certains fournisseurs limitent la redistribution, la revente de données brutes ou l'usage dans un service de tips. Un accord écrit doit préciser l'usage TURF PRO avant activation en production.

## Sécurité
Droits d'accès vérifiés côté serveur ; paiement confirmé uniquement par webhook signé et idempotent ; changements critiques de partants/horaires pouvant suspendre un pronostic ; audit des actions sensibles.

## État au 20/11/2026
- Code source application dans `apps/web` (Next.js 15 + Prisma). Le build de production passe (`next build` ✓, 16 pages).
- Correction apportée : `app/api/auth/register/route.ts` (appel d'audit brisé, session sans cookie) et `app/api/auth/logout/route.ts` (constante de cookie inconnue), `lib/session.ts` (typage `setSessionCookie`), `app/programme/page.tsx` (accès `analysis` optionnel).
- Authentification complète : inscription, connexion, déconnexion, `/api/auth/me`, sessions serveur hachées (SHA-256) révocables.
- Contrôle d'accès serveur opérationnel (`lib/authz.ts`) : VIP, achats à la carte, projection publique sans fuite du contenu payant.
- Paiement simulé via webhook HMAC signé et idempotent ; création de droits dans une transaction.

## Livré le 20/11/2026 — v0.2
- **Connecteur fournisseur** (`lib/providers/theracingapi.ts`, `/api/admin/sync`) : programmes Basic UK/Irlande uniquement, import idempotent, contrôle qualité (non-partant, changement d'horaire → quarantaine + retrait des pronostics publiés) et erreurs explicites. Inadapté aux courses françaises visées par le produit ; laissé désactivé. L'intégration d'un flux français attend une source et une autorisation commerciale.
- **Moteur d'analyse** (`lib/analysis.ts`, `/api/admin/generate`) : génération déterministe depuis les partants déclarés (base gratuite 2 chevaux + couplé payant), statut `AI_GENERATED`, jamais publiée automatiquement, traçabilité modèle/version/empreinte.
- **FedaPay serveur** (`lib/fedapay.ts`, `/api/orders`, `/api/payments/fedapay`) : création de transaction serveur, webhook vérifié (HMAC + anti-rejeu 5 min), montant vérifié, droits créés de façon idempotente. Sans clé, bascule automatique en simulation locale.
- **Back-office** : panneau « Opérations » (synchroniser, générer) + file de validation existante.

## Livré le 20/11/2026 — v0.3
- **Publication programmée** : action `SCHEDULE` dans la file admin (heure cible validée), cron sécurisé `/api/cron/publish` (header `x-cron-secret`) qui publie à l'heure prévue et retire les pronostics des courses annulées/quarantaine.
- **Tests automatisés** (Vitest, `npm test`) : 17 tests verts — accès au contenu payant, signature webhook FedaPay, moteur d'analyse, mapping The Racing API et validation des heures de départ.
- **Sauvegardes** : `scripts/backup.ps1` (pg_dump custom via docker cp, testé — dump 27 Ko —, retention 14 jours, Nettoyage automatique).
- **Déploiement** : `apps/web/Dockerfile` (multi-stage node:22-alpine, utilisateur non-root, `prisma migrate deploy` au démarrage), `docker-compose.yml` avec services `web` (profil app) et `cron-publish`, `.env.example` à jour.

## Livré le 20/11/2026 — v0.4 (préparation production)
- **Secrets** : `.env.production.example` généré avec secrets forts (PAYMENT_WEBHOOK_SECRET, CRON_SECRET).
- **Comptes de démo** : le seed ne crée plus `admin@turfpro.local`/`demo@turfpro.local` en production ; nouveau script `npm run db:admin` (`prisma/create-admin.ts`) pour créer le premier SUPER_ADMIN avec mot de passe fort (12 car. min).
- **Guide de déploiement** : `docs/DEPLOY.md` — 10 étapes (serveur, secrets, migrations, admin, HTTPS/Caddy, sauvegardes cron, checklist post-déploiement, FedaPay, données hippiques réelles, rollback).
- `.gitignore` : excludes `backups/` et `.env.production`.

## Livré le 20/11/2026 — v0.5 (stack déploiement complète)
- **HTTPS automatique** : service Caddy ajouté au `docker-compose.yml` (ports 80/443, certificats Let's Encrypt automatiques, headers de sécurité, app Next non exposée publiquement). Fichier `Caddyfile` à la racine.
- **Sauvegarde Linux** : `scripts/backup.sh` natif VPS (pg_dump + docker cp, retention, log) — le `.ps1` reste pour Windows.
- **DEPLOY.md corrigé** : cron bash propre, section Caddy réelle, restauration détaillée, recommandation VPS (2 vCPU / 4 Go, Ubuntu 24.04).
- Validé : `docker compose --profile app config` OK (5 services : postgres, redis, web, caddy, cron-publish).

## Livré le 20/11/2026 — v0.6 (déploiement gratuit)
- **`docs/DEPLOY-FREE.md`** : déploiement 100 % gratuit sans VPS — Render (app Next.js + cron intégré) + Neon (PostgreSQL 0,5 Go gratuit), compatible avec un compte FedaPay existant (webhook à configurer chez eux). Migration vers VPS ultérieure sans changement de code.
