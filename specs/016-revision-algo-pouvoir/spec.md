# Feature Specification: Révision de l'algorithme de transformation d'une sous-liste en pouvoir

**Feature Branch**: `016-revision-algo-pouvoir`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "Modifier l'algorithme de transformation d'une sous-liste en pouvoir (§6.4.2) : certaines feuilles de l'arbre produisent désormais deux pouvoirs, un même jeton `Kx` est partagé entre les deux, et plusieurs formulations de feuilles sont ajustées. Cible v0.15.0."

## Contexte

L'algorithme §6.4.2 transforme chaque sous-liste de traits d'un individu en **libellé de pouvoir**, selon un arbre de décision piloté par la présence des types de traits (`a` = action, `e` = élément, `p` = partie du corps, `aj` = ajout, `r` = remplacement, `et` = état). Les jetons de génération `Ka`/`Ke`/`Kp`/`Kaj` tentent de créer un nouveau trait avec `K` % de chance.

Jusqu'ici, **chaque feuille de l'arbre produisait au plus un pouvoir**. Cette feature introduit la possibilité qu'**une feuille produise deux pouvoirs distincts**, révise le libellé de certaines feuilles, et précise le partage d'un même jeton `Kx` entre les deux pouvoirs d'une feuille.

La source de vérité `rsrc/DescriptionProjet.md` (§6.4.2) a **déjà été mise à jour** (avec le `.adoc` et le PDF), sous autorisation de l'auteur (Principe IX). Les 24 feuilles concernées y figurent verbatim ; elles font foi pour l'implémentation.

## Clarifications

### Session 2026-08-06

- Q: Comment différencier l'id des deux pouvoirs issus d'une même sous-liste ? → A: Suffixe d'index (`#0` / `#1`) selon la position du pouvoir dans la sous-liste. L'unicité de l'id n'est requise **que par personne** ; deux personnes distinctes peuvent partager le **même** id de pouvoir (id dérivé du contenu, aucun registre global), comportement **voulu** et déjà existant.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Une feuille peut produire deux pouvoirs (Priority: P1)

Lorsqu'une sous-liste correspond à l'une des 23 feuilles marquées « deux pouvoirs » (notation `"X" ; "Y"` dans §6.4.2), la transformation produit **deux pouvoirs distincts** au lieu d'un seul. Chacun est un pouvoir à part entière avec son propre libellé, et reçoit ses **propres** valeurs de puissance/maîtrise (§7.2).

**Why this priority**: C'est le cœur de la feature — la capacité nouvelle. Sans elle, rien d'autre n'a de sens.

**Independent Test**: En construisant une sous-liste de traits qui tombe sur une feuille à deux pouvoirs (p. ex. `a & e & p & r & aj & et`), vérifier que l'individu reçoit exactement deux pouvoirs, avec les deux libellés attendus du §6.4.2, chacun avec ses P/M.

**Acceptance Scenarios**:

1. **Given** une sous-liste tombant sur `a/e/p/r/aj/et`, **When** on transforme la sous-liste en pouvoir(s), **Then** deux pouvoirs sont produits : `"{a} {e} avec {aj} {et} sur {r} à la place de {p}"` et `"{aj} {et} sur {r} à la place de {p}"` (jetons substitués).
2. **Given** une sous-liste tombant sur une feuille **mono-pouvoir inchangée** (p. ex. `a/e` → `"{a} {e}"`), **When** on transforme, **Then** un seul pouvoir est produit, comme avant.
3. **Given** deux pouvoirs produits par une même feuille, **When** on lit leurs puissance et maîtrise, **Then** chaque pouvoir a ses propres valeurs P/M, tirées indépendamment selon le §7.2.
4. **Given** une même seed, une même sous-liste et un même contexte, **When** on transforme deux fois, **Then** les pouvoirs produits (libellés + P/M) sont **identiques** (déterminisme préservé).

---

### User Story 2 - Jeton `Kx` partagé entre les deux pouvoirs d'une feuille (Priority: P2)

Quand une feuille à deux pouvoirs contient le **même** jeton de génération `Kx` (p. ex. `{Kp}`) dans ses deux chaînes, la génération `K` correspondante est tentée **une seule fois** et son résultat (le trait généré) est **réutilisé à l'identique** dans les deux pouvoirs.

**Why this priority**: Précise une règle sans laquelle le comportement des feuilles `e/...` (qui portent `{Ka}` et `{Kp}` partagé) serait ambigu ou non déterministe.

**Independent Test**: Sur une feuille à deux pouvoirs partageant `{Kp}` (p. ex. `e/aj/et`), vérifier qu'un seul trait « partie du corps » est généré et que le libellé résolu de ce jeton est **le même** dans les deux pouvoirs ; et qu'un échec de ce tirage supprime les deux pouvoirs.

**Acceptance Scenarios**:

