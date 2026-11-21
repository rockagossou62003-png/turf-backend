# TURF PRO — Déploiement GRATUIT (sans VPS)

Solution 100 % gratuite et compatible avec votre compte FedaPay existant.
Architecture : **Render (application Next.js, free tier)** + **Neon (PostgreSQL gratuit)**.
Le cron de publication tourne directement sur Render (pas besoin de service séparé).

| Service | Rôle | Gratuit ? | Limite |
|---|---|---|---|
| [Render](https://render.com) | App Next.js + cron | ✅ 750 h/mois | s'endort après 15 min d'inactivité (redémarre en ~30 s) |
| [Neon](https://neon.tech) | PostgreSQL | ✅ 0,5 Go | jamais en pause côté plan gratuit moderne |
| FedaPay | Paiement | ✅ (compte existant) | — |

> ⚠️ Le free tier Render **s'endort** : la première requête après une pause prend ~30 s.
> Acceptable pour démarrer ; passez au plan payant (~7 $/mois) quand vous avez des clients.

---

## Étape 1 — Base de données Neon (5 min)

1. Créez un compte sur [neon.tech](https://neon.tech) (GitHub ou Google).
2. **New Project** → nom `turfpro` → région la plus proche (ex. `Europe - Paris`).
3. Copiez la **connection string** (elle ressemble à) :
   ```
   postgresql://turfpro:xxxx@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   → C'est votre `DATABASE_URL`.

## Étape 2 — Pousser le code sur GitHub

```bash
cd c:\Users\HP\Desktop\TURF
git init            # si pas déjà fait
git add .
git commit -m "TURF PRO v0.5"
# Créez un repo "turf-pro" sur github.com puis :
git remote add origin https://github.com/VOTRE-COMPTE/turf-pro.git
git push -u origin main
```

## Étape 3 — Créer l'application sur Render (10 min)

1. [dashboard.render.com](https://dashboard.render.com) → **New → Web Service** → connectez votre GitHub.
2. Sélectionnez le repo `turf-pro`.
3. Configuration :
   - **Root Directory** : `apps/web`
   - **Environment** : `Node`
   - **Build Command** :
     ```
     npm install && npx prisma generate && npx prisma db push && npm run build
     ```
   - **Start Command** :
     ```
     npm run start
     ```
   - **Instance type** : `Free`
4. **Environment Variables** (section gauche) — ajoutez :

   | Clé | Valeur |
   |---|---|
   | `DATABASE_URL` | la connection string Neon (étape 1) |
   | `NODE_ENV` | `production` |
   | `APP_URL` | `https://votre-app.onrender.com` |
   | `PAYMENT_WEBHOOK_SECRET` | votre secret généré |
   | `CRON_SECRET` | votre secret généré |
   | `HORSE_RACING_PROVIDER` | `demo` |
   | `THERACINGAPI_CONTRACT_ACCEPTED` | *(laisser vide : The Racing API ne couvre pas les programmes français)* |
   | `RACING_API_USERNAME` / `RACING_API_PASSWORD` | *(laisser vides : identifiants UK/Irlande uniquement)* |
   | `FEDAPAY_SECRET_KEY` | votre clé secrète FedaPay |
   | `FEDAPAY_WEBHOOK_SECRET` | votre secret webhook FedaPay |

5. **Create Web Service** → le premier build prend 3-5 min.

## Étape 4 — Cron de publication sur Render

1. Dashboard Render → **New → Cron Job**.
2. Même repo, même root directory `apps/web`.
3. **Command** :
   ```bash
   curl -s -X POST -H "x-cron-secret: $CRON_SECRET" $APP_URL/api/cron/publish
   ```
4. **Schedule** : `*/1 * * * *` (toutes les minutes).
5. Ajoutez les variables `CRON_SECRET` et `APP_URL` identiques au service web.

## Étape 5 — Seed et administrateur

Une fois le premier build réussi (Dashboard → onglet **Logs** = « Available ») :

1. Render → votre service web → **Shell** (bouton en haut) :
   ```bash
   npx tsx prisma/seed.ts
   npx tsx prisma/create-admin.ts votre-email@example.com "MotDePasseFort123!"
   ```
   *(En production, le seed ne crée PAS les comptes de démo.)*

2. Vérifiez `https://votre-app.onrender.com/api/health` → `{"status":"ok"}`.

## Étape 6 — Connecter FedaPay

1. Dashboard FedaPay → **Webhooks** → ajoutez :
   - **URL** : `https://votre-app.onrender.com/api/payments/fedapay`
   - **Secret** : identique à `FEDAPAY_WEBHOOK_SECRET` sur Render.
2. Testez un paiement **sandbox** depuis le site (achetez un contenu verrouillé).
3. Quand le compte est validé pour le *live*, remplacez `FEDAPAY_SECRET_KEY` par la clé live → la simulation locale se désactive automatiquement (déjà codé dans `lib/fedapay.ts`).

## Étape 7 — Nom de domaine (optionnel, gratuit aussi)

- Un sous-domaine `*.onrender.com` est fourni gratuitement — utilisable tel quel avec FedaPay.
- Pour un domaine custom plus tard : Namecheap/Cloudflare (~10 €/an) → Render → **Settings → Custom Domains**.

---

## Sauvegardes sans serveur

Neon fait des sauvegardes automatiques (point-in-time recovery). Pour un export manuel :
```bash
# Sur votre PC Windows (pg_dump non requis, via Docker) :
docker run --rm -it postgres:16-alpine sh -c \
  "pg_dump 'VOTRE_DATABASE_URL_NEON' -Fc" > backup-turfpro.dump
```

## Limites du gratuit et transitions

| Besoin | Gratuit couvre | Quand payer |
|---|---|---|
| Tests + premiers clients | ✅ largement | — |
| Sommeil après 15 min | première requête lente | Render paid $7/mois |
| DB > 0,5 Go | — | Neon $19/mois (lointain) |
| Cron toutes les minutes | ✅ inclus | — |

Quand le trafic justifie un VPS (§DEPLOY.md), la migration = exporter Neon, restaurer sur le VPS — aucune ligne de code à changer.
