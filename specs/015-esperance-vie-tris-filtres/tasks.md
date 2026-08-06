# Tasks: Espérance de vie, cycle de vie, tris & filtres

**Input**: Design documents from `specs/015-esperance-vie-tris-filtres/`

**Prerequisites**: plan.md, spec.md, research.md (R1→R9), data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Les tests du **cœur** (`src/core`) sont **obligatoires** au titre du Principe V (déterminisme
vérifiable à seed fixe). L'UI (`src/ui`) est validée par **checklist manuelle** (quickstart.md),
sans framework de test de composants.

**Organization**: Tâches groupées par user story (P1→P5), chacune indépendamment testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, pas de dépendance non satisfaite)
- **[Story]** : US1…US5 ; Setup/Foundational/Polish sans label

## Path Conventions

Mono-projet : cœur `src/core/`, UI `src/ui/`, tests `tests/unit/`.

---

## Phase 1: Setup

**Purpose**: Préparer la version cible.

- [x] T001 Passer la version à **0.14.0** dans `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Changements de modèle et de persistance partagés par US1 et US2. **⚠️ Bloquant** : US1/US2
ne peuvent démarrer qu'après cette phase. (US3/US4/US5 sont indépendantes et peuvent démarrer en
parallèle dès le Setup.)

- [x] T002 [P] Ajouter `age: number` et `immortel: boolean` à l'interface `Personne` dans `src/core/model/personne.ts` (commentaires : âge suivi/gelé §R1 ; immortel défaut faux)
- [x] T003 [P] Ajouter `esperanceVie: number` et `mortNaturellePct: number` à l'interface `Espece` dans `src/core/model/espece.ts`
- [x] T004 Initialiser `age`/`immortel` à tous les sites de construction de `Personne` : genèse `src/core/genesis/genesis.ts` (**age = 0**, immortel = false), naissance `src/core/birth/reproduce.ts` (age 0, immortel false), sandbox `src/core/sandbox/sandbox.ts` (`createPerson` age 0 ; `clonePerson` copie age/immortel) (dépend de T002)
- [x] T005 Renseigner les défauts d'espèce **60 / 10** dans `defaultEspece()` `src/core/catalog/defaultCatalog.ts` (humain) **et** `defaultReproParams()` `src/core/species/editEspeces.ts` (nouvelle espèce, aligné sur l'humain) (dépend de T003)
- [x] T006 Persistance : passer `FORMAT_VERSION` de 4 à **5** et ajouter les migrations à défaut dans `src/core/state/serialize.ts` — Personne : `immortel ??= false`, `age ??= computeAge(yearOf(dateNaissance), currentYear)` (dans `validateDataInto` et branche `data` de `parseImport`) ; Espèce : `esperanceVie ??= 60`, `mortNaturellePct ??= 10` (dans `validateConfigInto`) (dépend de T002, T003)
- [x] T007 [P] Test de migration v4→v5 dans `tests/unit/state.test.ts` : import d'un état v4 ⇒ `immortel=false`, `age` recomposé, espèces à 60/10 ; round-trip `full` déterministe (INV-PE1→PE3) (dépend de T006)

**Checkpoint**: Modèle + persistance prêts — US1 et US2 peuvent démarrer.

---

## Phase 3: User Story 1 - Mort naturelle par espèce (Priority: P1) 🎯 MVP

**Goal**: Les individus meurent naturellement selon l'espérance de vie et le % de mort de leur
espèce ; l'âge se fige à la mort ; la génération reste invariante.

**Independent Test**: À seed fixe, avancer au-delà de l'espérance et vérifier morts « mort
naturelle », âge figé, génération inchangée, déterminisme (quickstart §2).

### Tests for User Story 1 (cœur — obligatoires) ⚠️

> Écrire ces tests d'abord et vérifier qu'ils échouent avant l'implémentation.

- [x] T008 [P] [US1] Test vieillissement dans `tests/unit/tick.test.ts` : `age` +1/an pour les vivants, non incrémenté pour les morts, nouveau-né age 0 (INV-A1→A3)
- [x] T009 [P] [US1] Test mort naturelle déterministe dans `tests/unit/tick.test.ts` (via `_fakeRng` file `chances`) : non testé si `age < esperanceVie` ou `immortel` (aucun tirage), cause `"mort naturelle"`, dissolution du couple, bords `mortNaturellePct` 0 %/100 %, **edge `esperanceVie = 0`** (nouveau-né éligible dès le tick), rejouabilité même seed (INV-D1→D6, SC-001/002)
- [x] T010 [P] [US1] Test génération invariante avant/après mort dans `tests/unit/tick.test.ts` (INV-A4, SC-003)
- [x] T011 [P] [US1] Test validation des nouveaux champs d'espèce dans `tests/unit/edit-especes.test.ts` : `esperanceVie` entier ≥ 0, `mortNaturellePct` clampé [0..100]

### Implementation for User Story 1

- [x] T012 [US1] Étape « mort naturelle » dans `tick` (`src/core/time/tick.ts`) : après reproduction, parcourir la population dans l'ordre stable, tuer `vivant && !immortel && age >= espece.esperanceVie` via `rng.chance(espece.mortNaturellePct)` avec cause `"mort naturelle"` + dissolution du couple (§R3/R4)
- [x] T013 [US1] Étape « vieillissement » explicite en tête de `tick` (`src/core/time/tick.ts`) : `age += 1` pour les vivants uniquement (nouveau-nés de l'année restent à 0) ; factoriser la dissolution de couple partagée avec `kill` dans `src/core/life/death.ts` si utile (dépend de T012)
- [x] T014 [US1] Bornes de validation `esperanceVie`/`mortNaturellePct` dans `validateEspece()` `src/core/species/editEspeces.ts`
- [x] T015 [US1] Lire `person.age` (au lieu du recalcul dérivé) dans **tous** les lecteurs d'âge : `src/ui/lib/ficheViewModel.ts`, tri âge de `sortPopulation` (`src/core/genealogy/filter.ts`), `src/core/genealogy/tree.ts`, **et la reproduction** — âge max de repro dans `src/core/repro/candidates.ts` et âge moyen de couple (`ageOf`) dans `src/core/time/tick.ts` (l'éligibilité repro se fonde sur l'âge **suivi**, F1) (INV-A5, §R1)
- [x] T016 [US1] `SpeciesEditor.svelte` : exposer les 2 champs d'espèce (section « avancés »), rendu générique via `REPRO_FIELDS`/`num()`, mobile + desktop (`src/ui/components/SpeciesEditor.svelte`)

**Checkpoint**: US1 fonctionnelle et testable indépendamment (MVP).

---

## Phase 4: User Story 2 - Résurrection & immortalité (Priority: P2)

**Goal**: Depuis la fiche, ressusciter un décédé et basculer l'immortalité (mobile + desktop).

**Independent Test**: Fiche d'un décédé → Ressusciter (âge figé, raison effacée) ; cocher Immortel →
avancer → jamais de mort naturelle ; tuer un immortel fonctionne (quickstart §3).

### Tests for User Story 2 (cœur — obligatoires) ⚠️

- [x] T017 [P] [US2] Test `resurrect` dans `tests/unit/death.test.ts` : décédé ⇒ `vivant=true`, `raisonDeces=null`, `age` inchangé ; sans effet/refus si déjà vivant (INV-R1→R3)
- [x] T018 [P] [US2] Test `setImmortal` + immortalité dans `tests/unit/death.test.ts` : immortel jamais tué par mort naturelle (via tick), `kill` fonctionne quand même sur un immortel (INV-R4→R5)

### Implementation for User Story 2

- [x] T019 [US2] `resurrect(state, id)` et `setImmortal(state, id, bool)` dans `src/core/life/death.ts` (renvoi type `KillResult`-like) + exports dans `src/core/index.ts` (dépend de T002)
- [x] T020 [US2] Actions store `resurrectPerson` et `setImmortal` dans `src/ui/stores/appState.ts` (à côté de `killPerson`, MAJ population/couples/history)
- [x] T021 [US2] Exposer `immortel` (et lire `age` suivi) dans le view-model fiche `src/ui/lib/ficheViewModel.ts`
- [x] T022 [US2] Fiche : bouton « Ressusciter » (indisponible si vivant, FR-013) sous « Tuer cet individu » + case « Immortel » (défaut décochée), en **mobile** et **desktop** (`src/ui/views/FicheView.svelte`)

**Checkpoint**: US1 + US2 fonctionnelles indépendamment.

---

## Phase 5: User Story 3 - Tris puissance & maîtrise (Priority: P3)

**Goal**: Trier la liste par puissance et maîtrise (cycle défaut/croissant/décroissant, pouvoir
extrême, sans-pouvoir en fin), mobile + desktop.

**Independent Test**: Cliquer les tris, vérifier cycle, règle multi-pouvoirs et sans-pouvoir en fin
(quickstart §4). Indépendant des changements de modèle (US1/US2).

### Tests for User Story 3 (cœur — obligatoires) ⚠️

- [x] T023 [P] [US3] Test `sortPopulation` puissance/maîtrise dans `tests/unit/genealogy-sort.test.ts` : pouvoir extrême (min en croissant, max en décroissant), multi-pouvoirs, **sans-pouvoir toujours en fin** dans les deux sens, cycle/tri par défaut (INV-S1→S4, SC-005)

### Implementation for User Story 3

- [x] T024 [US3] Étendre `SortKey` (`'puissance'|'maitrise'`) et `sortPopulation` dans `src/core/genealogy/filter.ts` : partition sans-pouvoir (concaténés en fin, `byBirthThenId`) + comparateur sur valeur extrême selon le sens (§R6)
- [x] T025 [US3] Contrôles de tri UI : en-tête « Pouvoir(s) » desktop cliquable (P puis M ou deux en-têtes) dans `src/ui/views/ListeView.svelte` + segments mobile (`SORT_KEYS`/`SORT_LABELS`) dans `src/ui/components/FilterBar.svelte`, via `cycleSort` existant (`src/ui/stores/ui.ts`)

**Checkpoint**: Tris P/M opérationnels mobile + desktop.

---

## Phase 6: User Story 4 - Filtres par année de naissance (Priority: P4)

**Goal**: Filtres « né après X » / « né avant Y » (inclusifs) désactivant le filtre génération,
mobile + desktop.

**Independent Test**: Poser les bornes, vérifier l'intervalle inclus et la désactivation de la
génération, puis le retour (quickstart §5). Indépendant des autres stories.

### Tests for User Story 4 (cœur — obligatoires) ⚠️

- [x] T026 [P] [US4] Test `filterPopulation` dans `tests/unit/genealogy-filter.test.ts` : bornes **inclusives** [X,Y], exclusivité avec `generations` (générations ignorées si borne active), champ vide inactif, intervalle vide ⇒ liste vide (INV-F1→F5, SC-006)

### Implementation for User Story 4

- [x] T027 [US4] Ajouter `bornNafter: number|null` / `bornBefore: number|null` à `FilterCriteria` + logique inclusive et exclusivité génération dans `filterPopulation` (`src/core/genealogy/filter.ts`) (§R7)
- [x] T028 [US4] Store filtres : `emptyCriteria()` + helpers `setBornAfter`/`setBornBefore` dans `src/ui/stores/filters.ts`
- [x] T029 [US4] `FilterBar.svelte` : 2 champs année + **désactivation visuelle** du fieldset Génération quand une borne est active, mobile + desktop ; ajuster `effectiveGenerations` dans `src/ui/views/ListeView.svelte` (INV-F2)

**Checkpoint**: Filtres année opérationnels mobile + desktop.

---

## Phase 7: User Story 5 - Indicateur de chargement (Priority: P5)

**Goal**: Spinner (flèche circulaire) visible pendant « avancer », mobile + desktop.

**Independent Test**: Avancer sur grosse population, spinner visible pendant le calcul puis disparaît
(quickstart §6). UI uniquement — pas de test cœur.

### Implementation for User Story 5

- [x] T030 [P] [US5] Créer `src/ui/components/Spinner.svelte` (flèche circulaire SVG/CSS, couleur `--accent`) + `@keyframes spin` dans `src/app.css` avec coupure `@media (prefers-reduced-motion: reduce)` (INV-L3, §R9)
- [x] T031 [US5] État `advancing` (writable) + **yield d'une frame** avant le calcul synchrone dans le handler « avancer » (`src/ui/stores/appState.ts` action async ou `src/ui/components/TimeBar.svelte`) puis affichage du `Spinner` mobile + desktop, retiré à la fin (INV-L1→L2, §R8)

**Checkpoint**: Toutes les user stories fonctionnelles.

---

## Phase 8: Polish & Cross-Cutting

- [x] T032 Vérifier `npm run test` + `npm run lint` + `npm run build` **verts**
- [ ] T033 Dérouler la **checklist manuelle** `quickstart.md` en **mobile (≤760px)** et **desktop (≥760px)** (parité FR-026/SC-009, INV-P1→P3)
- [x] T034 Revue tokens : aucune valeur de style en dur dans les composants ajoutés (INV-P2)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)** : aucune dépendance.
- **Foundational (P2)** : dépend du Setup ; **bloque US1 et US2**.
- **US1 (P3)** / **US2 (P4)** : après Foundational. US2 peut s'appuyer sur US1 (mort) mais reste
  testable indépendamment.
- **US3 (P5)** / **US4 (P6)** / **US5 (P7)** : indépendantes du modèle — peuvent démarrer dès le
  Setup, en parallèle des autres phases.
- **Polish (P8)** : après les stories visées.

### Within Each User Story

- Tests cœur écrits d'abord (échouent), puis implémentation.
- Cœur (`src/core`) avant UI (`src/ui`) qui le consomme.

### Parallel Opportunities

- T002 ∥ T003 (interfaces distinctes) ; T007 après T006.
- Tests d'une même story marqués [P] en parallèle (T008–T011 ; T017–T018).
- US3, US4, US5 développables en parallèle d'US1/US2 (fichiers largement disjoints ; seul
  `genealogy/filter.ts` est partagé entre US3 (sort) et US4 (filter) — coordonner ces deux tâches).

## Parallel Example: User Story 1

```bash
# Tests US1 (après Foundational) :
Task: "T008 vieillissement dans tests/unit/tick.test.ts"
Task: "T009 mort naturelle déterministe dans tests/unit/tick.test.ts"   # même fichier → séquencer si conflit
Task: "T011 validation espèce dans tests/unit/edit-especes.test.ts"
```

## Implementation Strategy

### MVP First (US1)

1. Setup (T001) → Foundational (T002–T007) → US1 (T008–T016).
2. **STOP & VALIDATE** : mort naturelle + âge gelé + déterminisme (quickstart §2).

### Incremental Delivery

US1 (MVP) → US2 → US3 → US4 → US5, chacune testée puis validée, sans casser les précédentes. Polish
final (T032–T034) avant préparation de la v0.14.0.

## Notes

- [P] = fichiers différents, sans dépendance non satisfaite.
- `src/core` reste **pur** (RNG en paramètre) ; l'UI ne fait que présentation (Principe IV).
- Attention au fichier partagé `src/core/genealogy/filter.ts` (US3 + US4) : séquencer T024 et T027.
- Commits par tâche ou groupe logique, **sur la branche `015-esperance-vie-tris-filtres`**.