1. **Given** une feuille à deux pouvoirs partageant `{Kp}` et un tirage `K` **réussi**, **When** on transforme, **Then** le même trait « partie du corps » généré apparaît dans les deux pouvoirs (aucun second tirage distinct pour `{Kp}`).
2. **Given** une feuille à deux pouvoirs partageant `{Kp}` et un tirage `{Kp}` **échoué**, **When** on transforme, **Then** aucun des deux pouvoirs référençant `{Kp}` n'est produit.
3. **Given** une feuille dont un jeton `Kx` n'apparaît que dans **un seul** des deux pouvoirs (p. ex. `{Ka}` du 1ᵉʳ pouvoir des feuilles `e/...`) et dont ce tirage **échoue**, **When** on transforme, **Then** seul le pouvoir référençant ce jeton n'est pas produit ; l'autre pouvoir (sans jeton `K` échoué) est **quand même** produit.
4. **Given** une même seed, **When** on transforme une feuille à `Kx` partagé, **Then** le nombre de tirages `K` consommés et leurs résultats sont **reproductibles** (déterminisme préservé).

---

### User Story 3 - Libellés de feuilles révisés (Priority: P3)

Les libellés de 24 feuilles sont mis à jour conformément au §6.4.2 : ajout d'un second pouvoir pour 23 d'entre elles, et deux ajustements de formulation mono-chaîne (feuille `a/e/p/r/aj/et` dont le 1ᵉʳ pouvoir devient `"{a} {e} avec {aj} {et} sur {r} à la place de {p}"` ; feuille `aj/et/r` qui devient un pouvoir unique `"{aj} {et} sur {r} à la place de {Kp}"` sans `{Ka}`).

**Why this priority**: Ce sont des ajustements de contenu/formulation dépendant de US1/US2 ; utiles mais secondaires par rapport au mécanisme.

**Independent Test**: Pour chacune des 24 feuilles listées au §6.4.2, vérifier que le(s) libellé(s) produit(s) correspondent exactement aux chaînes du §6.4.2 (jetons substitués), et que les feuilles **non listées** restent inchangées.

**Acceptance Scenarios**:

