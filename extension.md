# PMU Racing App --- Extension & Project Master Specification

**Version:** 1.0.0\
**Statut:** Draft de référence --- à valider avant développement\
**Marché cible:** International\
**Plateformes:** Web, Android et iOS\
**Positionnement:** Application moderne d'information hippique,
d'analyse, de pronostics et de paris via opérateurs agréés lorsque la
réglementation le permet.

## 1. Objet du document

Ce document est le point d'entrée du projet. Il fixe la vision, les
principes, les limites du produit et les documents de référence. Il doit
être lu avant toute génération de code ou décision d'architecture.

Documents associés : - [`PRD.md`](./PRD.md) --- besoins produit,
utilisateurs, parcours, exigences fonctionnelles et critères
d'acceptation. - [`TRD.md`](./TRD.md) --- architecture, composants,
données, API, sécurité, exploitation et stratégie de tests.

En cas de divergence, les exigences réglementaires applicables et les
décisions de conformité validées prévalent. Toute modification
fonctionnelle ou technique doit être reflétée dans les documents
associés.

## 2. Vision produit

Créer une plateforme multi-pays qui aide les passionnés de courses
hippiques à : 1. découvrir les réunions et courses à venir ; 2.
consulter des données fiables sur les chevaux, jockeys, entraîneurs,
partants, cotes et résultats ; 3. analyser les performances et consulter
des pronostics clairement identifiés ; 4. construire et sauvegarder des
sélections ou tickets simulés ; 5. accéder, dans les pays et territoires
autorisés seulement, à un parcours de pari réel fourni par un opérateur
agréé et contractuellement intégré.

L'application ne doit jamais laisser croire qu'un pronostic garantit un
gain. Les données, cotes, horaires et résultats doivent afficher leur
provenance et leur heure de mise à jour lorsque cela est pertinent.

## 3. Périmètre produit

### Inclus dans le socle international

-   Web responsive et applications mobiles iOS/Android.
-   Langues initiales : français et anglais, architecture prête pour
    d'autres langues.
-   Gestion de fuseaux horaires, devises, formats régionaux et pays.
-   Comptes, préférences, favoris et notifications.
-   Calendrier des réunions, programmes, partants, fiches chevaux et
    historiques.
-   Cotes et résultats provenant de flux autorisés.
-   Statistiques, analyses et pronostics éditoriaux.
-   Constructeur de sélection et simulateur de ticket sans mise
    d'argent.
-   Console d'administration et supervision des flux.
-   Journal d'audit et outils de modération.
-   Parcours de jeu responsable et restrictions géographiques.

### Inclus sous conditions distinctes

-   Pari en argent réel uniquement via un opérateur légalement autorisé
    dans le territoire concerné.
-   Paiement, portefeuille, dépôt, retrait, règlement et gestion des
    fonds restent sous la responsabilité de l'opérateur, sauf
    autorisation et architecture contractuelle expressément validées.
-   Vérification d'identité, âge, sanctions, auto-exclusion, limites et
    contrôles AML/KYC selon les obligations locales.
-   Géolocalisation ou vérification de résidence uniquement selon la
    base légale, les règles du pays et le consentement requis.

### Exclus du MVP

-   Exploitation autonome d'un bookmaker ou d'un totalisateur.
-   Conservation directe de fonds clients.
-   Promesse de gains, pronostics garantis ou conseils financiers.
-   Scraping de sites sans autorisation contractuelle.
-   Contournement de géoblocage, d'auto-exclusion ou de contrôles d'âge.
-   Lancement simultané dans tous les pays sans revue juridique pays par
    pays.

## 4. Principes non négociables

1.  **Conformité par pays :** un registre de marchés autorisés contrôle
    l'accès aux fonctions de pari.
2.  **Source officielle :** aucun flux ne sera qualifié d'officiel sans
    contrat, licence ou autorisation documentée.
3.  **Séparation des domaines :** information/pronostics, simulation et
    pari réel sont séparés techniquement et visuellement.
4.  **Traçabilité :** chaque donnée critique conserve source,
    horodatage, statut et historique de correction.
5.  **Pas de pari en cas de doute :** données périmées, marché fermé,
    opérateur indisponible ou contrôle réglementaire incomplet
    entraînent un blocage sûr.
