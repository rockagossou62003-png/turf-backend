# TURF PRO — Conception fonctionnelle et technique du module IA autonome

Version 1.0 — 20 novembre 2026

## 1. Objectif et périmètre

Le module IA automatise le cycle de vie des courses et des contenus éditoriaux de pronostics : collecte des données hippiques, normalisation, détection des changements, analyse, préparation de pronostics, validation Back-Office, publication, récupération des résultats et archivage.

TURF PRO reste une plateforme de publication et de vente de pronostics. Le module ne doit pas prendre de mises, générer des tickets de pari, promettre des gains ou calculer des reversements de jeux.

## 2. Principes non négociables

- **Source de vérité** : les courses, partants, non-partants, horaires et résultats proviennent d'un fournisseur hippique licencié/autorisé ou d'une source officielle dont les conditions permettent la réutilisation.
- **Pas d'invention** : l'IA ne crée jamais un partant, un résultat, une cote ou une information de course manquante. Une donnée absente reste « inconnue » et peut bloquer la publication.
- **Validation humaine** : par défaut, chaque pronostic doit être approuvé dans le Back-Office avant publication. La synchronisation de données officielles peut être automatique selon des règles de qualité configurées.
- **Traçabilité** : chaque modification, analyse, version de pronostic, validation et publication est horodatée et attribuée à un acteur ou à un processus.
- **Séparation des droits** : les droits d'accès aux contenus gratuits, achats à la carte et Pass VIP sont vérifiés par le serveur, jamais par le navigateur.
- **Résultats** : un résultat n'est marqué officiel que si la source le confirme. Les corrections ultérieures doivent créer une nouvelle version et une trace d'audit.

## 3. Parcours automatisé

1. **Collecte planifiée** : le connecteur interroge le fournisseur à intervalles configurables et reçoit si possible ses webhooks.
2. **Normalisation** : conversion des fuseaux horaires, devises/unités et identifiants ; association pays, hippodrome, réunion, course, cheval, jockey et entraîneur.
3. **Détection des changements** : comparaison des snapshots ; détection d'ajout/annulation de course, changement d'heure, distance, terrain, partant et non-partant.
4. **Contrôle qualité** : validation des champs obligatoires, doublons, cohérence des numéros et fraîcheur des données. Les anomalies passent en quarantaine.
5. **Analyse** : calculs déterministes à partir des données disponibles (forme, performances, distance, piste, corde, poids, ferrure si disponible, jockey/entraîneur, conditions et historique). L'IA rédige une synthèse et propose des sélections ; elle cite les facteurs réellement présents.
6. **File de validation** : proposition avec course, sélection, justification, sources, heure de calcul, version du modèle, données utilisées, incertitudes et indicateurs de qualité.
7. **Décision Back-Office** : approuver, rejeter, demander révision, modifier manuellement ou différer. Toute décision exige un utilisateur authentifié et un motif lorsque pertinent.
8. **Publication** : après approbation, publier selon le niveau gratuit / achat à la carte / VIP et l'heure de publication programmée.
9. **Suivi de course** : actualiser les non-partants et changements critiques ; invalider ou demander une nouvelle validation si une modification rend le pronostic obsolète.
10. **Résultats et bilan** : importer le résultat officiel, rapprocher avec la course, clôturer et calculer les statistiques selon une méthode explicite et reproductible.

## 4. États métier

### Course
`DISCOVERED → VERIFIED → SCHEDULED → LIVE → FINISHED → RESULT_CONFIRMED` ; états alternatifs : `CANCELLED`, `POSTPONED`, `DATA_QUARANTINED`.

### Pronostic
`DRAFT → AI_GENERATED → PENDING_REVIEW → APPROVED → SCHEDULED → PUBLISHED → ARCHIVED` ; alternatives : `REJECTED`, `REVISION_REQUESTED`, `SUPERSEDED`, `WITHDRAWN`.

Un changement de partant, d'horaire ou de condition critique après approbation peut faire passer le pronostic en `REVIEW_REQUIRED` et suspendre sa diffusion selon les règles définies.

## 5. Back-Office — écrans à réaliser

1. **Vue d'ensemble IA** : état des connecteurs, dernière synchronisation, courses importées, anomalies, pronostics en attente, publications programmées et erreurs.
2. **Centre des courses** : filtres date/pays/hippodrome/discipline ; comparaison des données source et TURF PRO ; historique des modifications.
3. **File de validation** : sélection proposée, justification, données sources, facteurs manquants, score de qualité/confiance calibré, version IA, aperçu gratuit/à la carte/VIP.
4. **Éditeur de pronostic** : correction manuelle, commentaire, contrôle des numéros autorisés et aperçu avant publication.
5. **Résultats officiels** : statut de confirmation, source, heure, correction et journal.
6. **Paramètres** : fréquence de collecte, fuseau par hippodrome, seuils qualité, fenêtres de publication, modèles IA, alertes et rôles.
7. **Journal d'audit** : acteur, action, ancienne/nouvelle valeur, horodatage, adresse IP/session si conforme, motif.

## 6. Architecture cible

- **Web** : Next.js/React pour l'espace public et le Back-Office.
- **Mobile** : React Native/Expo (ou PWA en première phase si budget contraint).
- **API métier** : NestJS avec API REST documentée et authentification sécurisée.
- **Données** : PostgreSQL ; Redis pour cache, verrous et files ; stockage objet pour snapshots et rapports.
- **Traitements asynchrones** : workers (BullMQ/Redis ou équivalent) pour synchronisation, contrôles, analyses, notifications et résultats.
- **Connecteurs hippiques** : adaptateurs indépendants par fournisseur ; aucune dépendance au format d'un seul fournisseur dans le domaine métier.
- **Moteur d'analyse** : règles et calculs reproductibles d'abord ; LLM ensuite pour synthèse/explication et proposition assistée, avec sortie JSON validée par schéma.
- **Paiements** : FedaPay côté serveur ; webhook signé/vérifié et idempotent avant attribution d'un droit.
- **Observabilité** : logs structurés, métriques, alertes, suivi des jobs et sauvegardes.

