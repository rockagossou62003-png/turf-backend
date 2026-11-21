# TRD --- Technical Requirements Document

## PMU Racing App

**Version:** 1.0.0\
**Statut:** Proposition d'architecture à valider\
**Cibles:** Web, iOS, Android\
**Architecture:** API-first, modulaire, multi-tenant logique par marché,
intégrations externes isolées.

------------------------------------------------------------------------

## 1. Objectif

Définir une architecture maintenable et sécurisée pour une plateforme
internationale de données hippiques, pronostics, simulations et accès
conditionnel à des opérateurs agréés. Le système doit pouvoir
fonctionner en mode informationnel même si les modules de paris réels ne
sont pas autorisés ou disponibles.

## 2. Contraintes et décisions d'architecture

-   Les fournisseurs officiels et leurs contrats ne sont pas encore
    identifiés.
-   Les API exactes, limites de débit, SLA, droits de cache et de
    redistribution dépendront des contrats.
-   Les paris réels ne sont pas dans le périmètre technique activé par
    défaut.
-   Le système doit isoler les intégrations tierces derrière des
    adaptateurs.
-   Les technologies proposées sont indicatives ; un prototype technique
    doit confirmer les compétences et coûts d'exploitation.

## 3. Stack recommandée

  -----------------------------------------------------------------------
  Couche                  Proposition             Motif
  ----------------------- ----------------------- -----------------------
  Web                     Next.js + TypeScript    SSR/SEO, performance,
                                                  écosystème

  Mobile                  React Native + Expo +   Base de code partagée
                          TypeScript              iOS/Android

  Backend                 NestJS + TypeScript     Modules, validation,
                                                  OpenAPI, maintenabilité

  Base principale         PostgreSQL              Transactions, relations
                                                  et intégrité

  Cache                   Redis                   Cache, rate limiting,
                                                  données fréquemment
                                                  lues

  Messaging               RabbitMQ ou AWS SQS     Traitements asynchrones
                                                  et ingestion

  Stockage fichiers       S3 compatible           Médias, exports et
                                                  archives autorisés

  Recherche               PostgreSQL au MVP,      Recherche
                          OpenSearch ensuite      multi-critères à grande
                                                  échelle

  Auth                    OIDC/OAuth2 via         Sessions et identité
                          fournisseur éprouvé ou  
                          service dédié           

  Observabilité           OpenTelemetry +         Traces, métriques,
                          Prometheus/Grafana +    erreurs
                          Sentry                  

  CI/CD                   GitHub Actions ou       Tests, scans et
                          équivalent              déploiements
                                                  reproductibles

  Infrastructure          Conteneurs, service     Simplicité
                          managé cloud            opérationnelle initiale
  -----------------------------------------------------------------------

Éviter les microservices prématurés : démarrer avec un **monolithe
modulaire** et des workers asynchrones. Extraire un service uniquement
si charge, équipe, sécurité ou cycle de déploiement le justifie.

## 4. Vue d'ensemble

``` text
Web App / iOS App / Android App
              |
         CDN / WAF
              |
        API Gateway
              |
       Backend modulaire
       |       |        |
   Identity  Racing   Content/Predictions
       |       |        |
       |    Domain DB   |
       |       |        |
       +---- PostgreSQL-+
              |
       Redis / Message Broker
              |
        Ingestion Workers
              |
  Official Data Provider Adapters
              |
       Licensed Data Providers

Optional, market-gated:
Backend -> Operator Adapter -> Licensed Betting Operator
```

## 5. Modules backend

### 5.1 Identity & Access

-   Comptes, sessions, rôles et permissions.
-   Vérification email et récupération de compte.
-   MFA selon risque et exigences.
-   Gestion des consentements.
-   Intégration KYC déléguée à l'opérateur ou au fournisseur agréé si
    applicable.

### 5.2 Market Configuration

-   Registre des pays et territoires.
-   Statut des fonctions par pays : information, cotes, simulation,
    opérateur.
-   Opérateur autorisé, dates d'effet et restrictions.
-   Versionnement et audit des changements.
-   Refus par défaut si configuration absente ou incohérente.

