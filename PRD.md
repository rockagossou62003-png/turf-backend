# PRD --- Product Requirements Document

## PMU Racing App

**Version:** 1.0.0\
**Statut:** Draft à valider\
**Plateformes:** Web, iOS, Android\
**Marché:** International, lancement progressif par pays\
**Produit:** Information hippique, statistiques, pronostics, simulation
et accès conditionnel aux paris via opérateur agréé.

------------------------------------------------------------------------

## 1. Résumé exécutif

PMU Racing App est une plateforme destinée aux passionnés de courses
hippiques. Elle centralise les programmes, partants, profils des
chevaux, performances, cotes autorisées, analyses, pronostics et
résultats. Elle propose également un constructeur de sélections et un
mode de simulation.

Dans les territoires où les paris en ligne sont autorisés et où un
opérateur agréé est intégré, l'utilisateur peut accéder à un parcours de
pari réel géré par cet opérateur. L'application doit appliquer une
politique d'activation pays par pays et ne pas exploiter elle-même des
paris ou des fonds sans licences et autorisations nécessaires.

## 2. Problème et opportunité

Les informations hippiques sont souvent dispersées entre calendriers,
fiches de chevaux, cotes, analyses et résultats. Les utilisateurs ont
besoin d'une expérience cohérente, fiable, compréhensible sur mobile et
transparente sur la provenance des données.

L'opportunité est de fournir un produit multi-pays moderne, localisé et
fiable, tout en séparant clairement information, opinion, simulation et
transaction réglementée.

## 3. Objectifs et non-objectifs

### 3.1 Objectifs

-   Rendre les programmes et résultats faciles à trouver.
-   Donner une vue complète d'une course et de ses partants.
-   Présenter l'historique et les statistiques avec contexte et
    provenance.
-   Permettre de suivre des chevaux, réunions et courses.
-   Publier des pronostics transparents, datés et historisés.
-   Permettre de composer et sauvegarder des tickets simulés.
-   Préparer une intégration opérateur conforme, activable par marché.
-   Fournir une expérience cohérente sur Web, iOS et Android.

### 3.2 Non-objectifs du MVP

-   Opérer directement des paris ou détenir des fonds.
-   Garantir la précision d'un pronostic ou un gain.
-   Lancer tous les pays à la fois.
-   Remplacer les sources officielles ou les opérateurs.
-   Fournir des données dont les droits ne sont pas acquis.

## 4. Publics et personas

### Persona A --- Passionné de courses

Veut consulter rapidement le programme, les partants, les performances
et les résultats.

### Persona B --- Analyste / pronostiqueur

Veut comparer les performances, publier une sélection argumentée et
suivre ses résultats historiques.

### Persona C --- Utilisateur occasionnel

Veut comprendre les informations d'une course sans maîtriser le
vocabulaire hippique.

### Persona D --- Utilisateur de l'opérateur partenaire

Dans un marché autorisé, veut accéder au service de pari de l'opérateur
sans confusion sur l'entité qui accepte et règle le pari.

### Persona E --- Administrateur éditorial

Veut gérer contenus, pronostics, signalements et publications.

### Persona F --- Opérations / conformité

Veut suivre l'état des flux, les marchés autorisés, les alertes, les
audits et les incidents.

## 5. Proposition de valeur et expérience

-   Une page d'accueil centrée sur les prochaines réunions.
-   Des fiches de course lisibles avec statut : à venir, ouverte, en
    cours, terminée, annulée ou reportée.
-   Des fiches chevaux synthétiques mais riches.
-   Une présentation claire des cotes avec source et heure de mise à
    jour.
-   Des analyses différenciant données objectives et opinion.
-   Des favoris et alertes personnalisées.
-   Un mode simulation sans argent réel.
-   Un accès aux opérateurs uniquement lorsque le marché est activé et
    que les contrôles sont satisfaits.

## 6. Périmètre fonctionnel et exigences

Priorités : **P0** indispensable au MVP, **P1** important après MVP,
**P2** ultérieur.

