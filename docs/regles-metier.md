# TURF PRO — Règles métier et corrections du prototype

Version : 1.0 — 20 novembre 2026

## 1. Positionnement du produit

TURF PRO est une plateforme de publication et de vente de pronostics hippiques. L'utilisateur paie pour consulter des analyses et sélections préparées par l'équipe TURF PRO. **L'application ne reçoit pas de mises, ne crée pas de tickets de pari et ne reverse pas de gains de jeux.** Les termes « formule » et « ticket » dans l'interface désignent des formats de pronostics, pas des paris exécutés par TURF PRO.

## 2. Offres et tarifs repris du prototype

| Offre | Prix constaté dans `index.html` | Droit accordé |
|---|---:|---|
| Base gratuite | 0 FCFA | Deux chevaux et analyse publique de la course |
| 1 Couplé | 500 FCFA par combinaison | Pronostic Couplé de la course achetée |
| Trio désordre | 2 500 FCFA | Sélection Trio sans ordre de la course achetée |
| Trio ordre | 8 000 FCFA | Sélection Trio dans l'ordre de la course achetée |
| Quinté 7 chevaux | 5 000 FCFA | Sélection de sept chevaux de la course achetée |
| Pass VIP 24 h | 10 000 FCFA | Accès aux contenus VIP pendant 24 heures |
| Pass VIP 7 jours | 34 680 FCFA | Accès aux contenus VIP pendant 7 jours |

Pour le Couplé, le prototype prévoit de 1 à 20 combinaisons à 500 FCFA chacune. Le prix total est donc `nombre de combinaisons × 500 FCFA`.

**À confirmer avant commercialisation :** un montant de 80 000 FCFA apparaît dans une transaction de démonstration appelée « Pass VIP Mois », mais aucune offre mensuelle sélectionnable n'a été repérée dans le formulaire de paiement examiné. Elle n'est donc pas considérée comme une offre active dans cette version.

## 3. Règles d'accès

1. Tout visiteur peut consulter le programme public, les informations de course et la base gratuite de deux chevaux.
2. Un achat à la carte est rattaché à un utilisateur, une course et un produit précis.
3. L'achat d'un Couplé ne donne accès ni au Trio, ni au Quinté, ni aux autres pronostics VIP.
4. L'achat d'un Trio désordre ne donne pas accès au Trio ordre.
5. Le Pass VIP est un droit global limité dans le temps. Il ouvre les contenus VIP prévus par l'offre pendant sa période de validité.
6. L'expiration du Pass VIP ferme automatiquement l'accès VIP. Les achats à la carte déjà payés restent disponibles dans l'historique du compte, selon la politique de conservation retenue.
7. Un achat ne peut être débloqué qu'après confirmation serveur du paiement. Un retour navigateur ou une simple redirection vers la page de succès ne constitue pas une preuve de paiement.
8. L'utilisateur doit pouvoir retrouver ses achats, leurs courses, leurs dates et leurs références de transaction.
9. Une course terminée peut afficher publiquement son résultat officiel et un bilan de performance. La décision de rendre aussi publics les pronostics VIP historiques doit être confirmée par le propriétaire du produit. Le prototype initial les rendait visibles après clôture sur l'écran du programme.

## 4. Règles de paiement

