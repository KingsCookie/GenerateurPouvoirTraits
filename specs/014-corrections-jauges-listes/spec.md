# Feature Specification: Corrections UI — listes mobiles, bulles de saisie extensibles, jauges P/M à états extrêmes

**Feature Branch**: `014-corrections-jauges-listes`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "cette feature est globalement des bugfix… (1) date de naissance complète dans la liste Population mobile ; (2) liste Sandbox identique à Population + bulle « ⋯ » ; (3) bulles de saisie manuelle extensibles ; (desktop) jauges P/M dans la fiche comme sur mobile ; (les deux versions) nouveau design de jauges selon `rsrc/jauges-etats-extremes.md`. Version → v0.13.2."

## Contexte & cadrage

Lot de corrections d'interface (pas une vraie fonctionnalité métier). **Portée UI uniquement**
(`src/ui`) : aucun impact sur `src/core`, sur le modèle de données, ni sur le déterminisme.
La montée de version se limite au **dernier chiffre : v0.13.1 → v0.13.2**.

> **Dérogation explicitement demandée à la règle « desktop inchangé » de la feature 013** :
> l'utilisateur demande **volontairement** un changement du rendu desktop, limité aux **cartes de
> pouvoir de la fiche** (ajout des jauges P/M). Tout autre écran desktop reste strictement inchangé.

## Clarifications

### Session 2026-08-06

- Q: Comportement du tap sur le corps d'une ligne Sandbox (mobile, hors mode reproduction) → A: Aucune navigation ; toutes les actions passent par « ⋯ ». La parité avec Population porte sur l'**affichage** ; le « ⋯ » est le canal d'action.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jauges Puissance/Maîtrise à états extrêmes, sur mobile ET desktop (Priority: P1)

Dans la fiche d'un individu, les jauges Puissance et Maîtrise adoptent un nouveau design à trois
états visuels et sont désormais présentes **aussi bien sur mobile que sur ordinateur**, avec les
mêmes effets. Une valeur normale (`0 ≤ v ≤ 10`) s'affiche comme aujourd'hui ; une valeur en
surcharge (`v > 10`) affiche une barre pleine animée (bandes qui défilent + onde) ; une valeur
négative (`v < 0`) affiche un rail **rompu** en deux tronçons, sans remplissage. La valeur numérique
réelle reste toujours lisible, sans plafonnement.

**Why this priority**: c'est le changement le plus visible, explicitement demandé « pour les deux
versions », et il factorise un composant partagé consommé par les deux autres écrans de fiche.
C'est la fondation logique du lot.

**Independent Test**: ouvrir une fiche sur desktop **et** sur mobile ; vérifier les trois états avec
des valeurs `5`, `11`/`17`, `-1`, `0`, `10`, et confirmer que le rendu et les effets sont identiques
sur les deux plateformes.

**Acceptance Scenarios**:

1. **Given** un pouvoir de valeur `5`, **When** j'ouvre la fiche (mobile ou desktop), **Then** la
   jauge est en état **normal** (rendu actuel), sans animation ajoutée.
2. **Given** une valeur `11` puis `17`, **When** j'affiche la jauge, **Then** elle est **pleine**
   (remplissage 100 %), avec bandes animées + onde, **aucune** bande ne dépasse le bord droit du
   rail à aucune frame, et seule la valeur numérique diffère entre `11` et `17`.
3. **Given** une valeur `-1`, **When** j'affiche la jauge, **Then** le rail est **rompu** en deux
   tronçons, **aucun** pixel de remplissage, **aucune** animation.
4. **Given** une valeur `0`, **When** j'affiche la jauge, **Then** elle est en état **normal** (barre
   vide, rail intact) et **ne bascule pas** en état rompu.
5. **Given** une valeur `10`, **When** j'affiche la jauge, **Then** elle est en état **normal**
   (barre pleine) et **ne bascule pas** en surcharge.