### 6.1 Onboarding, compte et préférences

  -----------------------------------------------------------------------
  ID                Priorité          Exigence          Critère
                                                        d'acceptation
  ----------------- ----------------- ----------------- -----------------
  AUTH-01           P0                Consulter les     Les pages
                                      contenus publics  publiques sont
                                      sans compte       accessibles sans
                                                        inscription

  AUTH-02           P0                Créer un compte   L'adresse est
                                      par email ou      vérifiée avant
                                      méthode approuvée activation des
                                                        fonctions
                                                        personnalisées

  AUTH-03           P0                Se connecter et   Les sessions
                                      se déconnecter    peuvent être
                                                        révoquées

  AUTH-04           P0                Réinitialiser le  Un lien à durée
                                      mot de passe      limitée est
                                                        envoyé

  AUTH-05           P0                Gérer langue,     Les horaires sont
                                      fuseau horaire et présentés dans le
                                      pays              fuseau choisi

  AUTH-06           P1                Gérer             L'utilisateur
                                      consentements et  peut consulter et
                                      préférences de    modifier ses
                                      notification      choix
  -----------------------------------------------------------------------

### 6.2 Calendrier et réunions

  -----------------------------------------------------------------------
  ID                Priorité          Exigence          Critère
                                                        d'acceptation
  ----------------- ----------------- ----------------- -----------------
  RACE-01           P0                Afficher les      Filtre par date
                                      réunions par date et pays
                                                        disponible

  RACE-02           P0                Afficher          Les champs
                                      hippodrome, pays  proviennent d'une
                                      et statut         source autorisée

  RACE-03           P0                Afficher les      Ordre et horaires
                                      courses d'une     cohérents avec la
                                      réunion           source

  RACE-04           P1                Rechercher et     Recherche
                                      filtrer les       tolérante aux
                                      réunions          variantes
                                                        raisonnables

  RACE-05           P1                Afficher les      Les changements
                                      changements de    importants sont
                                      programme         signalés et
                                                        horodatés
  -----------------------------------------------------------------------

### 6.3 Détail d'une course et partants

  -----------------------------------------------------------------------
  ID                Priorité          Exigence          Critère
                                                        d'acceptation
  ----------------- ----------------- ----------------- -----------------
  ENTRY-01          P0                Afficher numéro,  Les données sont
                                      nom, distance,    rattachées à
                                      discipline et     l'identifiant
                                      horaire           officiel

  ENTRY-02          P0                Afficher la liste Numéro, cheval,
                                      des partants      jockey et
                                                        entraîneur si
                                                        disponibles

  ENTRY-03          P0                Afficher les      Un non-partant
                                      non-partants et   est distingué
                                      changements       d'un partant

  ENTRY-04          P1                Afficher          Les unités et
                                      conditions et     devises sont
                                      allocation        explicites

  ENTRY-05          P1                Afficher les      Historique et
                                      changements de    heure de mise à
                                      jockey/poids      jour disponibles
  -----------------------------------------------------------------------

### 6.4 Fiche cheval

  -----------------------------------------------------------------------
  ID                Priorité          Exigence          Critère
                                                        d'acceptation
  ----------------- ----------------- ----------------- -----------------
  HORSE-01          P0                Afficher identité Aucune donnée
                                      et attributs      inconnue n'est
                                      disponibles       inventée

  HORSE-02          P0                Afficher          Chaque
                                      performances      performance
                                      précédentes       renvoie à une
                                                        course

  HORSE-03          P1                Afficher          Période et
                                      statistiques      méthode de calcul
                                      agrégées          visibles

  HORSE-04          P1                Suivre un cheval  Favori
                                      en favori         synchronisé entre
                                                        appareils
                                                        connectés
  -----------------------------------------------------------------------