### 5.3 Racing Domain

-   Pays, hippodromes, réunions, courses.
-   Chevaux, jockeys, entraîneurs.
-   Engagements/partants, changements, non-partants.
-   Performances, résultats et rapports.
-   Identifiants internes et correspondances avec identifiants
    fournisseur.

### 5.4 Odds

-   Types de cote et marchés.
-   Valeur, devise/unité, source et horodatage.
-   Statut de fraîcheur.
-   Historique selon droits de licence.
-   Aucun calcul ou agrégat ne doit être présenté comme cote officielle
    s'il ne l'est pas.

### 5.5 Predictions & Content

-   Articles, analyses et pronostics.
-   Auteur, statut de publication, versions.
-   Sources et justification éditoriale.
-   Historique immuable des publications et corrections.
-   Modération et signalements.

### 5.6 Simulation

-   Tickets sans argent réel.
-   Sélections et paramètres.
-   Calcul théorique explicable.
-   Version de la formule et des données utilisées.
-   Aucun appel au système de paiement.

### 5.7 Operator Integration --- désactivé par défaut

-   Adaptateur propre à chaque opérateur.
-   Contrôle marché, âge, identité et éligibilité.
-   Jetons et redirections sécurisés.
-   Idempotence, statut et rapprochement.
-   Aucun stockage de fonds ni traitement de paiement direct sans
    approbation légale et architecture dédiée.
-   Fonction activée uniquement après validation juridique et
    contractuelle.

### 5.8 Notifications

-   Préférences et consentements.
-   Push mobile, email ou in-app.
-   File d'envoi, retries et déduplication.
-   Limitation des notifications et désabonnement.

### 5.9 Administration & Audit

-   RBAC, actions sensibles et double validation si nécessaire.
-   Journaux d'audit append-only.
-   Gestion de flux, replays et quarantaine.
-   Outils de correction avec motif et auteur.

## 6. Architecture d'ingestion des données

### 6.1 Pipeline

1.  Recevoir le flux (webhook, API polling, fichier ou message selon
    fournisseur).
2.  Authentifier et vérifier signature/transport si disponible.
3.  Enregistrer le payload brut dans un stockage sécurisé avec rétention
    contractuelle.
4.  Valider schéma, version et champs obligatoires.
5.  Normaliser vers le modèle canonique.
6.  Résoudre les identifiants externes.
7.  Dédupliquer et appliquer les mises à jour idempotentes.
8.  Publier des événements internes.
9.  Mettre à jour cache et index de lecture.
10. Mesurer latence, erreurs et fraîcheur.

### 6.2 Contrat d'adaptateur

Chaque fournisseur doit implémenter des opérations conceptuelles : -
`fetchMeetings(dateRange, market)` - `fetchRace(raceExternalId)` -
`fetchEntries(raceExternalId)` - `fetchOdds(raceExternalId)` si
autorisé - `fetchResults(raceExternalId)` si autorisé - `healthCheck()`

Les noms réels et capacités dépendent du fournisseur. Ne pas supposer
que tous les fournisseurs exposent toutes les ressources.

### 6.3 Qualité et fraîcheur

-   Chaque enregistrement importé contient `source_provider`,
    `source_record_id`, `source_updated_at`, `ingested_at` et
    `schema_version`.
-   Les seuils de fraîcheur sont configurables par type de donnée et
    fournisseur.
-   Au-delà du seuil, afficher « mise à jour retardée » ou masquer les
    valeurs sensibles à l'obsolescence.
-   Les conflits entre sources sont mis en quarantaine ou résolus par
    une règle explicitement documentée.
-   Les corrections ne suppriment pas silencieusement les valeurs
    antérieures.

## 7. Modèle de données logique

Entités principales et champs indicatifs :

### Identity

-   `users(id, email, password_hash_or_identity_subject, status, created_at)`
-   `user_profiles(user_id, locale, timezone, country_code, preferences_json)`
-   `roles(id, name)`
-   `user_roles(user_id, role_id)`
-   `consents(id, user_id, purpose, version, granted_at, withdrawn_at)`