6. **Given** n'importe quel état, **When** je compare la hauteur de ligne du composant, **Then** elle
   est **identique** dans les trois états (aucun saut de mise en page au changement d'état).
7. **Given** `prefers-reduced-motion: reduce`, **When** une jauge est en surcharge, **Then**
   **aucune** animation ne tourne, l'état restant distinguable (bandes statiques + couleur/valeur).
8. **Given** la version desktop **avant** ce lot, **When** je compare, **Then** le seul changement
   desktop est l'apparition des jauges dans les cartes de pouvoir de la fiche (aucun autre écran
   modifié).

---

### User Story 2 - Date de naissance complète dans la liste Population (mobile) (Priority: P2)

Sur mobile, dans l'onglet Population, chaque ligne d'individu affiche la **date de naissance
complète** (jour/mois/année selon le format déjà utilisé ailleurs dans l'application) au lieu de la
seule année actuellement montrée.

**Why this priority**: correction de lisibilité simple et à forte valeur ; prérequis d'affichage
pour l'US3 (parité Sandbox).

**Independent Test**: à 390 × 844 px, ouvrir l'onglet Population et vérifier que chaque ligne montre
la date de naissance complète, cohérente avec la date affichée dans la fiche de l'individu.

**Acceptance Scenarios**:

1. **Given** la liste Population sur mobile, **When** elle s'affiche, **Then** la méta de chaque
   ligne contient la **date de naissance complète** (et non l'année seule).
2. **Given** une ligne d'individu, **When** je compare la date de la ligne et celle de sa fiche,
   **Then** elles sont **identiques** (même format).
3. **Given** la liste sur desktop (≥ 760 px), **When** elle s'affiche, **Then** son rendu reste
   **inchangé** (la colonne date de naissance existante est déjà complète).

---

### User Story 3 - Liste Sandbox alignée sur la liste Population (mobile) + actions « ⋯ » (Priority: P2)

Sur mobile, l'affichage des individus dans la Sandbox devient **identique** à celui de l'onglet
Population (mêmes informations : nom + `†` si décédé, date de naissance complète, âge, espèce,
génération, puces de pouvoirs `P/M`), à une différence près : chaque ligne porte **en plus** le
bouton « ⋯ » ouvrant la feuille d'actions (Éditer / Cloner / Régénérer / Supprimer). Le mode
reproduction manuelle conserve son comportement de sélection existant.

**Why this priority**: cohérence d'expérience entre les deux listes ; dépend du format de ligne
finalisé en US2.

**Independent Test**: à 390 × 844 px, comparer une ligne Population et une ligne Sandbox du même type
d'individu : mêmes champs et même disposition, la ligne Sandbox ayant en plus « ⋯ » ; ouvrir « ⋯ »
et retrouver les 4 actions existantes.

**Acceptance Scenarios**:

1. **Given** la liste Sandbox sur mobile hors mode reproduction, **When** elle s'affiche, **Then**
   chaque ligne présente les **mêmes informations** que la ligne Population (dont la **date de
   naissance complète** et les **puces de pouvoirs**) **plus** un bouton « ⋯ ».
2. **Given** une ligne Sandbox, **When** j'active « ⋯ », **Then** la feuille d'actions existante
   (Éditer / Cloner / Régénérer / Supprimer) s'ouvre, inchangée.
3. **Given** une ligne Sandbox hors mode reproduction, **When** je tape sur le **corps** de la ligne
   (hors « ⋯ »), **Then** **rien** ne se produit (aucune navigation) ; l'action passe par « ⋯ ».
4. **Given** le **mode reproduction manuelle**, **When** il est actif, **Then** la sélection par
   cases à cocher et le marquage de la ligne sélectionnée restent **inchangés**.
5. **Given** la Sandbox sur desktop (≥ 760 px), **When** elle s'affiche, **Then** son rendu reste
   **inchangé**.

---

### User Story 4 - Bulles de saisie manuelle extensibles (mobile) (Priority: P3)

Sur mobile, lorsqu'un champ de saisie numérique compact n'affiche que ~2 caractères (typiquement la
bulle « Avancer » de l'onglet Population), le champ **s'élargit** pour accueillir davantage de
caractères au fur et à mesure de la frappe, jusqu'à une **taille maximale** qui ne casse pas la mise
en page (p. ex. pour « Avancer », tant que « an XXX », le `−`, la bulle, le `+` et le bouton
« Avancer » tiennent **sur une même ligne**).

**Why this priority**: confort de saisie ; impact limité et localisé, donc traité en dernier.

**Independent Test**: sur mobile, saisir un nombre à 3–4 chiffres dans la bulle « Avancer » ; le
champ s'élargit pour tout montrer, sans jamais faire passer les éléments de la barre à la ligne ni
provoquer de défilement horizontal.

**Acceptance Scenarios**:

1. **Given** la bulle « Avancer » vide, **When** je tape 1 chiffre, **Then** le champ conserve sa
   taille minimale (≥ 2 caractères visibles).
2. **Given** la bulle « Avancer », **When** je tape 3 ou 4 chiffres, **Then** le champ **s'élargit**
   pour montrer tous les caractères saisis.
3. **Given** une saisie très longue, **When** elle atteint la largeur maximale, **Then** le champ
   **cesse de grandir** et tous les éléments de la barre (« an XXX », `−`, champ, `+`, « Avancer »)
   restent **sur une seule ligne**, sans débordement horizontal de la page.
4. **Given** le desktop (≥ 760 px), **When** j'utilise le même champ, **Then** son comportement reste
   **inchangé**.

---

### Edge Cases

- **Jauge à `v = 0`** : état normal (rail intact, barre vide), surtout **pas** rompu.
- **Jauge à `v = 10`** : état normal (barre pleine), surtout **pas** surchargé.
- **Surcharge à amplitude variable** (`11`, `17`, `100`) : animation identique ; seule la valeur
  numérique change ; jamais de largeur de remplissage > 100 %.
- **Extrémité droite du rail en surcharge** : visuellement continue, sans segment terminal distinct
  ni clignotement.
- **Individu sans pouvoir** : aucune jauge affichée (comportement actuel conservé).
- **Bulle de saisie** : valeur négative / vide → le champ ne descend jamais sous sa taille minimale ;
  aucune valeur n'est tronquée visuellement tant que la largeur maximale n'est pas atteinte.
- **Ligne Sandbox d'un individu décédé** : le `†` apparaît comme dans Population.

## Requirements *(mandatory)*

### Functional Requirements

**Jauges P/M (US1)**

- **FR-001**: La fiche d'un individu DOIT afficher les jauges Puissance et Maîtrise via un **composant
  de jauge unique** partagé, produisant un rendu et des effets **identiques sur mobile et desktop**.
- **FR-002**: Le composant DOIT dériver son état d'une valeur `v` selon exactement trois cas :
  `v < 0` → **rompu** (rail cassé en deux tronçons, aucun remplissage) ; `0 ≤ v ≤ 10` → **normal**
  (rendu actuel) ; `v > 10` → **surchargé** (remplissage à 100 % + bandes animées + onde). Les états
  ne se cumulent jamais.
- **FR-003**: En état surchargé, le remplissage DOIT rester à **100 %** ; le dépassement est porté
  par l'animation et la valeur numérique, **jamais** par une largeur > 100 % ; aucune bande ne DOIT
  déborder du rail à aucune frame.
- **FR-004**: La **valeur numérique réelle** DOIT toujours être affichée sans plafonnement (ex. `17`,
  `-3`), avec un marquage couleur distinct pour rompu (couleur d'alerte) et surchargé (accent clair),
  mappés sur des **tokens existants** (aucun nouveau token de couleur global).
- **FR-005**: Le composant DOIT exposer une sémantique accessible (`role="meter"`, `aria-valuenow`
  reflétant la valeur réelle, `aria-valuemin`/`aria-valuemax` et un `aria-label` explicite indiquant
  l'état extrême le cas échéant). Les états DOIVENT être portés par une **classe** (testable), pas par
  du style inline conditionnel.
- **FR-006**: La **hauteur de ligne** du composant DOIT être identique dans les trois états (aucun
  saut de mise en page au changement d'état).
- **FR-007**: Avec `prefers-reduced-motion: reduce`, **aucune** animation ne DOIT tourner ; l'état
  surchargé DOIT rester distinguable (bandes statiques + couleur + valeur).
- **FR-008**: La fonction de dérivation d'état (`valeur → rompu | normal | surchargé`) DOIT être
  **pure** et couverte par des tests unitaires aux bornes `-1, 0, 10, 11`.
- **FR-009**: Sur desktop, les cartes de pouvoir de la fiche DOIVENT afficher ces jauges (en
  remplacement de l'actuel texte « Puissance : X / 10 / Maîtrise : X / 10 ») ; **aucun autre écran
  desktop** ne DOIT changer.

**Liste Population mobile (US2)**

- **FR-010**: Sous 760 px, chaque ligne de la liste Population DOIT afficher la **date de naissance
  complète** (même format que celui déjà utilisé dans la fiche), au lieu de l'année seule.
- **FR-011**: Le rendu de la liste Population sur desktop (≥ 760 px) DOIT rester **inchangé**.

**Liste Sandbox mobile (US3)**

- **FR-012**: Sous 760 px, les lignes de la Sandbox (hors mode reproduction) DOIVENT présenter
  **exactement les mêmes informations et la même disposition** que les lignes Population (nom + `†`
  si décédé, date de naissance complète, âge, espèce, génération, puces de pouvoirs `P/M`).
- **FR-013**: Chaque ligne Sandbox DOIT porter **en plus** le bouton « ⋯ » ouvrant la feuille
  d'actions existante (Éditer / Cloner / Régénérer / Supprimer), inchangée.
- **FR-014**: Hors mode reproduction, un tap sur le **corps** d'une ligne Sandbox NE DOIT déclencher
  **aucune navigation** (pas de fiche) ; l'action passe exclusivement par « ⋯ ». Le **mode
  reproduction manuelle** DOIT conserver son comportement actuel (cases à cocher, marquage de
  sélection).
- **FR-015**: Le rendu de la Sandbox sur desktop (≥ 760 px) DOIT rester **inchangé**.

**Bulles de saisie (US4)**

- **FR-016**: Sous 760 px, un champ de saisie numérique compact concerné DOIT **s'élargir** avec la
  longueur du contenu, à partir d'une largeur minimale (≥ 2 caractères) jusqu'à une **largeur
  maximale** définie de sorte que les éléments voisins de la barre restent **sur une seule ligne**
  (cas de référence : « an XXX », `−`, champ, `+`, « Avancer »).
- **FR-017**: Au-delà de la largeur maximale, le champ DOIT cesser de grandir sans provoquer de
  **débordement horizontal** de la page ni de passage à la ligne des éléments de la barre.
- **FR-018**: Le comportement de ce champ sur desktop (≥ 760 px) DOIT rester **inchangé**.

**Transverses**

- **FR-019**: Toutes les modifications DOIVENT rester dans `src/ui` ; `src/core`, le modèle de
  données, le PRNG et le déterminisme NE DOIVENT PAS être touchés.
- **FR-020**: Les couleurs, polices, rayons et graisses DOIVENT provenir **uniquement** des tokens
  existants (`src/app.css`) ; aucune valeur codée en dur ; le fonctionnement des 3 axes de thème
  (mode × palette × style) reste préservé sur les jauges.
- **FR-021**: La version applicative DOIT passer de **v0.13.1 à v0.13.2** (seul le dernier chiffre
  change).

### Key Entities

*Aucune nouvelle entité de données.* La feature introduit un **état de présentation** dérivé
(rompu / normal / surchargé) calculé à partir de la valeur numérique d'un pouvoir ; il n'est pas
persisté et n'entre pas dans les formats d'export/import.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur les deux plateformes, une jauge affiche correctement les trois états pour les
  valeurs de contrôle `-1, 0, 5, 10, 11, 17` (barre rompue / normale / pleine animée), la valeur
  numérique réelle restant toujours visible.
- **SC-002**: Aucune bande de l'état surchargé n'est visible au-delà du bord droit du rail, à
  n'importe quelle frame et sur n'importe quelle largeur d'écran.
- **SC-003**: La hauteur de ligne d'une jauge est identique dans les trois états (aucun décalage des
  lignes voisines au changement d'état).
- **SC-004**: Avec `prefers-reduced-motion: reduce`, aucune animation de jauge ne tourne.
- **SC-005**: À 390 × 844 px, chaque ligne Population affiche la date de naissance complète,
  identique à celle de la fiche de l'individu.
- **SC-006**: À 390 × 844 px, une ligne Sandbox (hors reproduction) présente les mêmes champs qu'une
  ligne Population plus le bouton « ⋯ » ; les 4 actions restent accessibles.
- **SC-007**: À 390 × 844 px, la bulle « Avancer » montre l'intégralité d'une saisie à 3–4 chiffres
  sans faire passer les éléments de la barre à la ligne ni provoquer de défilement horizontal.
- **SC-008**: Sur desktop (≥ 760 px), les seuls changements visibles par rapport à la v0.13.1 sont
  les jauges P/M dans les cartes de pouvoir de la fiche ; tous les autres écrans sont identiques.
- **SC-009**: `npm run test` (dont les tests de la fonction de dérivation d'état) et `npm run lint`
  passent ; le pied de page affiche **v0.13.2**.

## Assumptions

- **Format de date** : la « date complète » réutilise le format déjà employé dans la fiche/la table
  desktop (aucun nouveau format n'est introduit).
- **Sandbox — interaction de ligne** *(tranché en clarification 2026-08-06, option A)* : l'US3 porte
  sur l'**affichage** ; le tap sur le corps d'une ligne Sandbox **n'ouvre rien** et l'interaction
  passe exclusivement par « ⋯ ».
- **Champs concernés par l'US4** : la bulle « Avancer » de l'onglet Population est le cas explicite ;
  les autres champs numériques compacts mobiles présentant le même défaut de troncature peuvent
  adopter le même comportement, sans changement de mise en page.
- **Jauges = mêmes tokens** : les repères de couleur du document de référence
  (`rsrc/jauges-etats-extremes.md`) sont **remappés** sur la palette existante ; aucune couleur brute
  n'est introduite.
- **Dérogation desktop** : l'ajout des jauges dans la fiche desktop est un changement **voulu** ; il
  n'entre pas en conflit avec la règle « desktop inchangé » de la feature 013, qui reste valable pour
  tous les autres écrans.
- **Ordre de réalisation recommandé** (détaillé en `/speckit-plan` puis `/speckit-tasks`) :
  (1) composant de jauge partagé + fonction d'état + tests → (2) intégration fiche mobile **et**
  desktop → (3) date complète Population mobile → (4) parité Sandbox + « ⋯ » → (5) bulles de saisie
  extensibles. L'ordre suit les priorités P1 → P4.

## Dependencies

- Document de référence de conception : `rsrc/jauges-etats-extremes.md` (règles d'état, CSS de
  référence à remapper, critères d'acceptation, accessibilité).
- Réutilise le format de ligne mobile existant de la liste Population (feature 013) et la feuille
  d'actions Sandbox (« ⋯ ») déjà en place.
