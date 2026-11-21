# TURF PRO — Mise en production

Guide pas à pas. Prérequis : un serveur Linux (VPS) avec Docker + Docker Compose, un domaine pointant vers le serveur.

> Recommandation VPS (budget/start) : 2 vCPU, 4 Go RAM, 40 Go SSD — Scaleway, OVH, Hetzner. Ubuntu 24.04 LTS.
> Installer Docker : `curl -fsSL https://get.docker.com | sh`

## 1. Préparer le serveur

```bash
# Sur le serveur
git clone <votre-repo> turf-pro && cd turf-pro
# ou : copier le dossier via scp / rsync
```

## 2. Configurer les secrets

```bash
cp apps/web/.env.production.example .env.production
nano .env.production
```

À remplir :
- `POSTGRES_PASSWORD` / `DATABASE_URL` : mot de passe fort (les deux identiques).
- `APP_URL` : votre domaine réel (`https://...`).
- Les secrets sont déjà générés (see `.env.production.example`).
- FedaPay : remplir `FEDAPAY_SECRET_KEY` et `FEDAPAY_WEBHOOK_SECRET` quand le compte est créé.

> ⚠️ Ne jamais committer `.env.production` (déjà dans `.gitignore`).

## 3. Premier démarrage

```bash
# Base de données seule d'abord
docker compose up -d postgres redis

# Schéma + seed produits (les comptes de démo NE sont PAS créés en production)
docker compose run --rm web npx prisma migrate deploy
docker compose run --rm -e NODE_ENV=production web npx tsx prisma/seed.ts

# Créer le premier administrateur (12 caractères minimum)
docker compose run --rm web npx tsx prisma/create-admin.ts admin@votre-domaine.com "MotDePasseFort123!"

# Démarrer l'application + cron
docker compose --profile app up -d --build
```

Vérifier : `https://votre-domaine.com/api/health` → `{"status":"ok"}`.

## 4. HTTPS (reverse proxy Caddy — inclus)

La stack inclut **Caddy** (HTTPS automatique Let's Encrypt). Il suffit que :
- le domaine pointe vers l'IP du serveur (enregistrement DNS A),
- `APP_URL` dans `.env.production` soit `https://votre-domaine.com`.

Le fichier `Caddyfile` à la racine est déjà configuré (headers de sécurité,
proxy vers l'app, ports 80/443 publics, app non exposée directement).

```bash
docker compose --profile app up -d --build
# Les certificats sont émis automatiquement au premier accès.
```

## 5. Sauvegardes nocturnes

Le script `scripts/backup.sh` est prévu pour Linux (le `.ps1` est pour Windows).

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh            # test manuel

# Cron : tous les jours à 02:00, retention 30 jours
(crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && ./scripts/backup.sh 30 >> backups/backup.log 2>&1") | crontab -
```

Restauration :
```bash
docker compose exec -T postgres pg_restore -U turfpro -d turfpro --clean < backups/turfpro-YYYYMMDD-HHMMSS.dump
```

## 6. Vérifications post-déploiement

- [ ] `/api/health` répond OK
- [ ] Connexion admin fonctionne (nouveau mot de passe)
- [ ] Aucun compte de démo (`admin@turfpro.local` / `demo@turfpro.local` ne doivent pas exister)
- [ ] `/admin` exige une session staff
- [ ] Le contenu payant est verrouillé sans droit (test sur une course de démo)
- [ ] Cron de publication actif (les `SCHEDULED` sortent à l'heure)
- [ ] Sauvegarde nocturne créée dans `backups/`
- [ ] Logs propres : `docker compose logs -f web`

## 7. FedaPay (quand le compte est créé)

1. Créer le compte marchand sur fedapay.com, récupérer la clé sandbox/live.
2. Renseigner `FEDAPAY_SECRET_KEY` et redémarrer : `docker compose --profile app up -d web`.
3. Dans le dashboard FedaPay, configurer le webhook :
   - URL : `https://votre-domaine.com/api/payments/fedapay`
   - Secret : `FEDAPAY_WEBHOOK_SECRET` du `.env.production`
4. Tester un paiement sandbox (le mode simulation est désactivé automatiquement dès qu'une clé est présente).

## 8. Données hippiques françaises

TURF PRO cible les courses françaises, mais aucun flux français commercialement autorisé n'est configuré. Le connecteur The Racing API disponible dans le code est limité aux programmes UK/Irlande : ne le définissez pas comme fournisseur de production pour ce projet.

Avant toute synchronisation réelle, obtenir d'un fournisseur français un accès/API et une autorisation écrite couvrant l'affichage commercial et l'utilisation pour les analyses TURF PRO. Garder `HORSE_RACING_PROVIDER="demo"` jusque-là. Les identifiants doivent rester dans l'environnement serveur ; ne pas scraper ni recopier les calendriers publics sans autorisation.

## 9. Mise à jour de l'application

```bash
git pull
docker compose --profile app up -d --build
docker compose run --rm web npx prisma migrate deploy
```

## 10. Rollback

Voir restauration au §5. Pour revenir à une version antérieure du code :
```bash
git checkout <tag-ou-commit-precedent>
docker compose --profile app up -d --build
docker compose run --rm web npx prisma migrate deploy
```