- Le serveur crée une commande avec un identifiant unique, l'utilisateur, le produit, la course éventuelle, le montant et la devise FCFA.
- Le serveur initialise la transaction auprès du prestataire de paiement configuré.
- Le serveur vérifie la notification (webhook) du prestataire : signature, référence, montant, devise, statut et correspondance avec la commande.
- Le webhook doit être idempotent : un même événement reçu plusieurs fois ne doit jamais créer plusieurs droits ni plusieurs écritures comptables.
- Seule une transaction confirmée peut produire un droit d'accès.
- Les états recommandés sont `PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `REFUNDED`.
- Les secrets du prestataire ne doivent jamais être placés dans le HTML ou le JavaScript du navigateur.
- Ne jamais collecter ni stocker le numéro complet de carte bancaire dans TURF PRO. La saisie et la tokenisation de carte doivent être déléguées à une page ou un composant sécurisé du prestataire.

## 5. Données principales à prévoir

- `users` : compte, téléphone/email, statut, date de création.
- `races` : date, réunion, hippodrome, intitulé, heure, discipline, distance, partants, statut.
- `tips` : course, type de contenu, sélection, analyse, statut de publication, date de publication.
- `products` : code, libellé, prix, devise, durée éventuelle, état actif.
- `orders` : utilisateur, course, produit, montant, statut, référence unique.
- `payments` : commande, prestataire, référence externe, statut, montant, devise, horodatages, données de vérification non sensibles.
- `entitlements` : utilisateur, type de droit, course éventuelle, produit éventuel, début et fin de validité, commande source.
- `audit_logs` : actions administratives et changements sensibles.

Contrainte d'unicité recommandée : un droit d'achat à la carte par commande validée ; un webhook prestataire ne peut être traité qu'une fois par identifiant d'événement.

## 6. Règles d'administration

- L'administrateur authentifié peut créer et modifier les courses, saisir les pronostics et programmer leur publication.
- Les pronostics payants doivent rester masqués dans les réponses API publiques tant que l'utilisateur ne possède pas le droit correspondant.
- Les résultats officiels doivent être saisis ou importés depuis une source vérifiable, puis horodatés. Le système ne doit pas fabriquer automatiquement de courses, de pronostics ou de résultats aléatoires en production.
- Toute modification d'un pronostic déjà publié doit être journalisée avec l'auteur, l'heure et l'ancienne/nouvelle valeur.
- Les statistiques de réussite doivent avoir une méthode de calcul explicite et être vérifiables. Ne pas afficher un taux de réussite fictif.

## 7. Corrections apportées au fichier HTML fourni

Le fichier `TURF_PRO_prototype_corrige.html` est une correction de démonstration côté navigateur :

- séparation entre achats à la carte par course et Pass VIP temporisé ;
- un achat à la carte est associé à l'identifiant de la course et au code du produit ;
- les contenus achetés sont affichés dans un bloc dédié à la course ;
- le Pass VIP possède une date d'expiration (24 h ou 7 jours) au lieu d'un booléen permanent `isVip` ;
- les boutons de paiement et le bandeau indiquent explicitement que le paiement est simulé ;
- suppression de l'affirmation trompeuse selon laquelle un achat quelconque déverrouillerait tous les pronostics de toutes les courses.

### Limites importantes de cette correction

Ce HTML reste un prototype autonome : les achats et droits sont conservés uniquement en mémoire JavaScript et disparaissent au rechargement. Le « paiement accepté » est une simulation avec temporisation ; aucun débit FedaPay n'est effectué. Le code client ne peut pas protéger réellement les pronostics, car les sélections sont encore présentes dans le JavaScript livré au navigateur. Il faut déplacer les données privées, les règles d'accès et la confirmation de paiement vers un backend avant toute mise en ligne commerciale.

## 8. Critères d'acceptation prioritaires

- Un utilisateur gratuit voit seulement la base gratuite.
- Après achat Couplé pour la course A, il voit le Couplé de A, mais pas les autres produits ni les pronostics VIP de A ou B.
- Après achat Trio désordre pour A, seul le Trio désordre de A est débloqué.
- Un Pass VIP 24 h ouvre les contenus VIP autorisés et expire exactement 24 heures après son activation serveur.
- Un Pass VIP 7 jours expire exactement 7 jours après son activation serveur.
- Une transaction échouée, annulée ou en attente ne donne aucun droit.
- Un webhook répété ne crée ni double transaction comptable ni prolongation injustifiée de droits.
- Un utilisateur ne peut jamais consulter les contenus d'un autre utilisateur en modifiant un identifiant dans l'URL ou une requête API.
- Les données des pronostics payants ne sont jamais envoyées au navigateur avant vérification des droits.

## 9. Prochaine étape technique recommandée

Construire le backend et la base de données avant de connecter le vrai paiement : API d'authentification, API des courses, API des offres, création de commandes, webhooks du prestataire, service d'autorisations et journal d'audit. Le HTML corrigé sert à valider le parcours et l'interface, pas à encaisser de vrais paiements.