### Market & providers

-   `markets(country_code, name, information_enabled, odds_enabled, betting_enabled, ruleset_version)`
-   `market_operators(id, market_code, operator_id, status, effective_from, effective_to)`
-   `data_providers(id, name, contract_reference, status)`
-   `provider_capabilities(provider_id, capability, permitted_use, retention_policy)`

### Racing

-   `venues(id, provider_id, external_id, name, country_code, timezone)`
-   `meetings(id, venue_id, provider_id, external_id, meeting_date, status)`
-   `races(id, meeting_id, provider_id, external_id, race_number, scheduled_at, distance, discipline, status)`
-   `horses(id, provider_id, external_id, name, birth_year, sex, metadata_json)`
-   `jockeys(id, provider_id, external_id, name)`
-   `trainers(id, provider_id, external_id, name)`
-   `race_entries(id, race_id, horse_id, jockey_id, trainer_id, saddle_number, status, source_updated_at)`
-   `performances(id, horse_id, race_id, finishing_position, status, performance_json)`
-   `race_results(id, race_id, status, published_at, source_updated_at)`
-   `result_positions(id, race_result_id, race_entry_id, position, status)`

### Odds and predictions

-   `odds_snapshots(id, race_id, entry_id, market_type, value, currency, source_id, captured_at, status)`
-   `predictions(id, race_id, author_id, status, published_at, version, disclaimer_version)`
-   `prediction_selections(id, prediction_id, race_entry_id, rank, rationale)`
-   `prediction_revisions(id, prediction_id, revision, payload_json, created_at)`

### Simulation

-   `simulated_tickets(id, user_id, race_id, label, selections_json, assumptions_json, created_at)`
-   `simulation_calculations(id, ticket_id, formula_version, estimated_return, currency, calculated_at)`

### Operations

-   `provider_ingestion_runs(id, provider_id, resource, started_at, completed_at, status, records_count, error_code)`
-   `audit_events(id, actor_id, action, resource_type, resource_id, metadata_json, created_at)`
-   `outbox_events(id, aggregate_type, aggregate_id, event_type, payload_json, created_at, published_at)`

Les contraintes d'unicité doivent inclure les identifiants fournisseur :
par exemple `(provider_id, external_id)`. Les données personnelles
doivent être minimisées et conservées selon les politiques applicables.

## 8. API --- principes et exemples

-   REST/JSON sous `/api/v1`.
-   OpenAPI publié et versionné.
-   Authentification OIDC/OAuth2 ou session sécurisée.
-   Pagination par curseur pour listes volumineuses.
-   Filtres explicites et tri déterministe.
-   Horodatages ISO 8601 UTC.
-   Erreurs avec code stable, message utilisateur et identifiant de
    corrélation.
-   Idempotency-Key pour opérations pouvant être répétées.
-   Rate limiting par utilisateur, IP et client.

### Endpoints indicatifs

``` http
GET    /api/v1/meetings?date=2026-11-20&country=FR
GET    /api/v1/meetings/{meetingId}
GET    /api/v1/races/{raceId}
GET    /api/v1/races/{raceId}/entries
GET    /api/v1/races/{raceId}/odds
GET    /api/v1/horses/{horseId}
GET    /api/v1/horses/{horseId}/performances
GET    /api/v1/races/{raceId}/results
GET    /api/v1/races/{raceId}/predictions
POST   /api/v1/predictions/{predictionId}/favorite
POST   /api/v1/simulations
GET    /api/v1/simulations
DELETE /api/v1/simulations/{simulationId}
GET    /api/v1/me/preferences
PATCH  /api/v1/me/preferences
```

Endpoints d'administration sous `/api/v1/admin/*` avec RBAC strict. Les
endpoints de pari ne sont pas définis comme API publique générique : ils
doivent être conçus avec le contrat et les spécifications de l'opérateur
retenu.

### Exemple de réponse course

