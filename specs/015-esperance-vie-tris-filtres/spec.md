# Feature Specification: Espérance de vie, cycle de vie, tris & filtres

**Feature Branch**: `015-esperance-vie-tris-filtres`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "5 features — (1) paramètres d'espèce espérance de vie + % mort naturelle/an, mort naturelle au tick, âge figé à la mort ; (2) fiche : boutons Ressusciter + case Immortel ; (3) tris puissance & maîtrise (cycle défaut/croissant/décroissant, pouvoir le plus extrême) ; (4) filtres né après X / né avant Y désactivant le filtre génération ; (5) indicateur de chargement pendant « avancer ». Cible v0.14.0. La source de vérité DescriptionProjet a déjà été mise à jour."

## Clarifications

### Session 2026-08-06

- Q: Comment l'âge évolue-t-il après résurrection ? → A: L'âge est un **compteur suivi**, gelé à la mort, repris à **+1/an** à partir de l'âge de décès aux ticks suivant la résurrection. Les années passées mort ne comptent pas ; la date de naissance (donc la tranche de génération) reste inchangée.
- Q: Les bornes des filtres « né après X » / « né avant Y » sont-elles inclusives ? → A: **Inclusives** — « né après X » = année de naissance **≥ X**, « né avant Y » = année de naissance **≤ Y** (l'intervalle [X, Y] contient X et Y).
- Q: Où sont classés les individus **sans pouvoir** dans les tris puissance/maîtrise ? → A: Toujours **en fin de liste**, quel que soit le sens du tri (croissant ou décroissant) ; entre eux, ordre par défaut habituel (stable).
- Q: L'indicateur de chargement doit-il être garanti visible pendant le calcul synchrone d'« avancer » ? → A: **Oui, garanti visible** — l'UI monte le spinner puis **cède une frame au navigateur** (tick asynchrone) avant de lancer le calcul synchrone ; contrat : visible du clic jusqu'à l'affichage de la nouvelle population.
- Q: Les nouveaux tris et filtres d'année (et plus largement les nouveautés de la feature) sont-ils présents sur mobile et desktop ? → A: **Toutes** les modifications de la feature (tris puissance/maîtrise, filtres né après/avant, boutons Ressusciter & case Immortel, indicateur de chargement) sont présentes **sur mobile ET desktop**, adaptées au style de chaque présentation (seuil 760px des features 013–014).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mort naturelle par espèce (Priority: P1)

En tant qu'utilisateur, quand j'avance le temps, je veux que les individus puissent mourir
naturellement de vieillesse selon des paramètres propres à leur espèce, afin d'obtenir une
population qui se renouvelle de façon réaliste.

Chaque espèce reçoit deux nouveaux paramètres avancés : une **espérance de vie** (âge à partir
duquel la mort naturelle devient possible) et un **% de mort naturelle par an** (testé à chaque
tick au-delà de cet âge). Pour l'espèce humain, les défauts sont **60 ans** et **10 %**. Quand un
individu meurt (naturellement), sa cause de décès est « mort naturelle », il **arrête de vieillir**
(son âge se fige à l'âge de sa mort) mais **reste dans sa tranche de génération**.

**Why this priority**: C'est le socle domaine de la feature ; les stories 2 (résurrection /
immortalité) et le renouvellement de population en dépendent. Sans elle, aucune des autres n'a de
sens fonctionnel.

**Independent Test**: Régler une espérance de vie et un % de mort élevés, avancer plusieurs années
à seed fixe, vérifier que des individus au-delà de l'espérance de vie meurent avec la cause « mort
naturelle », que leur âge cesse d'augmenter, et que leur tranche de génération reste inchangée.

**Acceptance Scenarios**:

1. **Given** une espèce humain (espérance 60 / 10 %) et un individu vivant de 62 ans non immortel,
   **When** j'avance d'une année, **Then** l'individu subit un tirage à 10 % de mourir de « mort
   naturelle ».
2. **Given** un individu de 40 ans (< espérance de vie), **When** j'avance d'une année, **Then** il
   n'est **jamais** soumis au tirage de mort naturelle.
3. **Given** un individu qui meurt à 63 ans en l'an N, **When** j'avance de 5 années
   supplémentaires, **Then** son âge affiché reste **63** et sa tranche de génération est identique
   à avant sa mort.
4. **Given** une seed fixe et des paramètres donnés, **When** j'avance du même nombre d'années deux
   fois, **Then** l'ensemble des morts naturelles est **identique** (déterminisme).

---

### User Story 2 - Résurrection & immortalité sur la fiche (Priority: P2)

En tant qu'utilisateur, depuis la fiche d'un individu, je veux pouvoir le **ressusciter** s'il est
décédé et marquer un individu comme **immortel**, afin de contrôler manuellement le cycle de vie.

La fiche présente les actions de cycle de vie : le bouton « **Tuer cet individu** » existant, en
dessous un bouton « **Ressusciter** » (actif seulement sur un décédé), et une case à cocher
« **Immortel** » (décochée par défaut). Un immortel ne peut pas mourir de mort naturelle (mais peut
être tué manuellement). Ressusciter ramène l'individu à la vie à **l'âge qu'il avait à sa mort**,
efface sa raison de décès, fait **reprendre le vieillissement**, et le rend de nouveau soumis au
tirage de mort naturelle dès le prochain tick — sauf s'il est immortel.

**Why this priority**: Complète le concept de mort (US1) avec le contrôle manuel. Dépend de
l'existence de l'état mort/vivant et du gel de l'âge introduits en US1.

**Independent Test**: Sur la fiche d'un décédé, cliquer « Ressusciter » et vérifier qu'il redevient
vivant à son âge figé, raison de décès effacée ; cocher « Immortel » et avancer le temps pour
vérifier qu'il ne meurt jamais naturellement.

**Acceptance Scenarios**:

1. **Given** un individu décédé (« mort naturelle », âge figé 63), **When** je clique
   « Ressusciter », **Then** il redevient vivant, âge 63, raison de décès effacée, et vieillit de
   nouveau aux ticks suivants.
2. **Given** un individu ressuscité non immortel âgé au-delà de l'espérance de vie, **When**
   j'avance d'une année, **Then** il est de nouveau soumis au tirage de mort naturelle.
3. **Given** un individu vivant avec « Immortel » coché, **When** j'avance de nombreuses années
   au-delà de son espérance de vie, **Then** il ne meurt **jamais** de mort naturelle.
4. **Given** un individu immortel, **When** je clique « Tuer cet individu » avec une cause, **Then**
   il meurt quand même (l'immortalité ne bloque que la mort naturelle).
5. **Given** un individu vivant, **When** j'ouvre sa fiche, **Then** le bouton « Ressusciter » est
   indisponible (il ne s'applique qu'aux décédés).

---

### User Story 3 - Tris par puissance et maîtrise (Priority: P3)

En tant qu'utilisateur, dans la liste des individus, je veux trier par **puissance** et par
**maîtrise**, afin de comparer les individus sur ces axes.

Deux nouveaux tris s'ajoutent aux tris existants (nom, date de naissance, âge). Un clic sur
l'en-tête **cycle** entre *tri par défaut → croissant → décroissant*, comme les autres tris. Pour un
individu à plusieurs pouvoirs, il est classé selon son pouvoir **le plus extrême dans le sens du
tri** : en croissant, selon son pouvoir de valeur **la plus basse** ; en décroissant, selon son
pouvoir de valeur **la plus haute**. Le tri par défaut reste l'ordre par défaut habituel.

**Why this priority**: Amélioration d'exploration UI indépendante du cycle de vie ; utile mais non
bloquante pour US1/US2.

**Independent Test**: Charger une population aux pouvoirs variés (dont des individus multi-pouvoirs),
cliquer sur le tri puissance et vérifier l'ordre croissant/décroissant selon la règle du pouvoir le
plus extrême, puis vérifier le retour à l'ordre par défaut au 3ᵉ clic.

**Acceptance Scenarios**:

1. **Given** la liste des individus, **When** je clique une fois sur le tri « puissance », **Then**
   la liste est triée par puissance **croissante**.
2. **Given** le tri puissance croissant actif, **When** je re-clique, **Then** il passe en
   **décroissant** ; **When** je re-clique encore, **Then** il revient au **tri par défaut**.
3. **Given** un individu à plusieurs pouvoirs (p. ex. puissances 2 et 9), **When** le tri est
   croissant, **Then** il est classé sur **2** ; **When** le tri est décroissant, **Then** il est
   classé sur **9**.
4. **Given** un tri maîtrise actif, **When** j'active un autre tri, **Then** le comportement de
   cycle et de sélection du pouvoir extrême s'applique identiquement à la maîtrise.

---

### User Story 4 - Filtres par année de naissance (Priority: P4)

En tant qu'utilisateur, je veux filtrer les individus par **année de naissance** (« né après X » et
« né avant Y »), afin d'affiner l'affichage plus finement que par tranches de génération.

Deux nouveaux filtres « né après X » et « né avant Y » (X, Y = années) s'ajoutent au filtre par
génération existant. Dès qu'au moins l'un des deux filtres d'année est actif, le **filtre par
génération est désactivé** (les deux systèmes sont exclusifs). Tant qu'aucun filtre d'année n'est
posé, les tranches de génération restent disponibles.

**Why this priority**: Amélioration d'exploration UI indépendante ; peut être livrée séparément.

**Independent Test**: Poser « né après 2000 » et vérifier que seuls les individus nés en 2000 ou
après s'affichent et que le filtre génération est désactivé ; retirer le filtre d'année et vérifier
que le filtre génération redevient utilisable.

**Acceptance Scenarios**:

1. **Given** une population, **When** je saisis « né après 2000 », **Then** seuls les individus nés
   après 2000 sont affichés et le contrôle de filtre par génération est désactivé.
2. **Given** « né après 2000 » et « né avant 2010 » actifs, **When** j'observe la liste, **Then**
   seuls les individus nés dans l'intervalle correspondant sont affichés.
3. **Given** un filtre d'année actif, **When** je vide les deux champs d'année, **Then** le filtre
   par génération redevient disponible et opérant.

---

### User Story 5 - Indicateur de chargement pendant « avancer » (Priority: P5)

En tant qu'utilisateur, quand je clique sur « avancer » et que le calcul prend du temps, je veux un
**indicateur de chargement** (une flèche circulaire en rotation), afin de savoir que le système
travaille.

L'indicateur s'affiche pendant le calcul (après le clic sur « avancer ») et **disparaît** dès que
les calculs sont terminés et que la nouvelle population générée s'affiche.

**Why this priority**: Retour visuel purement UI, sans impact domaine ; le moins critique.

**Independent Test**: Avancer d'un grand nombre d'années sur une population importante et observer
l'apparition de la flèche en rotation pendant le calcul, puis sa disparition à l'affichage de la
nouvelle population.

**Acceptance Scenarios**:

1. **Given** une population, **When** je clique sur « avancer », **Then** une flèche circulaire en
   rotation apparaît pendant le calcul.
2. **Given** le calcul en cours, **When** il se termine et la nouvelle population s'affiche,
   **Then** l'indicateur disparaît.

---

### Edge Cases

- **Espérance de vie = 0** : tout individu vivant non immortel est soumis au tirage dès sa
  naissance (comportement défini, pas une erreur).
- **% de mort naturelle = 0** : personne ne meurt naturellement même au-delà de l'espérance de vie.
- **% de mort naturelle = 100** : tout individu au-delà de l'espérance de vie meurt au prochain tick.
- **Ressusciter un individu déjà vivant** : action indisponible / sans effet.
- **Individu mort puis ressuscité** : ne rentre pas dans une autre tranche de génération (la
  génération dépend de l'année de naissance, invariante).
- **Tri puissance/maîtrise sur un individu sans pouvoir** : classé **en fin de liste** quel que soit
  le sens du tri, ordre relatif stable (ordre par défaut).
- **« né après X » avec X > « né avant Y »** (intervalle vide) : liste vide, pas d'erreur.
- **Année de naissance saisie invalide / vide** : filtre inactif pour le champ vide.
- **Immortel coché sur un individu déjà mort de mort naturelle** : n'est pas ressuscité
  automatiquement ; l'immortalité n'agit qu'à partir du moment où il est vivant.

## Requirements *(mandatory)*

### Functional Requirements

**US1 — Mort naturelle par espèce**

- **FR-001**: Chaque espèce MUST exposer, dans ses paramètres avancés, une **espérance de vie**
  (âge entier, en années) et un **% de mort naturelle par an**.
- **FR-002**: L'espèce **humain** MUST avoir par défaut espérance de vie = **60 ans** et % de mort
  naturelle = **10 %**.
- **FR-003**: À chaque tick annuel, après le vieillissement des vivants, le système MUST tester la
  mort naturelle pour chaque individu **vivant**, **non immortel** et d'âge **≥ espérance de vie**
  de son espèce, selon le % de mort naturelle de l'espèce.
- **FR-004**: Un individu qui meurt de mort naturelle MUST recevoir la raison de décès « mort
  naturelle ».
- **FR-005**: L'âge MUST être une valeur **suivie** (compteur), et non purement dérivée de la date
  de naissance : un individu mort (quelle que soit la cause) **arrête de vieillir** (âge gelé à
  l'âge de sa mort). Aux ticks où l'individu est vivant, l'âge **augmente de +1/an** ; les années
  passées mort ne l'incrémentent pas. La date de naissance reste **immuable**.
- **FR-006**: Un individu mort MUST **rester dans sa tranche de génération** (déterminée par l'année
  de naissance, donc inchangée par la mort).
- **FR-007**: Le tirage de mort naturelle MUST être **déterministe** à seed fixe (consomme le RNG
  du cœur, aucune horloge/hasard non seedé).

**US2 — Résurrection & immortalité**

- **FR-008**: Chaque personne MUST porter un attribut **immortel** (booléen, défaut **faux**).
- **FR-009**: La fiche d'un individu MUST proposer un bouton « **Ressusciter** » (en dessous de
  « Tuer cet individu ») et une case à cocher « **Immortel** ».
- **FR-010**: Un individu **immortel** MUST NOT pouvoir mourir de mort naturelle ; il MUST rester
  tuable manuellement.
- **FR-011**: « Ressusciter » MUST ramener un individu décédé à la vie **à l'âge qu'il avait à sa
  mort** (âge repris tel quel, sans rattraper les années passées mort), **effacer** sa raison de
  décès, et faire reprendre le vieillissement à **+1/an** aux ticks suivants.
- **FR-012**: Un individu ressuscité non immortel MUST être de nouveau soumis au tirage de mort
  naturelle dès le prochain tick (selon son âge et l'espérance de vie de son espèce).
- **FR-013**: Le bouton « Ressusciter » MUST être indisponible pour un individu déjà vivant.

**US3 — Tris puissance & maîtrise**

- **FR-014**: La liste des individus MUST proposer deux tris supplémentaires : **puissance** et
  **maîtrise**.
- **FR-015**: Chaque tri MUST **cycler** au clic entre *tri par défaut → croissant → décroissant*,
  cohérent avec les tris existants.
- **FR-016**: Pour un individu à plusieurs pouvoirs, le système MUST le classer selon son pouvoir
  **le plus extrême dans le sens du tri** : valeur **la plus basse** en croissant, **la plus haute**
  en décroissant.
- **FR-017**: Le **tri par défaut** MUST correspondre à l'ordre par défaut habituel (identique aux
  autres tris).
- **FR-017b**: Les individus **sans pouvoir** MUST être classés **en fin de liste** pour les tris
  puissance et maîtrise, quel que soit le sens (croissant ou décroissant), leur ordre relatif
  suivant l'ordre par défaut habituel (stable).

**US4 — Filtres par année de naissance**

- **FR-018**: La liste MUST proposer deux filtres « **né après X** » et « **né avant Y** » (X, Y =
  années), à **bornes inclusives** : « né après X » retient les années de naissance **≥ X** et
  « né avant Y » les années **≤ Y** (l'intervalle [X, Y] contient X et Y).
- **FR-019**: Dès qu'au moins un des deux filtres d'année est actif, le **filtre par génération**
  MUST être **désactivé** (les deux systèmes sont mutuellement exclusifs).
- **FR-020**: Tant qu'aucun filtre d'année n'est actif, le filtre par génération MUST rester
  disponible et opérant.
- **FR-021**: Un champ d'année vide MUST être considéré comme inactif (aucune borne appliquée pour
  ce champ).

**US5 — Indicateur de chargement**

- **FR-022**: Au clic sur « avancer », pendant le calcul, le système MUST afficher un indicateur de
  chargement (flèche circulaire en rotation).
- **FR-022b**: L'indicateur MUST être **effectivement visible** pendant tout le calcul : l'UI monte
  le spinner puis **cède une frame au navigateur** (tick asynchrone) avant de lancer le calcul
  synchrone du cœur, de sorte que le spinner soit peint même pour un calcul long et bloquant.
- **FR-023**: L'indicateur MUST disparaître dès la fin des calculs et l'affichage de la nouvelle
  population.

**Transversal**

- **FR-024**: Les nouveaux paramètres d'espèce (FR-001) MUST être pris en compte par la
  persistance existante (export/import) sans casser la rétro-compatibilité des fichiers antérieurs.
- **FR-025**: L'attribut **immortel** (FR-008) MUST être pris en compte par la persistance
  existante avec une valeur par défaut (faux) pour les fichiers antérieurs.
- **FR-026**: **Toutes** les nouveautés d'interface de cette feature — tris puissance & maîtrise
  (US3), filtres « né après / né avant » (US4), boutons « Ressusciter » & case « Immortel » (US2),
  indicateur de chargement (US5) — MUST être disponibles à la fois en présentation **mobile**
  (`≤760px`) et **desktop** (`≥760px`), chacune adaptée au style de son layout (cohérence avec les
  features 013–014).

### Key Entities *(include if feature involves data)*

- **Espèce (paramètres)** : gagne deux attributs — *espérance de vie* (âge entier) et *% de mort
  naturelle par an* (pourcentage). Défauts humain : 60 / 10 %.
- **Personne** : gagne l'attribut *immortel* (booléen, défaut faux). L'*âge* devient une valeur
  **suivie** (compteur) qui augmente de +1/an tant que l'individu est vivant, se fige à la mort et
  reprend tel quel à la résurrection (années mortes non comptées) ; la *raison du décès* peut valoir
  « mort naturelle » et peut être effacée par résurrection. La *date de naissance* reste immuable et
  la *tranche de génération* en découle (inchangée par mort/résurrection).
- **État de tri / filtre de liste (présentation)** : le tri courant gagne deux axes (puissance,
  maîtrise) ; les filtres gagnent deux bornes d'année de naissance mutuellement exclusives avec le
  filtre de génération. Non persisté (état de présentation).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: À seed fixe, avancer N années deux fois produit exactement la même population (mêmes
  morts naturelles, mêmes âges figés) — déterminisme vérifiable par test unitaire du cœur.
- **SC-002**: Avec l'espèce humain par défaut (60 / 10 %), sur une population d'individus âgés,
  environ 10 % des individus éligibles meurent naturellement par année avancée (vérifiable
  statistiquement sur un grand échantillon à seed fixe).
- **SC-003**: Un individu décédé conserve un âge et une tranche de génération constants sur toute
  avancée ultérieure du temps.
- **SC-004**: Depuis la fiche, l'utilisateur peut tuer, ressusciter et basculer l'immortalité d'un
  individu, et l'effet est immédiatement reflété à l'écran.
- **SC-005**: Les tris puissance et maîtrise ordonnent correctement une population de test connue,
  y compris pour les individus multi-pouvoirs (règle du pouvoir le plus extrême).
- **SC-006**: Activer un filtre d'année désactive visuellement et fonctionnellement le filtre par
  génération, et réciproquement à son retrait.
- **SC-007**: L'indicateur de chargement est visible pendant le calcul d'« avancer » et absent le
  reste du temps.
- **SC-008**: Un fichier exporté avant cette version se réimporte sans erreur, l'immortalité valant
  faux et les nouveaux paramètres d'espèce prenant leurs valeurs par défaut.
- **SC-009**: Les 4 nouveautés d'interface (tris, filtres d'année, boutons cycle de vie, indicateur
  de chargement) sont accessibles et fonctionnelles dans les deux présentations, en dessous et
  au-dessus du seuil de 760px.

## Assumptions

- La **source de vérité** `rsrc/DescriptionProjet.md` (et `.adoc`) a **déjà été mise à jour** pour
  accommoder ces 5 features (§3.3, §6.5, §6.6, §6.7, §8.1, §8.2, §8.4, §9.4) ; cette spec s'y aligne.
- Le calcul de la **tranche de génération** reste celui des features précédentes (relatif à la
  genèse, tranches de 20 ans), fondé sur l'année de naissance et donc invariant à la mort.
- Les tris puissance/maîtrise et les filtres d'année sont un **état de présentation UI**, non
  persisté (cohérent avec les tris/filtres existants).
- La logique de mort naturelle et l'attribut immortel appartiennent au **cœur pur** (`src/core`) ;
  seule la présentation (boutons, indicateur, contrôles de tri/filtre) vit dans `src/ui`.
- Aucune dépendance externe nouvelle n'est introduite ; déterminisme et contrainte d'anonymat
  préservés.
- Cible de version **v0.14.0** (nouvelle capacité fonctionnelle, pas seulement un correctif).