1. **Given** la feuille `aj/et/r`, **When** on transforme, **Then** un seul pouvoir `"{aj} {et} sur {r} à la place de {Kp}"` est produit (l'ancien `{Ka}` a disparu).
2. **Given** une feuille **non listée** parmi les 24 (p. ex. `a/e/p` → `"{a} {e} avec {p}"`), **When** on transforme, **Then** son libellé est **inchangé** par rapport au comportement actuel.
3. **Given** la feuille `a/et`, **When** on transforme, **Then** le 2ᵉ pouvoir est `"rends {Ke} {et}"` (jeton d'état `{et}`, pas le mot « et »).

---

### Edge Cases

- **Sous-liste sans aucun trait significatif** (feuille terminale `pouvoir = null`) : aucun pouvoir produit, comme aujourd'hui.
- **Regroupement multi-traits d'un même type** (« r1, r2 et r3 », « e1 ou e2 ») : s'applique à chacun des deux pouvoirs de la feuille, sans changement de règle.
- **Populations déjà enregistrées** : les pouvoirs déjà générés et sérialisés ne sont **pas** recalculés à l'import ; seuls les pouvoirs **nouvellement générés** (genèse, reproduction, régénération, make-it-real) suivent le nouvel algorithme. Aucune migration de format n'est requise par cette seule feature.
- **Ordre de consommation du RNG** : l'introduction d'un second pouvoir et le partage de `Kx` modifient la quantité/ordre des tirages `K` par rapport à l'ancien algorithme ; un ordre déterministe et documenté doit être défini (les résultats à seed fixe changeront par rapport à v0.14.x, mais resteront reproductibles).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: L'algorithme de transformation d'une sous-liste en pouvoir MUST produire, pour les 23 feuilles marquées `"X" ; "Y"` au §6.4.2, **deux pouvoirs distincts** ; pour toutes les autres feuilles non nulles, **un seul** pouvoir.
- **FR-002**: Les libellés produits MUST correspondre **exactement** aux chaînes du §6.4.2 (source de vérité `rsrc/DescriptionProjet.md`) après substitution des jetons des types présents (`{a} {e} {p} {aj} {r} {et}`).
- **FR-003**: Chaque pouvoir produit par une feuille à deux pouvoirs MUST recevoir ses **propres** valeurs de puissance et de maîtrise, tirées indépendamment selon le §7.2.
- **FR-004**: Lorsqu'un même jeton `Kx` apparaît dans les **deux** chaînes d'une feuille, le système MUST n'effectuer **qu'une seule** tentative de génération `K` pour ce jeton et **réutiliser** le trait généré (le même) dans les deux pouvoirs.
- **FR-005**: Si une tentative de génération `K` **échoue**, tout pouvoir **référençant ce jeton** MUST ne pas être produit ; un pouvoir de la même feuille **ne référençant aucun** jeton `K` échoué MUST quand même être produit.
- **FR-006**: Les feuilles **non listées** parmi les 24 du §6.4.2 MUST conserver leur libellé et leur comportement actuels (aucune régression).
- **FR-007**: La transformation MUST rester **déterministe** : à seed, sous-liste, paramètres et catalogue identiques, les pouvoirs produits (libellés + P/M + traits générés) MUST être identiques. Aucun usage de `Math.random`, d'horloge ou d'UUID aléatoire dans le cœur.
- **FR-008**: La logique de transformation (arbre de libellé + résolution des jetons `K` + P/M) MUST demeurer dans le cœur pur `src/core` (sans dépendance Svelte/DOM/navigateur), le RNG étant passé en paramètre.
- **FR-009**: Le comportement révisé MUST s'appliquer à **tous** les points de génération de pouvoirs (genèse, reproduction/hérédité, régénération de pouvoirs, make-it-real) de façon cohérente.
- **FR-010**: Les 24 feuilles révisées MUST être conformes à la liste verbatim du §6.4.2, dont notamment : `a/e/p/r/aj/et` (1ᵉʳ pouvoir `"{a} {e} avec {aj} {et} sur {r} à la place de {p}"`), `a/et` (2ᵉ pouvoir `"rends {Ke} {et}"`), et `aj/et/r` (pouvoir unique `"{aj} {et} sur {r} à la place de {Kp}"`, sans `{Ka}`).
- **FR-011**: Lorsqu'une sous-liste produit deux pouvoirs, leurs identifiants MUST être **uniques au sein d'une même personne** (p. ex. suffixe d'index `#0` / `#1` selon la position dans la sous-liste). L'unicité **globale** n'est PAS requise : deux personnes distinctes PEUVENT partager le même id de pouvoir (id dérivé du contenu).

### Key Entities *(include if feature involves data)*

- **Sous-liste de traits**: ensemble de traits d'un individu regroupés par type (§6.4.1) ; entrée de l'algorithme. Caractérisée par la présence/absence de chaque type (`a/e/p/aj/r/et`).
- **Pouvoir**: libellé lisible + puissance + maîtrise + traits associés + identifiant. Une sous-liste produit désormais **0, 1 ou 2** pouvoirs. L'identifiant est dérivé du contenu (traits) et doit être unique **par personne** (suffixe d'index pour départager les deux pouvoirs d'une même sous-liste) ; il peut être partagé entre personnes différentes.
- **Trait généré par `K`**: nouveau trait (action/élément/partie du corps/ajout) créé avec `K` % de chance, inscrit dans l'ADN ; peut être **partagé** entre les deux pouvoirs d'une feuille.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des 23 feuilles « deux pouvoirs » du §6.4.2 produisent exactement deux pouvoirs aux libellés attendus (vérifié par tests unitaires à seed fixe couvrant chaque feuille modifiée).
- **SC-002**: 100 % des feuilles **non listées** produisent un libellé **identique** à celui de la version précédente (test de non-régression sur l'arbre complet).
- **SC-003**: Pour toute feuille à `Kx` partagé, le trait résolu du jeton partagé est **identique** dans les deux pouvoirs dans 100 % des cas de tirage réussi (test déterministe).
- **SC-004**: La transformation est reproductible à 100 % : deux exécutions à seed identique produisent des résultats bit-à-bit identiques (test de déterminisme).
- **SC-005**: La suite de tests du cœur (`npm run test`) passe intégralement, et le lint/build restent verts.

## Assumptions

- La source de vérité `rsrc/DescriptionProjet.md` / `.adoc` / `.pdf` §6.4.2 est **déjà à jour et validée** ; elle fait foi pour les 24 feuilles et la règle du `Kx` partagé.
- **Aucune migration de persistance** n'est requise : les pouvoirs déjà sérialisés ne sont pas recalculés ; `FORMAT_VERSION` reste inchangé (à confirmer en `/speckit-plan`).
- Les valeurs P/M des deux pouvoirs d'une feuille sont tirées **indépendamment** selon le §7.2 (confirmé avec l'auteur).
- Un **échec** de génération `K` supprime uniquement le(s) pouvoir(s) référençant ce jeton ; un pouvoir sans jeton `K` échoué est produit (confirmé avec l'auteur).
- Le partage `Kx` ne concerne que les jetons présents dans les **deux** chaînes d'une même feuille ; un jeton présent dans une seule chaîne garde son tirage propre.
- Le changement d'ordre/nombre de tirages `K` **modifie** les sorties à seed fixe par rapport à v0.14.x ; c'est **attendu** (les tests de régression figeront les nouvelles valeurs). Cible de version : **v0.15.0**.
- Aucune nouvelle dépendance n'est ajoutée.