``` json
{
  "id": "race_internal_id",
  "meetingId": "meeting_internal_id",
  "source": {
    "provider": "licensed_provider",
    "updatedAt": "2026-11-20T09:15:00Z"
  },
  "scheduledAt": "2026-11-20T14:30:00Z",
  "timezone": "Europe/Paris",
  "raceNumber": 4,
  "status": "scheduled",
  "distance": {
    "value": 2100,
    "unit": "m"
  }
}
```

Les valeurs ci-dessus sont illustratives et ne représentent pas un flux
réel.

## 9. Sécurité et confidentialité

-   TLS moderne pour tous les échanges.
-   Chiffrement des données sensibles au repos et gestion centralisée
    des secrets.
-   Hashage de mots de passe avec algorithme moderne (Argon2id
    recommandé) si l'authentification est gérée localement.
-   MFA pour administrateurs et actions à risque.
-   RBAC et moindre privilège.
-   Protection CSRF pour sessions cookie, XSS, injection, SSRF et
    attaques de rejeu.
-   WAF, limitation de débit et détection d'abus.
-   Rotation des secrets et clés.
-   Audit des actions administratives et changements de configuration.
-   Séparation des environnements et des données.
-   Sauvegardes chiffrées et tests de restauration.
-   Politique de conservation et suppression par catégorie de données.
-   Processus d'accès, rectification, export et suppression selon la
    législation applicable.
-   Analyse d'impact vie privée lorsque requise.

## 10. Conformité et jeu responsable --- contrôles techniques

Le registre de marchés est une barrière technique, pas un substitut à un
avis juridique.

-   Pari réel désactivé par défaut.
-   Liste positive des pays et opérateurs autorisés.
-   Vérification d'éligibilité par l'opérateur et/ou prestataire agréé.
-   Respect des limites, auto-exclusion, périodes de pause et
    restrictions.
-   Aucun contournement par VPN ou changement de pays déclaré.
-   Événements d'audit pour chaque décision d'autorisation/refus.
-   Affichage des messages de risque et liens d'aide adaptés au pays.
-   Tests de non-régression prouvant le refus dans les marchés
    désactivés.
-   Contrôle des obligations de publicité et d'affiliation.

## 11. Performance, résilience et scalabilité

-   Cache des calendriers et fiches peu changeantes avec TTL adapté.
-   Cache court pour cotes et statuts dynamiques, sans dépasser les
    droits contractuels.
-   Workers séparés des requêtes utilisateurs.
-   Files avec retries exponentiels, dead-letter queue et idempotence.
-   Circuit breaker pour les fournisseurs instables.
-   Timeouts explicites et limites de payload.
-   Réplication/haute disponibilité selon le SLA retenu.
-   CDN pour ressources statiques.
-   Tests de charge sur pics avant événements majeurs.
-   Objectifs initiaux : API p95 \< 500 ms pour lectures internes,
    disponibilité 99,5 % mensuelle. Les objectifs seront ajustés au
    budget et aux contrats fournisseurs.

## 12. Observabilité et exploitation

Métriques : - disponibilité API et p50/p95/p99 ; - erreurs par endpoint
; - latence d'ingestion par fournisseur et ressource ; - âge de la
dernière donnée par course ; - taux de doublons et rejets ; - profondeur
des files et nombre de retries ; - erreurs de notification ; - refus
d'accès marché et motifs agrégés.

Logs structurés avec `request_id`, `trace_id`, `user_id` pseudonymisé si
nécessaire, fournisseur et code d'erreur. Ne jamais journaliser mots de
passe, jetons, données bancaires ou documents d'identité.

Alertes : - flux absent ou en retard ; - hausse des erreurs fournisseur
; - résultats incohérents ; - file bloquée ; - disponibilité API
dégradée ; - tentative d'accès à un marché désactivé ; - erreur de
configuration de marché.

Runbooks requis pour panne fournisseur, rollback, restauration, fuite de
secret, correction de résultat et désactivation d'un opérateur.

## 13. Tests et assurance qualité

### Tests

