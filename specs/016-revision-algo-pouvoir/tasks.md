# Tasks: Révision de l'algorithme de transformation d'une sous-liste en pouvoir

**Input**: Design documents from `/specs/016-revision-algo-pouvoir/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/core-contract.md, quickstart.md

**Tests**: **OBLIGATOIRES** (Constitution Principe V — cœur pur testé à seed fixe). Écrits avant l'implémentation et vérifiés **rouges** d'abord.

**Bugfix**: 2026-08-07 — BUG-001 Déduplication des pouvoirs de libellé identique (voir Phase 7 ci-dessous, `bugs/BUG-001.md`).

**Organization**: par user story (P1→P3). ⚠️ Les stories touchent les **mêmes** fichiers cœur (`powerLabelTree.ts`, `traitsToPowers.ts`) : leurs tâches d'implémentation sont **séquentielles** (pas de `[P]` inter-stories sur un même fichier). Les tâches de tests dans des fichiers distincts peuvent être `[P]`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallélisable (fichiers différents, aucune dépendance)
- **[Story]**: US1 / US2 / US3
- Chemins relatifs à la racine du dépôt.

---

## Phase 1: Setup

**Purpose**: baseline avant modification.

- [X] T001 Établir la baseline : exécuter `npm run test` et confirmer la suite verte (référence 329 tests). Noter que les sorties seed-fixe des pouvoirs **changeront** (documenté spec/research) ⇒ un réalignement des tests existants est prévu (T014).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: refactor de forme **sans changement de comportement fonctionnel**, prérequis de toutes les stories.

**⚠️ CRITICAL**: aucune story ne peut commencer avant la fin de cette phase.

- [X] T002 Dans `src/core/powers/powerLabelTree.ts`, faire renvoyer à `powerLabelFromSublist` un `string[]` : `treeTemplate` renvoie la chaîne brute d'une feuille (potentiellement `"X ; Y"`) ou `null` ; `powerLabelFromSublist` découpe sur `;` (trim), substitue les jetons des types présents pour chaque gabarit, et renvoie `[]` si `null`. **Aucune feuille encore dédoublée** (contenu inchangé) ⇒ tableaux de longueur 1. (INV-C1)
- [X] T003 Dans `src/core/powers/traitsToPowers.ts`, faire renvoyer à `transformSublist` un `Pouvoir[]` (0/1 pour l'instant) et concaténer dans `derivePowersFromTraits` (`pouvoirs.push(...transformSublist(...))`) ; ajouter le suffixe d'id `#<index>` (index du pouvoir dans la sous-liste) au format `pw:DERIVE:${traitIds.join('+')}#<index>`. Comportement fonctionnel inchangé sinon. (INV-C7, INV-C9)
- [X] T004 Réaligner la suite existante impactée uniquement par le refactor de forme + suffixe d'id (assertions d'id dans `tests/unit/*.test.ts`) ; `npm run test` de nouveau vert.

**Checkpoint**: refactor sûr, suite verte, forme `string[]`/`Pouvoir[]` en place.

---

## Phase 3: User Story 1 - Deux pouvoirs par feuille (Priority: P1) 🎯 MVP

**Goal**: une feuille marquée `"X" ; "Y"` produit **deux** pouvoirs distincts, chacun avec ses P/M indépendantes et un id unique par personne.

**Independent Test**: une sous-liste tombant sur `a/e/p/r/aj/et` produit exactement deux `Pouvoir` (libellés attendus, ordre X→Y), P/M propres, ids `#0`/`#1`.

### Tests (à écrire d'abord, doivent échouer)

- [X] T005 [P] [US1] Tests « deux pouvoirs » + « id unique par personne » (T-2POWERS, T-ID) dans `tests/unit/traits-to-powers.test.ts` : feuille `a/e/p/r/aj/et` ⇒ 2 pouvoirs, ordre X→Y, ids `#0`/`#1` distincts. (INV-2P, INV-C7)
- [X] T006 [P] [US1] Test « P/M indépendantes » (T-PM-INDEP) dans `tests/unit/regenerate-powers.test.ts` : les 2 pouvoirs d'une feuille reçoivent des P/M tirées indépendamment (§7.2, mapping par index). (INV-C12, FR-003)

### Implémentation

- [X] T007 [US1] Dans `src/core/powers/powerLabelTree.ts`, renseigner les gabarits `"X ; Y"` des **23 feuilles à deux pouvoirs** verbatim depuis §6.4.2 (`rsrc/DescriptionProjet.md`), y compris le 1ᵉʳ pouvoir révisé de `a/e/p/r/aj/et` (`{a} {e} avec {aj} {et} sur {r} à la place de {p}`) et le 2ᵉ pouvoir `a/et` (`rends {Ke} {et}`). (FR-001, FR-002, FR-010)
- [X] T008 [US1] Dans `src/core/powers/traitsToPowers.ts`, produire un `Pouvoir` **par gabarit** de la feuille (ordre X→Y) ; vérifier que `reproduce.ts` et `regenerate.ts` mappent bien `inheritStats` par index sur la liste (aucune modification attendue de ces fichiers, sinon la documenter). (INV-C9, INV-C12)