### 6.5 Cotes et marchés

  -----------------------------------------------------------------------
  ID                Priorité          Exigence          Critère
                                                        d'acceptation
  ----------------- ----------------- ----------------- -----------------
  ODDS-01           P0                Afficher les      Source et
                                      cotes autorisées  horodatage
                                      disponibles       visibles

  ODDS-02           P0                Indiquer cote     Le type de cote
                                      indicative ou     est explicite
                                      ferme             

  ODDS-03           P0                Ne pas afficher   Une donnée
                                      une cote périmée  dépassant le
                                      comme actuelle    seuil de
                                                        fraîcheur est
                                                        marquée périmée
                                                        ou masquée

  ODDS-04           P1                Afficher          L'historique
                                      l'évolution des   respecte les
                                      cotes             droits de
                                                        stockage et
                                                        d'affichage
  -----------------------------------------------------------------------

### 6.6 Pronostics et analyses

  -----------------------------------------------------------------------
  ID                Priorité          Exigence          Critère
                                                        d'acceptation
  ----------------- ----------------- ----------------- -----------------
  PRED-01           P0                Publier un        Auteur, date,
                                      pronostic daté    course et
                                                        sélection sont
                                                        enregistrés

  PRED-02           P0                Distinguer        Libellés visuels
                                      opinion et donnée explicites
                                      officielle        

  PRED-03           P0                Afficher un       Présent sur les
                                      avertissement de  écrans de
                                      non-garantie      pronostics

  PRED-04           P1                Historiser les    Les sélections
                                      pronostics        antérieures ne
                                      publiés           sont pas écrasées

  PRED-05           P1                Afficher le bilan Méthode de calcul
                                      historique        et période sont
                                                        précisées

  PRED-06           P2                Recommandations   Explicabilité et
                                      personnalisées    contrôles de
                                                        biais à définir
  -----------------------------------------------------------------------

### 6.7 Constructeur et simulation de tickets

  -----------------------------------------------------------------------
  ID                Priorité          Exigence          Critère
                                                        d'acceptation
  ----------------- ----------------- ----------------- -----------------
  SIM-01            P0                Sélectionner des  Sélections et
                                      chevaux dans une  exclusions sont
                                      course            visibles

  SIM-02            P0                Sauvegarder une   Le ticket porte
                                      simulation        le libellé «
                                                        simulation ---
                                                        sans valeur
                                                        monétaire »

  SIM-03            P0                Afficher une      Hypothèses, cote
                                      estimation        source et heure
                                      théorique si      sont affichées
                                      calculable        

  SIM-04            P1                Partager une      Le partage ne
                                      simulation        révèle pas de
                                                        données privées

  SIM-05            P1                Historique des    L'utilisateur
                                      simulations       peut consulter et
                                                        supprimer ses
                                                        simulations
  -----------------------------------------------------------------------

### 6.8 Résultats

  ---------------------------------------------------------------------------
  ID                Priorité          Exigence          Critère d'acceptation
  ----------------- ----------------- ----------------- ---------------------
  RES-01            P0                Afficher          Statut
                                      résultats         provisoire/officiel
                                      officiels         explicite
                                      disponibles       

  RES-02            P0                Afficher          Les statuts spéciaux
                                      classement et     sont représentés
                                      chevaux non       
                                      classés           

  RES-03            P0                Afficher rapports Source, devise et
                                      autorisés         unité sont affichées

  RES-04            P1                Historique par    Navigation vers les
                                      cheval et course  courses sources
  ---------------------------------------------------------------------------

### 6.9 Parcours de pari réel --- conditionnel

Ce module est **désactivé par défaut**. Il ne peut être activé qu'après
validation juridique, contrats de données et contrat d'intégration avec
un opérateur agréé dans le pays concerné.

  -----------------------------------------------------------------------
  ID                Priorité          Exigence          Critère
                                                        d'acceptation
  ----------------- ----------------- ----------------- -----------------
  BET-01            Gate              Vérifier marché   Le service refuse
                                      et opérateur      tout accès dans
                                      autorisés         un marché non
                                                        activé

  BET-02            Gate              Vérifier âge,     Aucun pari n'est
                                      identité et       initié sans
                                      éligibilité via   statut valide
                                      l'opérateur       

  BET-03            Gate              Transmettre la    L'utilisateur
                                      sélection à       voit clairement
                                      l'opérateur       l'opérateur
                                                        responsable

  BET-04            Gate              Recevoir un       Confirmation
                                      statut de         idempotente et
                                      transaction       traçable
                                      vérifiable        

  BET-05            Gate              Respecter         Les contrôles de
                                      limites,          l'opérateur
                                      auto-exclusion et priment et sont
                                      restrictions      testés

  BET-06            Gate              Afficher règles,  Conditions
                                      risques et        accessibles avant
                                      conditions        toute action
  -----------------------------------------------------------------------

