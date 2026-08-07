---
description: "Task list — 017-config-defaults"
---

# Tasks: Paramètres par défaut issus du fichier de config

**Input**: Design documents from `specs/017-config-defaults/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/core-contract.md, quickstart.md

**Tests**: OBLIGATOIRES pour le cœur (Constitution Principe V — cœur pur couvert par tests Vitest à seed fixe).

**Organization**: tâches groupées par user story (P1→P3). Chemins relatifs à la racine du dépôt.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers distincts, sans dépendance sur une tâche incomplète).
- Chemins de fichiers exacts inclus dans chaque description.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: créer la source unique centralisée des défauts.

- [x] T001 Créer le dossier `src/core/default/` et y créer `src/core/default/defaultConfig.json` contenant **verbatim** les trois blocs `catalog`, `especes`, `parameters` copiés depuis `rsrc/PowerGenerator_config_20260807-153421.json` (conserver ids/labels/poids exacts, ordre intra-type ; les champs `kind`/`formatVersion` sont inutiles ici — ne pas les inclure). La `seed` du bloc `parameters` peut rester présente (elle sera neutralisée par le loader) — la valeur exacte importe peu.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: exposer la source unique, typée et clonée. **Bloque toutes les user stories.**

- [x] T002 Créer `src/core/default/defaultConfig.ts` : importer `./defaultConfig.json`, l'exposer typé et fournir trois accès **purs** retournant des **clones profonds** (`structuredClone`) — `DEFAULT_CATALOG(): Catalog`, `DEFAULT_ESPECES(): Espece[]`, `DEFAULT_PARAMETERS(): Parameters`. Dans `DEFAULT_PARAMETERS()`, **forcer `seed = '0'`** quelle que soit la valeur du JSON (INV-C4/INV-DM4). Aucun accès DOM/réseau/`rsrc/` (INV-C6). Types importés depuis `../model/*` et `../params/parameters.js`.

**Checkpoint** : la source unique est disponible et testable de façon isolée.

---

## Phase 3: User Story 1 — Démarrage aux nouveaux défauts (P1) 🎯 MVP

**Goal** : au démarrage sans données ni import, l'app utilise les défauts du fichier de config (seed exclue), depuis la source unique.

**Independent Test** : `tests/unit/default-config.test.ts` vert (deep-equal catalogue/espèces/paramètres vs config, seed = '0') + vérif UI Paramètres à stockage vide.

### Implémentation

- [x] T003 [US1] Réécrire `src/core/catalog/defaultCatalog.ts` : `defaultCatalog()` retourne `DEFAULT_CATALOG()` ; `defaultEspeces()` retourne `DEFAULT_ESPECES()` ; `defaultEspece()` retourne `DEFAULT_ESPECES()[0]`. **Supprimer** la constante `RAW` et les littéraux d'espèce désormais inutiles. Conserver l'export de `slug()` (encore utilisé par `editCatalog`/UI) et les signatures/exports existants (INV-C7).
- [x] T004 [US1] Réécrire `defaultParameters()` dans `src/core/params/parameters.ts` : retourner `DEFAULT_PARAMETERS()` (donc seed `'0'`). Supprimer le littéral d'objet par défaut et l'usage devenu inutile de `defaultTraitTypeWeights()` (le supprimer s'il n'est plus référencé ailleurs). Conserver `statA()` et les exports/type `Parameters` inchangés (INV-C7). Vérifier que `src/ui/stores/appState.ts:63` (`{...defaultParameters(), seed: createSeed()}`) fonctionne toujours sans modification (FR-005).

### Tests (US1)

- [x] T005 [P] [US1] Créer `tests/unit/default-config.test.ts` : charger le JSON de référence (`rsrc/PowerGenerator_config_20260807-153421.json`) et vérifier — INV-C1 `defaultCatalog()` deep-equal `catalog` ; INV-C2 `defaultEspeces()` deep-equal `especes` et `defaultEspece()` = `especes[0]` ; INV-C3 `defaultParameters()` deep-equal `parameters` **en ignorant `seed`** ; INV-C4 `defaultParameters().seed === '0'` et `!== '4392551652664730716'`.
- [x] T006 [P] [US1] Dans `tests/unit/default-config.test.ts`, ajouter INV-C5 (immutabilité/non-aliasing : muter le retour d'une fabrique n'affecte pas l'appel suivant) et INV-DM2 (poids ciblés : `Action:controle-1`→6, `Ajout:bras-6`→0.5, `Remplacement:main-3`→0.5).

**Checkpoint** : US1 livrable et testable indépendamment (MVP).

---

## Phase 4: User Story 2 — Réinitialisation cohérente (P2)

**Goal** : toute réinitialisation « aux valeurs par défaut » restaure les valeurs de la source unique (seed exclue).

**Independent Test** : recherche de tout point de réinitialisation ; confirmation qu'il passe par les fabriques.

- [x] T007 [US2] Auditer le code UI/cœur pour toute fonction de « réinitialisation aux défauts » (`src/ui/stores/appState.ts`, `src/ui/views/ParametresView.svelte`, `src/core/state/serialize.ts` → `createInitialState`). Confirmer qu'elle s'appuie exclusivement sur `defaultCatalog()`/`defaultEspeces()`/`defaultParameters()` (donc la source unique) et **jamais** sur des littéraux. Si un tel point réutilise la seed du fichier, le corriger. Documenter le constat (probable : aucune UI de reset dédiée ; défauts consommés au démarrage uniquement).

**Checkpoint** : cohérence « défaut = une seule chose partout » vérifiée.

---

## Phase 5: User Story 3 — Source unique de maintenance (P3)

**Goal** : garantir qu'aucune valeur par défaut ne subsiste hors de `src/core/default/`.

**Independent Test** : recherche de littéraux de défaut résiduels ; une modification dans `defaultConfig.json` se reflète partout.

- [x] T008 [US3] Rechercher dans `src/core` et `src/ui` tout défaut codé en dur résiduel (anciennes valeurs : `batchSize: 100`, `birthYear: 0`, `duplicationD: 0.25`, `disappearThreshold: 2`, `statB: 10`/`statC: 30`, `reproPeakPct: 40`, listes de traits en dur, etc.). Confirmer qu'il n'en reste aucun hors `src/core/default/`. Vérifier qu'un changement d'une valeur dans `defaultConfig.json` se propage bien (démarrage + fabriques) sans autre édition (FR-006).

**Checkpoint** : source unique effective (INV-DM1).

---

## Phase 6: Polish & non-régression

**Purpose**: réaligner les tests existants sur les nouveaux défauts et valider les portes de qualité.

- [x] T008b Balayage **exhaustif** des tests seed-fixe impactés par le changement de défauts (FR-008) : exécuter `npm run test`, puis pour **chaque** test rouge consommant `defaultParameters()`/`defaultCatalog()`/`defaultEspece(s)()` (genèse `genesis`, reproduction `reproduce`/`inherit`, tick `tick`/`death`, sandbox, sérialisation, etc.), décider — soit **réaligner** l'attente sur les nouveaux défauts, soit **rendre le test indépendant** des défauts (fixtures explicites). Dresser la liste des fichiers touchés au-delà des 4 explicitement listés en T009–T012 ; aucun test rouge ne doit subsister sans décision documentée.
- [x] T009 [P] Réaligner `tests/unit/gaussian.test.ts` : le commentaire et les attentes doivent refléter pic **30 ans** / max **20 %** (idéalement lire les valeurs depuis `defaultEspece()` plutôt que des littéraux).
- [x] T010 [P] Réaligner `tests/unit/edit-especes.test.ts` : `setEspeceParam` — `reproPeakPct` par défaut attendu **20** (au lieu de 40) ; ajuster toute autre assertion dépendant d'un défaut humain modifié.
- [x] T011 [P] Réaligner `tests/unit/edit-catalog.test.ts` : remplacer l'assertion « tous les traits par défaut ont `weight === null` » (désormais fausse) par une assertion cohérente avec la source (ex. deep-equal avec `defaultCatalog()` ou présence des poids attendus). Les tests basés sur le petit catalogue local `cat()` restent inchangés.
- [x] T012 [P] Réaligner `tests/unit/state.test.ts` : ajuster toute assertion portant sur une valeur par défaut modifiée (année de naissance, etc.) ; **vérifier** que `FORMAT_VERSION` et le comportement d'import/merge restent inchangés (INV-C8, SC-004).
- [x] T013 Exécuter `npm run test` (toute la suite verte, seed fixe) puis `npm run build` (bundle OK, aucune dépendance runtime à `rsrc/`). Corriger les régressions éventuelles.
- [ ] T014 Vérification manuelle selon `quickstart.md` (stockage vide, page Paramètres desktop + mobile, seed aléatoire ≠ celle du fichier, génération sans erreur, non-régression import).

---

## Hors périmètre de l'implémentation (rappels)

- **Doc (Principe IX)** : `rsrc/DescriptionProjet.md`/`.adoc` **déjà mis à jour et validés** ; `.pdf` **recompilé par l'auteur**. ✅
- **Bump `v1.0.0`** : à faire **après validation finale** de l'auteur (hors `/speckit-implement`).

---

## Dependencies & Execution Order

- **T001 → T002** : le loader dépend du JSON.
- **T002 (Foundational)** bloque **T003, T004** (fabriques) et donc tout le reste.
- **T003, T004** peuvent se faire en parallèle (fichiers distincts) une fois T002 fait.
- **T005, T006** (tests US1) après T003/T004 ; parallélisables entre eux (même fichier → séquencer les écritures si nécessaire).
- **T007 (US2)**, **T008 (US3)** après T003/T004.
- **T008b** (balayage exhaustif des tests rouges) après T003/T004 ; **précède/englobe** T009–T012 (qui traitent les 4 cas déjà connus) — les fichiers supplémentaires qu'il révèle sont traités dans la foulée.
- **T009–T012** (réalignements connus) parallélisables (fichiers distincts) après T003/T004.
- **T013** après T003–T012 et T008b. **T014** après T013.

## Implementation Strategy

- **MVP** = Phases 1–3 (T001→T006) : la source unique + fabriques + test d'égalité. Livre à elle seule la valeur principale (US1).
- Incréments : US2 (T007) et US3 (T008) sont surtout de la **vérification** (peu ou pas de code) et consolident la garantie « source unique ».
- Terminer par le **polish** (réalignement des tests, portes de qualité) avant toute demande de validation/bump v1.

## Parallel Example

```text
# Après T002 :
T003 (defaultCatalog.ts)  &  T004 (parameters.ts)        # fichiers distincts
# Après T003/T004 :
T009 (gaussian.test)  &  T010 (edit-especes.test)  &  T011 (edit-catalog.test)  &  T012 (state.test)
```
