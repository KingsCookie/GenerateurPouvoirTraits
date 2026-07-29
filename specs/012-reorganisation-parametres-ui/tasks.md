---
description: "Task list — Réorganisation de la page Paramètres (onglets + modales)"
---

# Tasks: Réorganisation de la page Paramètres (onglets Principaux / Avancés + éditeurs en modale)

**Input**: Design documents from `specs/012-reorganisation-parametres-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: la feature est de nature UI (cœur inchangé). Un seul test automatisé est requis (store
d'onglet, unité pure, Principe V) ; le reste est validé par checklist manuelle (quickstart.md).

**Organization**: tâches groupées par user story (P1 → P3). Chaque story est un incrément livrable et
testable indépendamment.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance sur une tâche incomplète)
- **[Story]** : US1 / US2 / US3

## Contrainte transverse (rappel impératif)

**Aucun paramètre existant ne doit être supprimé, désactivé ni rendu inaccessible** (FR-001/FR-002).
Chaque tâche de déplacement se fait par **réutilisation** des composants/liaisons existants, jamais
par réécriture de leur contenu. Aucune modification de `src/core`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: préparer l'état d'interface partagé et la version.

- [X] T001 Ajouter le store d'onglet persistant dans [src/ui/stores/ui.ts](../../src/ui/stores/ui.ts) : `export type ParamsTab = 'principaux' | 'avances'`, `export const PARAMS_TABS`, `export const paramsTab = writable(readChoice('ui.paramsTab', PARAMS_TABS, 'principaux'))`, `paramsTab.subscribe(t => lsSet('ui.paramsTab', t))`, et `export function setParamsTab(t: ParamsTab)` — en suivant le patron des axes de thème (clé `LS_PARAMSTAB = 'ui.paramsTab'`).
- [X] T002 Bumper la version dans [package.json](../../package.json) de `0.11.1` à `0.12.0`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: créer les enveloppes modales réutilisables avant de brancher la vue. Bloquant pour US2.

- [X] T003 [P] Créer [src/ui/components/CatalogueModal.svelte](../../src/ui/components/CatalogueModal.svelte) : overlay modal (backdrop cliquable, fermeture `Escape` via `onKeydown`, bouton « Fermer », prop `onClose: () => void`) reproduisant le patron d'accessibilité de [src/ui/components/SandboxPersonForm.svelte](../../src/ui/components/SandboxPersonForm.svelte) ; rend `<TraitCatalogEditor />` **inchangé** dans le corps.
- [X] T004 [P] Créer [src/ui/components/EspecesModal.svelte](../../src/ui/components/EspecesModal.svelte) : même patron modal que T003 ; rend en tête la case « Autoriser la consanguinité » (liée à `consanguinityAllowed` via `setParam`, reprise verbatim de `ParametresView`), puis `<SpeciesEditor />` **inchangé**.

**Checkpoint**: les deux composants modaux compilent (`npm run build`) et peuvent être montés isolément.

---

## Phase 3: User Story 1 — Onglets Principaux / Avancés (Priority: P1) 🎯 MVP

**Goal**: la page s'ouvre sur l'onglet « Principaux » (essentiel visible) ; « Avancés » regroupe la
calibration fine ; le bouton « Générer » reste persistant. Aucun paramètre perdu.

**Independent Test**: charger la page (stockage vidé) → onglet « Principaux » actif avec thème + graine
+ `batchSize` + `birthYear` + `powerChancePct` + bouton Générer ; cliquer « Avancés » révèle tous les
réglages fins, éditables ; modifier un avancé puis générer prend la valeur en compte.

- [X] T005 [US1] Dans [src/ui/views/ParametresView.svelte](../../src/ui/views/ParametresView.svelte), importer `paramsTab`, `setParamsTab` (et `PARAMS_TABS`) depuis `../stores/ui.js` ; remplacer l'index latéral `sections`/`goTo`/`active` par une barre d'onglets `role="tablist"` avec deux boutons `role="tab"` (`aria-selected` reflétant `$paramsTab`) « Principaux » / « Avancés », sur le patron de [src/ui/views/SandboxView.svelte](../../src/ui/views/SandboxView.svelte) (lignes tabs).
- [X] T006 [US1] Structurer le rendu en deux panneaux exclusifs `{#if $paramsTab === 'principaux'} … {:else} … {/if}` ; déplacer le bouton « Générer la population » (`generate`) **hors** des deux panneaux (barre d'action de page), visible quel que soit l'onglet (FR-007b, US1 AS-5).
- [X] T007 [US1] Panneau **Principaux** : y placer `<ThemeControls variant="full" />` (fieldset apparence), le champ graine (`seed` + bouton `regenerateSeed`), `batchSize`, `birthYear`, `powerChancePct` — en réutilisant les blocs `.field`/`onNumber`/`onSeed` existants sans changer leurs liaisons.
- [X] T008 [US1] Panneau **Avancés** : y déplacer, inchangés, les blocs `initialResilience`, `duplicationD`, `generationK`, tout le fieldset « Hérédité & naissance » (les 12 champs dont `statA` en lecture seule + case `genomeMalusEnabled`), le fieldset « Pondérations des gabarits » (`templateWeights` via `onTemplateWeight`), et `<ResilienceOverrides />`.
- [X] T009 [US1] Vérifier INV-5/INV-6 : la bascule d'onglet n'appelle aucun `setParam` et chaque contrôle conserve sa liaison d'origine ; ajuster le style des onglets/panneaux (réutiliser/adapter le CSS `.tabs`/`.tab` du patron sandbox) pour un rendu responsive sans débordement.

**Checkpoint**: US1 livrable seule — page à deux onglets fonctionnelle, tous les réglages non-modaux présents.

---

## Phase 4: User Story 2 — Éditeurs en modale (Priority: P2)

**Goal**: catalogues de traits et espèces (+ consanguinité) accessibles via des boutons ouvrant des
modales, retirés du flux de la page.

**Independent Test**: cliquer « Modifier les catalogues… » ouvre une modale avec l'éditeur complet ;
modifier, fermer (Échap/backdrop/bouton), rouvrir → modif conservée ; idem « Gérer les espèces… » avec
la case consanguinité en tête ; générer reflète les modifs.

- [X] T010 [US2] Dans [src/ui/views/ParametresView.svelte](../../src/ui/views/ParametresView.svelte), importer `CatalogueModal` et `EspecesModal` ; ajouter l'état de session local `let showCatalogue = false; let showEspeces = false;` (non persisté).
- [X] T011 [US2] Dans le panneau **Principaux**, ajouter deux boutons « Modifier les catalogues de traits… » (`on:click={() => showCatalogue = true}`) et « Gérer les espèces… » (`on:click={() => showEspeces = true}`), avec éventuellement un court résumé (nb d'espèces / de traits). *(⚠️ Corrigé par BUG-001 → T020 : la section passe dans l'onglet Avancés.)*
- [X] T012 [US2] Monter les modales conditionnellement en fin de vue : `{#if showCatalogue}<CatalogueModal onClose={() => showCatalogue = false} />{/if}` et `{#if showEspeces}<EspecesModal onClose={() => showEspeces = false} />{/if}`.
- [X] T013 [US2] Retirer de la page les anciens fieldsets « Catalogues de traits », « Espèces & reproduction » et la case « Autoriser la consanguinité » désormais rendus en modale (la case migre dans `EspecesModal` — T004) ; vérifier INV-7/INV-8 (fonctions intégrales, modifs persistées) et INV-9 (aucune génération déclenchée à l'ouverture/fermeture).

**Checkpoint**: US2 livrable — page allégée, éditeurs volumineux en modale, consanguinité en tête d'espèces.

---

## Phase 5: User Story 3 — Navigation & mémorisation (Priority: P3)

**Goal**: la navigation se réduit aux onglets ; l'onglet actif est restauré au rechargement.

**Independent Test**: sélectionner « Avancés », recharger → « Avancés » actif ; vider `localStorage`,
recharger → « Principaux » par défaut, sans erreur.

- [X] T014 [US3] Brancher la bascule d'onglet sur `setParamsTab(...)` (persistance `localStorage` via le store T001) au lieu d'un état local ; confirmer qu'aucun ancien sommaire latéral à 8 entrées ne subsiste (FR-013).
- [X] T015 [US3] Vérifier la restauration : `readChoice` renvoie l'onglet mémorisé au montage, et le défaut « principaux » si absent/invalide (edge case stockage vidé) — cohérent avec INV-1/INV-2.

**Checkpoint**: US3 livrable — onglet actif mémorisé et restauré.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: test automatisé, validation manuelle, portes de qualité, version.

- [X] T016 [P] Créer [tests/unit/params-tab-store.test.ts](../../tests/unit/params-tab-store.test.ts) : test pur de `readChoice('ui.paramsTab', PARAMS_TABS, 'principaux')` → renvoie `'principaux'` si absent, `'principaux'` si valeur invalide, et la valeur mémorisée si valide (stub `globalThis.localStorage` posé avant l'import dynamique — pas de dépendance DOM).
- [X] T017 [P] Dérouler la **checklist manuelle** de [quickstart.md](./quickstart.md) (US1/US2/US3 + recensement de préservation SC-002 + déterminisme SC-004) via `npm run dev`. *(Validation navigateur à confirmer par l'auteur avant prod.)*
- [X] T018 Portes de qualité : `npm run test` (Vitest, cœur + nouveau test), `npm run build` (`tsc --noEmit && vite build`), `npm run lint` (eslint + prettier) tous verts.
- [X] T019 Vérifier que le pied de page affiche **v0.12.0** (issu de `package.json` via `__APP_VERSION__`) après build.

---

## Phase 7: Bugfix BUG-001 — Placement & sélecteurs d'éditeurs (v0.12.1)

**Bugfix**: 2026-07-29 — BUG-001 Updated from bugfix patch.

**Goal**: section « Catalogues & espèces » dans l'onglet Avancés ; éditeur de catalogues à sélecteur
de type (défaut Action, options alphabétiques) ; éditeur d'espèces défaut « humain ». **Zéro modif
`src/core`** ; l'ordre `TRAIT_TYPES` reste inchangé (tri d'affichage UI seulement).

- [X] T020 [US2] Dans [src/ui/views/ParametresView.svelte](../../src/ui/views/ParametresView.svelte), déplacer le fieldset « Catalogues & espèces » (les deux boutons d'ouverture des modales) du panneau **Principaux** vers le panneau **Avancés** (FR-004, FR-008/FR-009). Vérifier que `showCatalogue`/`showEspeces` et le montage des modales restent fonctionnels.
- [X] T021 [US2] Dans [src/ui/components/TraitCatalogEditor.svelte](../../src/ui/components/TraitCatalogEditor.svelte), ajouter un **sélecteur de type** (`<select>`) : construire une liste des `TRAIT_TYPES` **triée alphabétiquement par libellé** (`TYPE_LABELS`) pour l'affichage, état local `selectedType` initialisé à `'Action'` ; remplacer le `{#each TRAIT_TYPES}` qui rend tous les types par le rendu du **seul** `selectedType`. Ne PAS modifier `TRAIT_TYPES` (`src/core/model/traitType.ts`) ni l'ordre de sérialisation (FR-008b / INV-11).
- [X] T022 [US2] Dans [src/ui/components/SpeciesEditor.svelte](../../src/ui/components/SpeciesEditor.svelte), initialiser la sélection d'espèce par défaut sur **« humain »** si cette espèce existe dans `$especes` (sinon 1ʳᵉ espèce disponible) — FR-009b.
- [X] T023 Bumper la version dans [package.json](../../package.json) `0.12.0` → `0.12.1`, puis repasser les portes de qualité (`npm run test`, `npm run build`, `npm run lint`) et vérifier le pied de page **v0.12.1**.

**Checkpoint**: BUG-001 corrigé — accès éditeurs en Avancés, catalogue par type sélectionné, espèce humain par défaut.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** : T001 bloque US1/US3 (store d'onglet) ; T002 indépendant.
- **Foundational (T003–T004)** : bloque US2 ; parallélisables entre eux ([P]).
- **US1 (T005–T009)** : dépend de T001. Séquentiel (même fichier `ParametresView.svelte`).
- **US2 (T010–T013)** : dépend de US1 (structure des panneaux) + T003/T004 (modales). Séquentiel (même fichier).
- **US3 (T014–T015)** : dépend de US1 + T001. Séquentiel.
- **Polish (T016–T019)** : T016/T017 parallélisables ; T018/T019 après tout le reste.

**Ordre recommandé** : T001 → T002 → (T003 ‖ T004) → T005…T009 (US1/MVP) → T010…T013 (US2) → T014…T015 (US3) → T016…T019.

## Parallel Opportunities

- T003 ‖ T004 (deux nouveaux fichiers modaux distincts).
- T016 ‖ T017 (test auto vs checklist manuelle, indépendants).
- T002 peut se faire à tout moment (fichier `package.json` isolé).

⚠️ Note : T005–T009, T010–T013 et T014 touchent **le même fichier** `ParametresView.svelte` → **non** parallélisables entre elles (pas de `[P]`).

## Implementation Strategy

- **MVP = US1** (Phase 3) : la page à deux onglets avec tous les réglages non-modaux répond déjà au besoin « user friendly » et est livrable seule.
- **Incréments** : US2 (modales) puis US3 (mémorisation) ajoutent de la valeur sans casser US1.
- **Garde-fou permanent** : à chaque tâche de déplacement, cocher mentalement le recensement SC-002 (quickstart) pour garantir qu'aucun paramètre ne disparaît.