-   Unitaires sur règles métier et normalisation.
-   Intégration DB et broker.
-   Contract tests des adaptateurs fournisseurs.
-   Tests API et OpenAPI.
-   Tests end-to-end Web et mobile.
-   Tests de charge et endurance.
-   Tests sécurité SAST, DAST, dépendances et secrets.
-   Tests accessibilité.
-   Tests de résilience : timeout, doublon, ordre inversé, événement
    rejoué.
-   Tests de conformité pays pour toutes les combinaisons
    autorisées/refusées.

### Cas critiques

-   Même événement fournisseur reçu deux fois.
-   Événement plus ancien reçu après un événement récent.
-   Cheval déclaré non-partant après publication initiale.
-   Course reportée ou annulée.
-   Résultat provisoire ensuite corrigé.
-   Cote dépassant son seuil de fraîcheur.
-   Fournisseur indisponible.
-   Pays non activé essayant d'ouvrir un parcours de pari.
-   Utilisateur auto-exclu ou non éligible.
-   Réponse opérateur ambiguë ou délai dépassé.

## 14. CI/CD et environnements

Environnements : - local ; - development ; - staging ; - production.

Pipeline : 1. lint et format ; 2. tests unitaires ; 3. tests
d'intégration ; 4. scans sécurité et dépendances ; 5. build
reproductible ; 6. déploiement staging ; 7. tests smoke/e2e ; 8.
approbation de release ; 9. déploiement progressif production ; 10.
vérification post-déploiement et rollback disponible.

Les migrations de base doivent être versionnées, relues et compatibles
avec un déploiement progressif.

## 15. Déploiement et infrastructure

-   Infrastructure as Code (Terraform ou équivalent).
-   Conteneurs OCI.
-   Base PostgreSQL managée avec sauvegardes et restauration ponctuelle.
-   Redis managé.
-   Broker managé ou service de queue cloud.
-   Stockage objet chiffré.
-   CDN/WAF.
-   Gestion des secrets dédiée.
-   Déploiement multi-zone selon le niveau de disponibilité requis.
-   Région d'hébergement et résidence des données décidées après analyse
    juridique des marchés.

## 16. Stratégie de livraison technique

### Sprint 0 --- Fondations

-   dépôt, conventions, CI, environnements ;
-   modèle canonique et décision d'architecture ;
-   preuve d'accès au fournisseur de données ;
-   prototype d'ingestion.

### MVP technique

-   identité et préférences ;
-   réunions, courses, partants, chevaux ;
-   ingestion, normalisation et supervision ;
-   API publique et applications ;
-   pronostics, résultats, favoris et notifications.

### Simulation

-   modèle de ticket sans argent réel ;
-   calculs théoriques versionnés ;
-   historique et tests de séparation avec les paris.

### Intégration opérateur

-   seulement après validation pays/contrats ;
-   adaptateur dédié ;
-   tests de bout en bout avec sandbox opérateur ;
-   revue sécurité, conformité et exploitation ;
-   feature flag et procédure d'arrêt d'urgence.

## 17. Décisions techniques restant à prendre

1.  Fournisseur officiel et droits d'usage : programmes, cotes,
    résultats, historiques, images.
2.  Pays pilote et exigences de résidence des données.
3.  Hébergeur cloud et budget mensuel.
4.  Authentification : fournisseur OIDC ou gestion interne.
5.  Broker : RabbitMQ, SQS ou équivalent cloud.
6.  Choix final React Native/Expo ou natif selon besoins.
7.  Stratégie de recherche avancée.
8.  Opérateur partenaire et protocole d'intégration.
9.  Politique de conservation des payloads et historiques selon
    licences.
10. SLA, RTO et RPO cibles.

## 18. Definition of Done technique

-   Code revu et tests requis réussis.
-   Contrat API documenté et rétrocompatible ou versionné.
-   Observabilité et alertes ajoutées.
-   Gestion des erreurs et états de chargement.
-   Sécurité et permissions validées.
-   Migrations et rollback documentés.
-   Traductions et accessibilité vérifiées.
-   Données sources et droits d'utilisation confirmés.
-   Contrôles pays validés pour toute fonctionnalité de pari.
-   Runbook et documentation mis à jour.