Le produit ne doit pas collecter de fonds ou afficher un pari comme
accepté sur la seule base d'une redirection ou d'une réponse non
vérifiée.

### 6.10 Notifications

-   Départ imminent d'une course suivie.
-   Changement de partant ou de jockey, si le flux le fournit.
-   Résultat disponible.
-   Mise à jour d'un contenu suivi.
-   Notifications de service et de sécurité.

Les notifications marketing nécessitent un consentement approprié. Les
préférences doivent être modifiables.

### 6.11 Administration et opérations

-   Gestion des utilisateurs et rôles.
-   Gestion des contenus et pronostics.
-   Consultation de l'état des flux et des retards.
-   Rejeu contrôlé des événements de données.
-   Gestion du registre des pays et opérateurs autorisés.
-   Journal d'audit non modifiable par les utilisateurs ordinaires.
-   Modération et gestion des signalements.
-   Tableau de bord d'incidents et statistiques d'utilisation agrégées.

## 7. Parcours utilisateurs essentiels

### Parcours A --- Découvrir une course

Accueil → date → réunion → course → partants → fiche cheval /
performances.

### Parcours B --- Analyser une course

Course → performances → statistiques → pronostics → sélection
personnelle.

### Parcours C --- Simuler un ticket

Course → sélection de chevaux → aperçu → estimation théorique →
sauvegarde comme simulation.

### Parcours D --- Accéder à un opérateur

Sélection → vérification du pays et de l'éligibilité → transfert
sécurisé à l'opérateur → confirmation fournie par l'opérateur. Si une
condition échoue, afficher une explication et ne pas poursuivre.

### Parcours E --- Administrer un flux

Console → état du fournisseur → détail de l'incident → mise en
quarantaine/rejeu → validation → audit.

## 8. Règles métier

1.  Une réunion contient une ou plusieurs courses.
2.  Une course appartient à une réunion et possède un identifiant stable
    provenant du fournisseur ou un identifiant interne mappé.
3.  Un cheval peut participer à plusieurs courses ; une participation
    est une entité distincte.
4.  Les données externes conservent leur identifiant source et leur
    provenance.
5.  Les mises à jour ne doivent pas créer de doublons ; les traitements
    sont idempotents.
6.  Une course peut être reportée, annulée, suspendue ou terminée.
7.  Les partants peuvent changer jusqu'aux échéances définies par la
    source et les règles locales.
8.  Les pronostics sont immuables après publication ; une correction
    crée une nouvelle version horodatée.
9.  Une cote doit inclure le type, la source, la devise/unité si
    applicable et l'horodatage.
10. Une estimation de gain est indicative et n'est pas une promesse.
11. Une simulation n'est jamais un pari et ne déclenche aucune
    transaction.
12. Un parcours réel dépend d'un pays activé, d'un opérateur autorisé et
    de contrôles valides.
13. Les résultats provisoires et officiels sont distingués.
14. Toute correction de résultat conserve l'historique et la source de
    correction.

## 9. Internationalisation et localisation

-   Français et anglais au lancement ; autres langues ajoutables.
-   Fuseaux horaires IANA, stockage des timestamps en UTC.
-   Formats locaux de date, heure, nombre et devise.
-   Unités de distance et poids selon les données sources ; conversion
    seulement avec affichage de l'unité originale.
-   Contenus et conditions juridiques par pays.
-   Pays d'accès aux paris déterminé par les contrôles approuvés, pas
    seulement par la langue ou le pays déclaré dans le profil.
