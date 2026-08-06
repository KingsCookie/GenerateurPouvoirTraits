# Implementation Plan: Espérance de vie, cycle de vie, tris & filtres

**Branch**: `015-esperance-vie-tris-filtres` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-esperance-vie-tris-filtres/spec.md`

## Summary

Lot de 5 évolutions ciblant la simulation temporelle et l'exploration de la liste, cible **v0.14.0** :

1. **Mort naturelle par espèce** — deux paramètres d'espèce (`esperanceVie`, `mortNaturellePct`) et
   une nouvelle étape de tick qui tue les individus vivants, non immortels, d'âge ≥ espérance de
   vie, avec un tirage seedé. Défauts humain 60 ans / 10 %.
2. **Âge suivi & gelé** — l'âge, aujourd'hui **dérivé** de la date de naissance, devient un
   **compteur stocké** sur `Personne` : +1/an pour les vivants, gelé à la mort, repris tel quel à la
   résurrection. La tranche de génération reste dérivée de l'année de naissance (invariante).
3. **Cycle de vie en fiche** — attribut `immortel` (défaut faux) + fonctions cœur `resurrect` et
   `setImmortal` ; boutons « Ressusciter » et case « Immortel » en fiche (mobile + desktop).
4. **Tris puissance & maîtrise** — extension de `SortKey`/`sortPopulation` (règle du pouvoir le plus
   extrême, sans-pouvoir en fin) et des contrôles de tri (mobile + desktop).
5. **Filtres par année de naissance** — `bornNafter`/`bornBefore` (bornes inclusives) dans
   `FilterCriteria`, exclusifs avec le filtre génération ; contrôles mobile + desktop.
6. **Indicateur de chargement** — spinner (flèche circulaire) affiché pendant « avancer », l'UI
   cédant une frame au navigateur avant le calcul synchrone pour garantir sa peinture.

**Approche technique** : toute la logique domaine (mort naturelle, gel/reprise d'âge, résurrection,
immortalité, tris, filtres) vit dans le **cœur pur `src/core`** et reçoit le `Rng` en paramètre ;
`src/ui` ne porte que la présentation (contrôles, spinner, yield asynchrone). Persistance versionnée
`FORMAT_VERSION` 4 → 5 avec migrations à défaut. Aucune dépendance ajoutée.

## Technical Context

**Language/Version**: TypeScript 5.x (ES modules, `.js` en imports)

**Primary Dependencies**: Svelte 5, Vite 5, vite-plugin-pwa (aucune ajoutée par cette feature)

**Storage**: Export/import de fichiers JSON typés (`config`/`data`/`full`), versionnés — Principe VI

**Testing**: Vitest à seed fixe (`tests/unit/`, helper `_fakeRng.ts` avec file `chances`)

**Target Platform**: PWA statique (navigateurs desktop + mobile), déployée sur GitHub Pages

**Project Type**: Application web statique client-side, cœur pur découplé de l'UI

**Performance Goals**: « avancer » doit rester fluide ; le spinner couvre les calculs longs. Le tick
supplémentaire (mort naturelle) est O(population) par année, négligeable.

**Constraints**: 100 % statique / offline ; déterminisme par seed unique ; cœur sans DOM/Svelte ;
tokens seule source de style ; responsive avec seuil unique **760px** (features 013–014) ;
`prefers-reduced-motion` doit couper l'animation du spinner.

**Scale/Scope**: population typiquement 10²–10⁴ individus ; 5 user stories P1→P5 ; ~11 fichiers cœur
et ~10 fichiers UI touchés (cf. Project Structure).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Statut | Justification |
|----------|--------|---------------|
| I. Déterminisme (seed unique) | ✅ PASS | La mort naturelle consomme **uniquement** `rng.chance(mortNaturellePct)` pour les individus **éligibles**, dans l'ordre stable de la population ; aucun `Math.random`/horloge. `resurrect`/`setImmortal` ne consomment pas de RNG. |
| II. 100 % statique client-side | ✅ PASS | Aucun backend ; le spinner et le yield sont purement navigateur. |
| III. PWA multiplateforme | ✅ PASS | Aucun impact SW/manifeste ; toutes les nouveautés disponibles mobile ET desktop (FR-026). |
| IV. Cœur pur isolé (NON NÉGOCIABLE) | ✅ PASS | Mort naturelle, gel/reprise d'âge, résurrection, immortalité, tris, filtres = **`src/core`** (purs, `Rng` en paramètre). L'UI n'ajoute que présentation (spinner, `requestAnimationFrame`). |
| V. Tests déterministes du cœur | ✅ PASS | Nouveaux tests Vitest seed-fixe : mort naturelle (`tick.test.ts`), gel d'âge/génération, résurrection/immortalité (`death.test.ts`), tris (`genealogy-sort.test.ts`), filtres (`genealogy-filter.test.ts`), migration v5 (`state.test.ts`). |
| VI. Persistance explicite par fichiers | ✅ PASS | `FORMAT_VERSION` 4 → 5, migrations à défaut (immortel=faux, age recalculé, champs espèce par défaut) ; pas d'auto-save. |
| VII. Tout est paramétrable | ✅ PASS | `esperanceVie`/`mortNaturellePct` exposés par espèce et exportés ; `immortel` éditable par individu. Défauts raisonnables (60/10/faux). |
| VIII. Simplicité / YAGNI | ✅ PASS | Aucune dépendance ; un seul petit composant `Spinner.svelte` réutilisable + un keyframe CSS. Réutilise les mécaniques de tri/filtre/tick existantes. |
| IX. Spéc = source de vérité (NON NÉGOCIABLE) | ✅ PASS | `rsrc/DescriptionProjet.md`/`.adoc` **déjà mis à jour avec autorisation de l'auteur** (§3.3, §6.5–6.7, §8.1–8.4, §9.4) ; cette feature s'y aligne. |
| X. Anonymat de l'auteur | ✅ PASS | Aucune identité introduite ; commits `KingsCookie`. |

**Résultat** : aucune violation → **Complexity Tracking vide**. Gate franchi.

## Project Structure

### Documentation (this feature)

```text
specs/015-esperance-vie-tris-filtres/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 — décisions R1→R9
├── data-model.md        # Phase 1 — entités & transitions
├── quickstart.md        # Phase 1 — validation manuelle
├── contracts/
│   └── ui-contract.md   # Phase 1 — invariants INV-*
├── checklists/
│   └── requirements.md  # Checklist qualité (déjà présent)
└── tasks.md             # Phase 2 (/speckit-tasks — PAS créé ici)
```

### Source Code (repository root)

```text
src/core/
├── model/
│   ├── personne.ts          # + champ `age: number`, + champ `immortel: boolean`
│   └── espece.ts            # + `esperanceVie: number`, + `mortNaturellePct: number`
├── catalog/defaultCatalog.ts # défauts humain 60 / 10
├── species/editEspeces.ts    # defaultReproParams + validateEspece (bornes)
├── time/tick.ts              # étape « vieillissement » explicite + étape « mort naturelle »
├── life/death.ts             # + `resurrect(state,id)` + `setImmortal(state,id,bool)`
├── genealogy/filter.ts       # SortKey +puissance/+maitrise ; FilterCriteria +bornNafter/+bornBefore
├── genesis/genesis.ts        # init `age`/`immortel` à la genèse
├── birth/reproduce.ts        # naissance → age 0, immortel false
├── sandbox/sandbox.ts        # create/clone → init age/immortel
├── state/serialize.ts        # FORMAT_VERSION 5 + migrations
└── index.ts                  # exports resurrect/setImmortal