**Checkpoint**: US1 fonctionnelle et testable — les feuilles à deux pouvoirs produisent 2 pouvoirs corrects (hors sémantique fine des `K` partagés, couverte en US2).

---

## Phase 4: User Story 2 - Jeton `Kx` partagé (Priority: P2)

**Goal**: un même jeton `Kx` présent dans les deux gabarits d'une feuille est tiré **une seule fois** et réutilisé ; un échec ne supprime que les pouvoirs référençant ce jeton.

**Independent Test**: feuille `e/aj/et` (partage `{Kp}`) ⇒ un seul trait « partie du corps » généré, identique dans les deux pouvoirs ; `{Kp}` en échec ⇒ les deux tombent ; un jeton présent dans un seul gabarit qui échoue ⇒ seul ce pouvoir tombe.

### Tests (à écrire d'abord, doivent échouer)

- [X] T009 [US2] Tests `Kx` partagé dans `tests/unit/traits-to-powers.test.ts` : T-KSHARED (même trait réutilisé, ADN inscrit une fois), T-KFAIL-SHARED (échec partagé ⇒ 0 pouvoir), T-KFAIL-PARTIAL (échec d'un jeton présent dans un seul gabarit ⇒ l'autre pouvoir subsiste), T-KORDER (un seul tirage par jeton distinct, ordre reproductible), T-TRAITIDS (traitIds par pouvoir). (INV-C4, INV-C5, INV-C6, INV-C8, INV-K1)

### Implémentation

- [X] T010 [US2] Dans `src/core/powers/traitsToPowers.ts`, déplacer la résolution des jetons `K` au niveau de la **feuille** (et non par gabarit) : collecter les jetons `K` distincts par **1ʳᵉ apparition** (gabarit 1 puis gabarit 2) ; pour chaque jeton distinct, **un seul** `rng.chance(generationK)` puis `rng.pickWeightedOrNull` ; mémoriser `token → {label}` ou **échec** ; un gabarit référençant un jeton en échec ne produit pas de pouvoir ; inscrire le trait généré **une seule fois** dans l'ADN (`inscribeGenerated`) ; composer `traitIds` de chaque pouvoir = traits de la sous-liste + traits `K` **référencés** par ce pouvoir. (INV-C4→C8, INV-K1, FR-004, FR-005)

**Checkpoint**: US1 + US2 fonctionnelles — deux pouvoirs avec `K` partagé déterministe et sémantique d'échec correcte.

---

## Phase 5: User Story 3 - Libellés révisés & non-régression (Priority: P3)

**Goal**: les 24 feuilles révisées sont conformes verbatim au §6.4.2 (dont la reformulation mono `aj/et/r`), et **toutes les feuilles non listées restent inchangées**.

**Independent Test**: pour chaque feuille listée, le(s) libellé(s) correspondent au §6.4.2 ; un échantillon de feuilles non listées produit un libellé identique à l'existant ; feuille terminale ⇒ `[]`.

### Tests (à écrire d'abord, doivent échouer pour les feuilles modifiées)

- [X] T011 [US3] Tests de conformité de l'arbre dans `tests/unit/power-label-tree.test.ts` : T-LEAVES-2P (les 23 feuilles à deux gabarits, verbatim), T-LEAF-1P (`aj/et/r` mono, sans `{Ka}`), T-LEAF-AET (`a/et` ⇒ `rends {Ke} {et}`), T-NR (échantillon de feuilles **non listées** inchangées), T-NULL (feuille terminale ⇒ `[]`). (INV-C2, INV-C3, INV-C1)

### Implémentation

- [X] T012 [US3] Dans `src/core/powers/powerLabelTree.ts`, appliquer la reformulation mono `aj/et/r` (`{aj} {et} sur {r} à la place de {Kp}`, sans `{Ka}`) et **vérifier ligne à ligne** que les 24 feuilles révisées correspondent au §6.4.2 ; confirmer qu'aucune feuille **non listée** n'a été modifiée. (FR-006, FR-010, INV-NR)

**Checkpoint**: les 3 stories fonctionnelles ; l'arbre est conforme et sans régression.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T013 Réaligner tous les tests seed-fixe existants dont les sorties déterministes changent (`tests/unit/reproduce.test.ts`, `tests/unit/regenerate-powers.test.ts`, et tout test de genèse/état asserttant des pouvoirs) sur les **nouvelles** valeurs ; ne réaligner que ce qui découle légitimement du nouvel algorithme.
- [X] T014 [P] Bumper la version dans `package.json` : `0.14.1` → `0.15.0`.
- [X] T015 [P] Exécuter la checklist manuelle de `specs/016-revision-algo-pouvoir/quickstart.md` (mobile ≤ 760 px + desktop) : fiche à deux pouvoirs, libellés révisés, non-régression visible, export/import `full` sans recalcul.
- [X] T016 Portes de qualité finales : `npm run lint`, `npm run build`, `npm run test` **tous verts** (Principe II/V).