Le HTML existant est un prototype monofichier avec données locales et interactions simulées. Le panneau IA ajouté dans le fichier de démonstration illustre le flux Back-Office, mais ne constitue pas un connecteur opérationnel. Les appels fournisseur, la base persistante, l'authentification et les validations serveur doivent être développés dans le backend.

## 7. Modèle de données minimal

- `providers`, `provider_events`, `sync_runs`
- `countries`, `venues`, `meetings`, `races`
- `runners`, `horses`, `jockeys`, `trainers`, `race_runner_snapshots`
- `race_changes`, `data_quality_issues`
- `prediction_versions`, `prediction_selections`, `prediction_evidence`
- `reviews`, `publication_jobs`, `publications`
- `official_results`, `result_corrections`, `performance_metrics`
- `users`, `roles`, `permissions`, `audit_logs`
- `products`, `orders`, `payment_events`, `entitlements`

Chaque objet importé doit conserver `provider_id`, `provider_record_id`, `source_updated_at`, `fetched_at`, `raw_payload_hash` et la version normalisée. Les pronostics conservent `model_name`, `model_version`, `prompt_or_policy_version`, `input_snapshot_id` et `generated_at`.

## 8. API interne indicative

- `POST /integrations/horse-racing/{provider}/sync`
- `GET /admin/ai/overview`
- `GET /admin/races?date=&status=&country=`
- `GET /admin/predictions?status=pending_review`
- `POST /admin/predictions/{id}/approve`
- `POST /admin/predictions/{id}/reject`
- `POST /admin/predictions/{id}/request-revision`
- `POST /admin/predictions/{id}/publish`
- `POST /webhooks/horse-racing/{provider}`
- `POST /webhooks/fedapay`

Toutes les actions de décision sont autorisées côté serveur, protégées contre les doubles soumissions et consignées dans `audit_logs`.

## 9. Règles de génération et de publication

- Refuser une génération si la liste des partants n'est pas confirmée ou si les données critiques sont trop anciennes.
- N'utiliser que les facteurs effectivement présents ; afficher « donnée indisponible » plutôt que supposer.
- Ne pas afficher une probabilité ou un score comme certitude. Calibrer les scores sur des historiques suffisants et afficher la méthode.
- Exiger une approbation après tout changement majeur survenu après la génération.
- Une publication gratuite peut contenir la base publique ; les produits payants restent attachés à une course et à un produit exact ; le VIP est un droit temporaire global selon les règles métier existantes.
- Aucun contenu premium n'est rendu accessible en modifiant le JavaScript ou le stockage local : l'API vérifie l'entitlement à chaque lecture.

## 10. Sécurité et conformité

- Authentification forte pour administrateurs ; rôles distincts (super-admin, éditeur hippique, analyste, valideur, support, lecture seule).
- MFA pour les rôles sensibles, limitation de débit, validation stricte des entrées, protection CSRF/XSS, secrets dans un gestionnaire de secrets.
- Séparer environnements test et production ; ne jamais placer les clés fournisseur ou FedaPay dans le HTML/mobile.
- Vérifier signatures, horodatage et idempotence des webhooks ; réconcilier les paiements auprès du fournisseur.
- Respecter licences de données, RGPD et lois applicables dans chaque pays ciblé ; faire valider les obligations relatives aux pronostics payants, à la publicité et à l'âge légal par un conseil compétent.
- Politique de conservation, suppression/export des données personnelles, sauvegardes et plan de reprise.

## 11. Plan de réalisation recommandé

**Phase 0 — cadrage fournisseur** : sélectionner un fournisseur licencié, confirmer couverture géographique, disciplines, partants, non-partants, résultats, latence, historique, SLA, prix et droits d'affichage/redistribution.

**Phase 1 — données fiables** : backend, base, connecteur, synchronisation, normalisation, contrôle qualité et tableau des courses. Aucun pronostic IA publié à ce stade.

**Phase 2 — copilote pronostics** : calculs statistiques, génération de brouillons, justification, versionnage et file de validation manuelle.

**Phase 3 — publication et résultats** : planification, affichage web/mobile, alertes de changements, résultats officiels et statistiques vérifiables.

**Phase 4 — industrialisation** : second fournisseur de secours si justifié, monitoring, tests de charge, sécurité, reprise et déploiement multi-pays.

## 12. Critères d'acceptation

- Une synchronisation répétée n'insère pas de doublons.
- Un changement de partant est historisé et déclenche les règles d'alerte/révision.
- Une course sans source fiable ou avec données critiques manquantes est bloquée/quarantainée.
- Un pronostic généré reste invisible au public tant qu'il n'est pas approuvé.
- Un administrateur non habilité ne peut pas approuver ni publier.
- Chaque publication peut être reliée à une version précise du pronostic et à son snapshot source.
- Les résultats affichés sont traçables à une source officielle et les corrections sont historisées.
- Les droits à la carte et VIP sont calculés côté serveur et testés contre les accès directs.
- Les alertes et erreurs de synchronisation sont visibles et peuvent être rejouées sans doublon.

## 13. Décision encore nécessaire

Avant le développement opérationnel, il faut choisir le fournisseur de données hippiques et valider son contrat/API. C'est la dépendance externe principale : sans ce flux, le système ne peut pas actualiser de façon fiable les courses internationales. La fréquence de synchronisation sera définie selon la latence et les limites contractuelles du fournisseur.
