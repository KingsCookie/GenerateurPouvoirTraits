# Implementation Plan: Révision de l'algorithme de transformation d'une sous-liste en pouvoir

**Branch**: `016-revision-algo-pouvoir` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-revision-algo-pouvoir/spec.md`

## Summary

Réviser l'algorithme §6.4.2 (`traits → pouvoir`) pour que **certaines feuilles produisent deux pouvoirs** au lieu d'un, avec un **jeton `Kx` partagé** (un seul tirage réutilisé), des **P/M indépendantes** par pouvoir, et des **libellés révisés** sur 24 feuilles. Changement **localisé** au cœur pur `src/core/powers` : `powerLabelTree.ts` (l'arbre renvoie 1 ou 2 gabarits) et `traitsToPowers.ts` (`transformSublist` renvoie `Pouvoir[]` de 0 à 2, résout les `K` partagés une fois, suffixe l'id par index). Tous les points de génération (genèse, reproduction, régénération, make-it-real) passent par `derivePowersFromTraits` et bénéficient donc du changement sans modification propre. Cible **v0.15.0**. Aucune dépendance ajoutée, aucune migration de persistance.

## Technical Context

**Language/Version**: TypeScript 5.x (ESM, `strict`)

**Primary Dependencies**: Svelte 5, Vite 5, vite-plugin-pwa — **aucune nouvelle dépendance**

**Storage**: export/import de fichiers JSON typés (`config`/`data`/`full`), `FORMAT_VERSION` **inchangé** (pas de migration : les pouvoirs déjà sérialisés ne sont pas recalculés)

**Testing**: Vitest à **seed fixe** (cœur pur), plus tests de non-régression sur l'arbre complet

**Target Platform**: navigateur (PWA statique), déployée sur GitHub Pages

**Project Type**: application PWA statique, single-project (`src/core` pur ↔ `src/ui`)

**Performance Goals**: transformation en O(nombre de traits) par individu ; au plus **2×** de pouvoirs sur les feuilles concernées ⇒ impact négligeable sur les listes/arbres existants

**Constraints**: déterminisme par seed unique (RNG en paramètre, **ordre de tirage fixe**) ; cœur pur sans DOM/Svelte ; parité de comportement sur tous les points de génération ; §6.4.2 (`rsrc/DescriptionProjet.md`) fait foi

**Scale/Scope**: populations jusqu'à ~10⁴–10⁵ individus ; 24 feuilles révisées sur l'arbre §6.4.2 ; 2 fichiers cœur modifiés + tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Verdict | Justification |
|---|---|---|
| I. Déterminisme (seed unique) | ✅ PASS | RNG passé en paramètre ; **ordre de tirage fixe** défini en research (K partagés d'abord, puis P/M par pouvoir dans l'ordre de la liste). Aucun `Math.random`/horloge. |
| II. 100 % statique / client-side | ✅ PASS | Aucun backend ; logique pure côté client. |
| III. PWA multiplateforme | ✅ PASS | Aucun changement d'installabilité/hors-ligne/responsive. |
| IV. Cœur pur isolé | ✅ PASS | Modifs confinées à `src/core/powers/{powerLabelTree,traitsToPowers}.ts` ; UI inchangée (clé d'affichage = libellé). |
| V. Tests déterministes | ✅ PASS | Tests seed-fixe par feuille modifiée + non-régression + `Kx` partagé + déterminisme. |
| VI. Persistance explicite versionnée | ✅ PASS | `FORMAT_VERSION` inchangé ; aucune migration (pas de recalcul des pouvoirs existants). |
| VII. Tout paramétrable | ✅ PASS | `generationK`, `duplicationD` déjà paramètres ; aucun nouveau chiffre codé en dur. |
| VIII. Simplicité / YAGNI | ✅ PASS | Changement minimal et localisé, aucune abstraction ni dépendance ajoutée. |
| IX. Spéc source de vérité | ✅ PASS | §6.4.2 `.md`/`.adoc`/`.pdf` **déjà mis à jour et validés** par l'auteur ; le code s'y aligne. |
| X. Anonymat auteur | ✅ PASS | Identité `KingsCookie`, aucun nom/email. |

**Constitution Check : 10/10 PASS.** Aucune entrée dans « Complexity Tracking ».

## Project Structure

### Documentation (this feature)

```text
specs/016-revision-algo-pouvoir/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 (décisions : ordre RNG, forme de retour, id, traitIds)
├── data-model.md        # Phase 1 (entités : Pouvoir, sous-liste, jeton K partagé)
├── quickstart.md        # Phase 1 (tests + checklist manuelle)
├── contracts/
│   └── core-contract.md # Phase 1 (invariants powerLabelFromSublist / transformSublist)
└── tasks.md             # Phase 2 (/speckit-tasks — non créé ici)
```

### Source Code (repository root)

```text
src/core/powers/
├── powerLabelTree.ts     # MODIFIÉ : treeTemplate renvoie 1 ou 2 gabarits (24 feuilles révisées)
├── traitsToPowers.ts     # MODIFIÉ : transformSublist → Pouvoir[] (0–2) ; résolution K partagée ; id #index
├── inheritStats.ts       # INCHANGÉ (P/M par pouvoir, déjà mappé par index côté appelants)
├── regenerate.ts         # INCHANGÉ (map sur pouvoirs → auto-gère 2 pouvoirs)
└── strongMutation.ts     # INCHANGÉ (hors §6.4.2)

src/core/birth/reproduce.ts    # INCHANGÉ (map sur pouvoirs → auto-gère 2 pouvoirs)
src/core/genesis/genesis.ts    # INCHANGÉ (passe par derivePowersFromTraits)

tests/unit/
├── power-label-tree.test.ts    # ÉTENDU : 24 feuilles révisées + non-régression feuilles inchangées
├── traits-to-powers.test.ts    # ÉTENDU/NOUVEAU : 2 pouvoirs, Kx partagé, échec K, id unique/personne
└── regenerate-powers.test.ts   # ÉTENDU : P/M indépendantes des 2 pouvoirs

package.json                    # version 0.14.1 → 0.15.0 (à l'implémentation)
```

**Structure Decision** : single-project existant. Le cœur métier reste dans `src/core/powers` ; l'UI n'est pas touchée (elle affiche les libellés et cle par libellé). Les tests Vitest à seed fixe couvrent le cœur.

## Complexity Tracking

*Aucune violation de la Constitution — section non requise.*