-   Accessibilité ciblée WCAG 2.2 AA pour le Web et bonnes pratiques
    natives mobiles.

## 10. Exigences non fonctionnelles

-   Disponibilité cible MVP : 99,5 % mensuelle, hors dépendances tierces
    planifiées.
-   Temps de réponse API p95 cible : inférieur à 500 ms pour les
    lectures internes courantes, hors fournisseur externe.
-   Chargement initial optimisé sur réseaux mobiles.
-   Tolérance aux interruptions des fournisseurs avec cache clairement
    daté.
-   Aucune donnée critique affichée comme actuelle si sa fraîcheur ne
    peut être garantie.
-   Chiffrement en transit et au repos.
-   Sauvegardes testées et restauration documentée.
-   Observabilité des flux, API, files et erreurs.
-   Journalisation respectueuse de la vie privée.

## 11. Indicateurs de succès

### Produit

-   Utilisateurs actifs hebdomadaires et mensuels.
-   Taux de consultation d'une fiche course après ouverture d'une
    réunion.
-   Taux d'ajout aux favoris.
-   Taux de retour sur 7 et 30 jours.
-   Utilisation des simulations.
-   Satisfaction et taux d'erreur perçu sur les données.

### Qualité des données

-   Taux de synchronisation réussie.
-   Latence source → disponibilité dans l'application.
-   Taux de doublons et incohérences.
-   Temps de résolution des incidents de flux.

### Conformité et confiance

-   Nombre d'accès de pari bloqués à juste titre dans des marchés non
    autorisés.
-   Couverture des contrôles requis.
-   Délai de traitement des demandes de confidentialité.
-   Incidents de sécurité et de conformité.

Les objectifs chiffrés définitifs seront établis après la phase pilote
et l'obtention des métriques de référence.

## 12. MVP et roadmap

### MVP --- Information et analyse

-   Authentification facultative pour la consultation publique.
-   Réunions, courses, partants et fiches chevaux.
-   Résultats et cotes sous licence.
-   Pronostics et statistiques.
-   Favoris et notifications essentielles.
-   Administration et supervision des flux.
-   Français/anglais, Web/iOS/Android.

### V1.1 --- Engagement

-   Recherche avancée.
-   Historique enrichi.
-   Simulations sauvegardées.
-   Notifications personnalisées.
-   Tableau de bord de performance des pronostics.

### V2 --- Intégration opérateur par marché

-   Revue juridique par pays.
-   Contrat opérateur et API homologuée.
-   KYC/âge/éligibilité et jeu responsable.
-   Tests de sécurité et de réconciliation.
-   Activation contrôlée par feature flag et registre de marchés.

## 13. Risques et mesures

  -----------------------------------------------------------------------
  Risque                              Mesure
  ----------------------------------- -----------------------------------
  Absence de droits sur les données   Bloquer l'intégration avant preuve
                                      de licence

  Retard ou panne du flux             Cache horodaté, alertes et
                                      affichage dégradé

  Erreur de résultat ou de cote       Provenance, historique, procédure
                                      de correction

  Réglementation différente selon     Registre pays, avis juridique
  pays                                local, activation progressive

  Confusion simulation/paris réels    Séparation UI, textes et systèmes

  Mauvais pronostic présenté comme    Avertissements, historique
  certain                             transparent, contrôle éditorial

  Fraude ou prise de compte           MFA selon risque, limitation,
                                      détection et audit
  -----------------------------------------------------------------------

## 14. Questions ouvertes bloquantes

-   Quel pays pilote en premier ?
-   Quel fournisseur détient les droits des programmes, partants, cotes
    et résultats ?
-   Quelles compétitions et disciplines sont couvertes ?
-   Quels opérateurs agréés seront partenaires, et dans quels pays ?
-   L'application sera-t-elle affiliée, marque blanche ou intégrée par
    API ?
-   Quel modèle économique est autorisé ?
-   Quelles langues sont requises au premier lancement ?
-   Quelles exigences de conservation et de résidence des données
    s'appliquent ?