6.  **Protection des personnes :** âge minimum, jeu responsable,
    confidentialité et sécurité dès la conception.
7.  **Transparence éditoriale :** distinction visible entre fait
    officiel, statistique calculée, opinion et pronostic sponsorisé.
8.  **Accessibilité :** parcours essentiels utilisables au clavier et
    compatibles avec les lecteurs d'écran.

## 5. Hypothèses et décisions à confirmer

-   Fournisseur officiel des données hippiques non encore sélectionné.
-   Opérateur(s) de paris et pays de lancement non encore
    contractualisés.
-   Modèle commercial à préciser : affiliation, licence opérateur,
    abonnement premium, publicité autorisée ou combinaison conforme.
-   Technologies proposées dans le TRD à valider selon l'équipe, les
    compétences et les contraintes de l'opérateur.
-   Les règles de paris, types de pari, taxes, limites et exigences KYC
    varient par territoire.
-   Le terme « PMU » est utilisé ici pour décrire le domaine des courses
    hippiques ; toute utilisation de marque, logo, données ou contenus
    tiers nécessite les droits appropriés.

## 6. Architecture documentaire

### PRD.md

Le PRD constitue la référence pour : - objectifs et indicateurs produit
; - personas et parcours ; - exigences fonctionnelles et priorités ; -
règles métier ; - critères d'acceptation ; - périmètre MVP et roadmap.

### TRD.md

Le TRD constitue la référence pour : - architecture logique et
déploiement ; - choix technologiques ; - modèle de données ; - contrats
API et événements ; - intégration des fournisseurs ; - sécurité,
conformité technique, observabilité et tests.

## 7. Ordre de réalisation

**Étape 0 --- Validation juridique et fournisseurs** - Choisir un ou
plusieurs pays pilotes. - Obtenir les droits d'accès aux données
officielles. - Identifier les opérateurs agréés et leurs interfaces
d'intégration. - Faire valider les responsabilités contractuelles et
réglementaires.

**Étape 1 --- MVP informationnel** - Comptes et préférences. -
Calendrier, réunions, courses, partants et fiches chevaux. -
Cotes/résultats si les licences et flux le permettent. - Pronostics et
statistiques. - Favoris, notifications, console d'administration.

**Étape 2 --- Simulation** - Constructeur de sélections. - Simulation de
tickets et gains théoriques, explicitement non contractuels. -
Historique des simulations.

**Étape 3 --- Parcours opérateur** - Activation pays par pays. -
Redirection ou intégration contrôlée avec un opérateur agréé. - Tests de
conformité, sécurité, réconciliation et parcours de jeu responsable. -
Mise en production après approbations écrites.

## 8. Definition of Done globale

Une fonctionnalité est terminée lorsque : - les exigences du PRD sont
couvertes ; - les contrats API et règles de données sont documentés ; -
les tests automatisés et tests de sécurité pertinents passent ; - les
événements et erreurs sont observables ; - les textes, traductions et
états d'erreur sont fournis ; - les exigences d'accessibilité sont
vérifiées ; - la conformité pays est approuvée si la fonctionnalité
touche aux paris ; - la documentation et les procédures d'exploitation
sont mises à jour.

## 9. Gestion des changements

Toute demande de changement doit préciser : - le besoin utilisateur ou
métier ; - le pays ou les pays concernés ; - l'impact sur les données,
licences et contrats ; - l'impact sur sécurité, vie privée et jeu
responsable ; - les modifications du PRD/TRD ; - les tests et critères
de mise en production.

## 10. Glossaire

-   **Réunion :** ensemble de courses organisées sur un hippodrome à une
    date donnée.
-   **Course :** épreuve hippique identifiée dans une réunion.
-   **Partant :** cheval déclaré participant à une course.
-   **Cote :** valeur fournie par une source autorisée, susceptible
    d'évoluer.
-   **Pronostic :** opinion ou sélection éditoriale/statistique, non
    garantie.
-   **Ticket simulé :** représentation non monétaire d'une sélection.
-   **Opérateur agréé :** entité autorisée à proposer des paris dans un
    territoire donné.
-   **Flux officiel :** flux dont le droit d'utilisation est démontré
    par un accord valide.