---

## Phase 7: Bugfix BUG-001 — Déduplication des pouvoirs de libellé identique

**Goal**: une personne ne conserve **jamais** deux pouvoirs de libellé identique. La déduplication garde la **1ʳᵉ** copie (ordre de production) et s'exécute **avant** l'attribution des puissances/maîtrises (§7.2), sans comparer aucune statistique et sans consommer de RNG.

**Independent Test**: une personne dont la dérivation produit deux pouvoirs de même libellé (deux branches, ou une branche à deux pouvoirs + autres sous-listes) n'en conserve qu'un ; résultat déterministe à seed fixe.

### Tests (à écrire d'abord, doivent échouer)

- [X] T017 [BUG-001] Test seed-fixe de déduplication dans `tests/unit/traits-to-powers.test.ts` : un ADN produisant **deux pouvoirs de libellé identique** ⇒ `derivePowersFromTraits` n'en renvoie **qu'un** (la 1ʳᵉ occurrence, `puissance`/`maitrise` encore à 0), les libellés distincts d'une même branche ne sont **pas** fusionnés, et le résultat est identique à seed égale (déterminisme). (FR-012, SC-006, §6.4.3) — T-DEDUP / T-DEDUP-DISTINCT / T-DEDUP-DET

### Implémentation

- [X] T018 [BUG-001] Dans `src/core/powers/traitsToPowers.ts`, à la **fin** de `derivePowersFromTraits` (après la boucle sur les sous-listes, **avant** le `return`), dédupliquer `pouvoirs` par **libellé** via `dedupeByLabel` : parcourir dans l'ordre de production et ne conserver que la **1ʳᵉ** occurrence de chaque libellé (les suivantes sont écartées). Aucune comparaison de P/M (elles valent 0 à ce stade), aucun tirage RNG, ADN inchangé. Les appelants (`reproduce.ts`, `regenerate.ts`) attribuent ensuite les P/M à la liste déjà dédupliquée ; la genèse (pouvoir unique de mutation forte) n'est pas concernée. (FR-012, INV-C14)

### Polish

- [X] T019 [BUG-001] Réaligner les tests seed-fixe existants dont les sorties changent **uniquement** du fait de la déduplication : **aucun réalignement nécessaire** — la suite complète (350 tests) reste verte, aucun scénario seed-fixe existant ne produisait de doublon de libellé.
- [X] T020 [P] [BUG-001] Bumper `package.json` en version **patch** (0.15.0 → 0.15.1) puis portes de qualité finales : `npm run lint`, `npm run build`, `npm run test` **tous verts**.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)** → **Foundational (T002–T004)** → **US1 (T005–T008)** → **US2 (T009–T010)** → **US3 (T011–T012)** → **Polish (T013–T016)** → **Bugfix BUG-001 (T017–T020)**.
- Foundational **bloque** toutes les stories (refactor de forme + id).

### Ordre des stories (fichiers partagés)

- US1, US2, US3 modifient `powerLabelTree.ts` et/ou `traitsToPowers.ts` ⇒ **séquentielles** dans l'ordre P1→P2→P3 (éviter les conflits de même fichier).
- US2 dépend de US1 (les deux gabarits doivent exister avant de partager leur `K`).
- US3 peut être faite après US1 (elle affine/vérifie les libellés) ; ses tests de non-régression valident l'ensemble.

### Parallel Opportunities

- **T005** (fichier `traits-to-powers.test.ts`) et **T006** (fichier `regenerate-powers.test.ts`) : `[P]` (fichiers distincts).
- **T014** (`package.json`) et **T015** (checklist manuelle) : `[P]` (indépendants du code).
- À l'intérieur d'une story, les tâches d'implémentation touchant le même fichier restent séquentielles.

---

## Implementation Strategy

### MVP (US1 uniquement)

1. Setup (T001) → Foundational (T002–T004) → US1 (T005–T008).
2. **STOP & VALIDATE** : les feuilles à deux pouvoirs produisent 2 pouvoirs corrects, ids/​P-M OK.
3. US1 est un incrément livrable (mécanisme « deux pouvoirs »).

### Livraison incrémentale

1. Foundation prête → US1 (MVP : deux pouvoirs) → US2 (`Kx` partagé) → US3 (conformité + non-régression).
2. Chaque story ajoute de la valeur sans casser les précédentes (suite verte à chaque checkpoint).
3. Polish : réalignement des tests, bump v0.15.0, portes de qualité.

---

## Notes

- `[P]` = fichiers différents, aucune dépendance.
- Tests **rouges d'abord**, puis implémentation (Principe V).
- Déterminisme : ordre de tirage fixe (jetons `K` distincts par 1ʳᵉ apparition, puis P/M par index côté appelants) — cf. research R3.
- Aucune migration de persistance (`FORMAT_VERSION` inchangé) ; les valeurs seed-fixe changent vs v0.14.x (attendu).
- Commit sur la branche `016-revision-algo-pouvoir` ; merge sur `main` **uniquement sur demande**.