src/ui/
├── stores/
│   ├── appState.ts          # resurrectPerson, setImmortal, advancing (état chargement)
│   ├── filters.ts           # bornNafter/bornBefore + exclusivité génération
│   └── ui.ts                # (éventuel) helpers tri P/M
├── views/
│   ├── ListeView.svelte     # en-têtes tri P/M ; désactivation filtre génération
│   └── FicheView.svelte     # Ressusciter + Immortel (mobile + desktop)
├── components/
│   ├── FilterBar.svelte     # tris P/M + filtres année (mobile + desktop)
│   ├── TimeBar.svelte       # spinner + yield async
│   ├── SpeciesEditor.svelte # 2 champs d'espèce (section avancés)
│   └── Spinner.svelte       # NOUVEAU — flèche circulaire en rotation
├── lib/ficheViewModel.ts    # expose `immortel`, lit `age` suivi
└── app.css                  # @keyframes spin (+ prefers-reduced-motion)

tests/unit/
├── tick.test.ts             # mort naturelle, vieillissement, gel d'âge
├── death.test.ts            # résurrection, immortalité
├── genealogy-sort.test.ts   # tris puissance/maîtrise + sans-pouvoir en fin
├── genealogy-filter.test.ts # filtres année + exclusivité génération
├── state.test.ts            # migration v4→v5
└── edit-especes.test.ts     # validation nouveaux champs espèce
```

**Structure Decision** : structure mono-projet existante conservée (cœur `src/core` ↔ UI `src/ui`,
tests `tests/unit/`). Aucune nouvelle couche ni dépendance ; extension des modules existants +
un composant `Spinner.svelte` isolé.

## Complexity Tracking

> Aucune violation de la Constitution Check — section vide.
