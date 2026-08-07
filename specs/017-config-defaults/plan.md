# Implementation Plan: Paramètres par défaut issus du fichier de config

**Branch**: `017-config-defaults` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-config-defaults/spec.md`

## Summary

Faire de l'intégralité du fichier `rsrc/PowerGenerator_config_20260807-153421.json` (blocs `catalog`, `especes`, `parameters`) — **seed exclue** — les valeurs par défaut de l'application, servies depuis une **source unique centralisée** dans le cœur (`src/core/default/`). Les trois fabriques de défauts (`defaultCatalog()`, `defaultEspeces()`, `defaultParameters()`) dérivent **toutes** leurs valeurs de cette source, y compris celles qui coïncident avec les défauts actuels — aucun tri « ce qui change / ne change pas ». Le contenu est embarqué **verbatim** (les ids de traits du fichier ne sont pas régénérables par index car l'utilisateur en a supprimé), sans I/O runtime et sans dépendance à `rsrc/`. La seed reste tirée aléatoirement par l'UI (`createSeed()`). Aucune migration ni changement de `FORMAT_VERSION`.

## Technical Context

**Language/Version**: TypeScript 5.x (ESM, `"type": "module"`)

**Primary Dependencies**: aucune nouvelle. Vite (bundling, import JSON natif), Svelte 5 (UI, non touchée), Vitest (tests).

**Storage**: aucune. Données embarquées dans le bundle (module JSON du cœur). Persistance utilisateur inchangée (export/import de fichiers, Principe VI).

**Testing**: Vitest, tests du cœur à seed fixe + tests d'égalité « défauts = config ».

**Target Platform**: PWA statique (navigateurs desktop + mobile), GitHub Pages.

**Project Type**: application web statique monolithique — cœur pur `src/core` ↔ UI `src/ui`.

**Performance Goals**: aucun impact ; chargement de constantes au démarrage (négligeable).

**Constraints**: cœur pur (pas de DOM/navigateur/Svelte dans `src/core`), déterminisme (aucun `Math.random`/horloge dans le cœur), `FORMAT_VERSION` inchangé, pas de dépendance runtime à `rsrc/`.

**Scale/Scope**: 1 nouveau dossier `src/core/default/` (2 fichiers), réécriture de 3 fabriques, mise à jour tests impactés. Catalogue ~140 traits, 1 espèce, ~22 paramètres.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Statut | Justification |
|----------|--------|---------------|
| I. Déterminisme seed unique | ✅ PASS | Aucune source d'aléa ajoutée. Seed toujours issue de `createSeed()` (UI). Défauts = données constantes. |
| II. 100 % statique / client-side | ✅ PASS | JSON embarqué au build (import Vite) ; aucun backend, aucune I/O réseau. |
| III. PWA multiplateforme | ✅ PASS | Inchangé. |
| IV. Cœur pur, isolé, testable | ✅ PASS | Nouvelle source dans `src/core/default/` : données + fonctions pures, sans DOM/Svelte. |
| V. Tests déterministes du cœur | ✅ PASS | Tests seed-fixe + tests d'égalité défauts↔config + non-régression des tests existants réalignés. |
| VI. Persistance explicite par fichiers | ✅ PASS | Pas d'auto-save ; `FORMAT_VERSION` **inchangé** ; aucune migration. |
| VII. Tout est paramétrable | ✅ PASS (renforcé) | Les défauts restent modifiables et exportables ; ils ne sont pas « cachés » mais centralisés en une source lisible. |
| VIII. Simplicité / YAGNI | ✅ PASS | 1 JSON + 1 loader mince ; aucune dépendance nouvelle ; pas d'abstraction spéculative. |
| IX. Spéc. fonctionnelle source de vérité | ⚠️ ACTION | Les valeurs par défaut (params humain, gaussienne, catalogue…) sont décrites dans `rsrc/DescriptionProjet.md`. **Avant tout code**, mettre à jour §concernés (`.md` puis `.adoc`, recompilation `.pdf` par l'auteur) **avec autorisation de l'auteur** (l'auteur pilote cette feature). Voir research.md R7. |
| X. Anonymat de l'auteur | ✅ PASS | Aucune identité ; commits `KingsCookie`. |

**Verdict** : 9/10 PASS, 1 action (Principe IX) à réaliser avant `/speckit-implement`. Aucune violation nécessitant « Complexity Tracking ».

## Project Structure

### Documentation (this feature)

```text
specs/017-config-defaults/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 (décisions R1→R7)
├── data-model.md        # Phase 1 (entités défauts + invariants)
├── quickstart.md        # Phase 1 (tests seed-fixe + checklist manuelle)
├── contracts/
│   └── core-contract.md # Phase 1 (invariants INV-C1→C…)
└── tasks.md             # Phase 2 (/speckit-tasks — NON créé ici)
```

### Source Code (repository root)

```text
src/core/
├── default/                     # NOUVEAU — source unique centralisée des défauts
│   ├── defaultConfig.json       #   copie verbatim des blocs catalog/especes/parameters (seed neutralisée)
│   └── defaultConfig.ts         #   typage + accès pur : DEFAULT_CATALOG / DEFAULT_ESPECES / DEFAULT_PARAMETERS + clones
├── catalog/
│   └── defaultCatalog.ts        # MODIFIÉ — defaultCatalog()/defaultEspece()/defaultEspeces() dérivent de default/
├── params/
│   └── parameters.ts            # MODIFIÉ — defaultParameters() dérive de default/ (seed reste '0', override UI)
└── index.ts                     # inchangé (mêmes exports publics)

tests/unit/
├── default-config.test.ts       # NOUVEAU — égalité défauts ↔ fichier de config (source de vérité du test)
├── edit-catalog.test.ts         # RÉALIGNÉ si nécessaire (contenu du catalogue par défaut change)
├── edit-especes.test.ts         # RÉALIGNÉ (reproPeakPct 40→20, etc.)
├── gaussian.test.ts             # RÉALIGNÉ (pic 25→30, pic% 40→20)
└── state.test.ts                # RÉALIGNÉ si assertions sur des valeurs par défaut
```

**Structure Decision** : monolithe statique existant. La seule nouveauté structurelle est le dossier `src/core/default/` matérialisant la **source unique** exigée (FR-006). Les fabriques existantes deviennent de minces adaptateurs vers cette source, ce qui préserve la façade publique `src/core/index.ts` (aucun changement d'API consommée par l'UI).

## Complexity Tracking

> Aucune violation de la Constitution à justifier. Section volontairement vide.
