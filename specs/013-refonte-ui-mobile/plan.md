# Implementation Plan: Refonte de l'UI mobile (direction 1a « Dense & rangé »)

**Branch**: `013-refonte-ui-mobile` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-refonte-ui-mobile/spec.md`

## Summary

Recréer, dans l'environnement Svelte existant, les cinq écrans mobiles de la maquette haute-fidélité
`design_handoff_refonte_mobile_1a/` (direction **1a** validée) plus le chrome commun, afin que
l'application soit utilisable sur téléphone (objectif : ≥ 8 individus visibles sans défiler, aucun
tableau à défilement horizontal, filtres hors du flux). **Contraintes absolues** : le desktop reste
strictement inchangé, les thèmes (mode × palette × style A→F) et tous les tokens de `src/app.css`
restent l'unique source de vérité, et `src/core/**` n'est pas touché. Cible **v0.13.0**.

**Approche technique** : intervention confinée à la couche `src/ui` + `src/app.css`, exclusivement via
des blocs `@media (max-width: 760px)` (seuil unique retenu en clarification, en remplacement des
seuils hétérogènes actuels 640/720/760 px) ou des variantes de rendu conditionnées par la largeur.
Aucune dépendance ajoutée, aucun store métier nouveau : uniquement des états d'interface **locaux non
persistés** (feuille de filtres, feuille d'actions, sous-page apparence, sous-écrans de traits). Les
« feuilles » (bottom sheets / plein écran) réutilisent le patron modale existant
(`SandboxPersonForm` : overlay, Échap, backdrop, focus). Les glyphes sont ceux déjà employés ; les
polices sont déjà auto-hébergées et précachées.

## Technical Context

**Language/Version**: TypeScript 5.x, Svelte (idiomes Svelte 4 : `$:`, stores, `{#if}`)

**Primary Dependencies**: Vite, vite-plugin-pwa (inchangées — **aucune dépendance ajoutée**)

**Storage**: `localStorage` pour les préférences d'interface **déjà** persistées (thème, taille de
page, `paramsTab`, mode ADN) ; les nouveaux états d'interface (feuilles, sous-pages) sont **de
session, non persistés** ; **aucun** changement de `FORMAT_VERSION` ni du modèle métier

**Testing**: Vitest à seed fixe (cœur **inchangé** → aucun test cœur nouveau requis) ; validation par
**checklist manuelle** responsive (quickstart.md) : 390 × 844 px + points de bascule 760 px + matrice
styles/palettes/modes

**Target Platform**: navigateurs mobiles et desktop, PWA statique (GitHub Pages) ; cadre de maquette
390 × 844 px

**Project Type**: application web statique client-side (SPA/PWA), structure existante `src/core` (pur)
↔ `src/ui` (présentation)

**Performance Goals**: aucun budget nouveau ; le rendu mobile (listes en `flex` au lieu de grilles/
tableaux) reste léger ; pas de recalcul métier ajouté

**Constraints**: desktop (≥ 760 px) **strictement identique** ; thèmes et tokens seule source de
vérité (aucune valeur codée en dur) ; `src/core` intact ; cibles tactiles ≥ 44 px (36–40 px pour
icônes secondaires, jamais < 32 px) ; `prefers-reduced-motion` respecté

**Scale/Scope**: 12 composants/vues `src/ui` + `src/app.css`, 6 user stories, ~36 exigences ; seuil
unique 760 px

## Constitution Check

*GATE : doit passer avant Phase 0. Re-vérifié après Phase 1.*

| Principe | Verdict | Justification |
|---|---|---|
| **I. Déterminisme (seed unique)** | ✅ PASS | Aucune RNG/horloge/id aléatoire ajouté ; refonte purement présentationnelle (FR-005). |
| **II. 100 % statique** | ✅ PASS | Aucun backend ; build statique inchangé. |
| **III. PWA & hors-ligne** | ✅ PASS | Comportement PWA inchangé ; polices déjà précachées ; responsive **amélioré** (cœur de la feature). |
| **IV. Cœur pur & isolé** | ✅ PASS | **Zéro modification de `src/core`** (FR-005) ; seule la couche `src/ui`/`app.css` change. |
| **V. Tests déterministes du cœur** | ✅ PASS | Cœur inchangé ⇒ aucun test cœur nouveau ; `npm run test` doit rester vert (SC-008). Validation UI par checklist manuelle (nature responsive). |
| **VI. Persistance explicite par fichiers** | ✅ PASS | Aucun format touché ; nouveaux états d'interface **non persistés** ; préférences existantes inchangées (FR-035). |
| **VII. Tout est paramétrable** | ✅ PASS | Tous les paramètres restent accessibles sur mobile (Paramètres réorganisés, pas amputés) ; thème pleinement réglable (FR-004). |
| **VIII. Simplicité & YAGNI** | ✅ PASS | Réutilise le patron modale existant pour les feuilles ; **aucune dépendance**, aucun framework CSS ; états locaux minimaux. |
| **IX. Spécification = source de vérité** | ✅ PASS | `rsrc/DescriptionProjet.md` ne prescrit pas l'agencement mobile (§8 décrit les pages, pas leur responsive) ; aucun comportement fonctionnel modifié ⇒ **pas de maj doc ni d'autorisation auteur**. |
| **X. Anonymat de l'auteur** | ✅ PASS | Commits `KingsCookie` sans email ; aucune donnée personnelle introduite ; le dossier de handoff n'est pas réintégré. |

**Résultat du gate : PASS (0 violation).** Section « Complexity Tracking » vide.

## Project Structure

### Documentation (this feature)

```text
specs/013-refonte-ui-mobile/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 — décisions (breakpoint, feuilles, barres, hors-barème…)
├── data-model.md        # Phase 1 — états d'interface locaux ; aucune entité métier
├── quickstart.md        # Phase 1 — checklist de validation manuelle responsive
├── contracts/
│   └── ui-contract.md   # Phase 1 — contrat UI par écran + invariants INV-M*
├── checklists/
│   └── requirements.md  # (créé par /speckit-specify)
└── tasks.md             # Phase 2 — créé par /speckit-tasks (PAS ici)
```

### Source Code (repository root)

```text
src/
├── core/                              # INCHANGÉ (interdit de toucher — FR-005)
├── app.css                            # + blocs @media (max-width: 760px) ; harmonisation du seuil
└── ui/
    ├── App.svelte                     # Chrome mobile : en-tête 2 rangées, nav segmentée, feuille export
    ├── components/
    │   ├── StateIO.svelte             # < 760 px : icônes sans libellés, .io-bar masquée, feuille export
    │   ├── TimeBar.svelte             # < 760 px : barre de temps compacte + stepper
    │   ├── FilterBar.svelte           # < 760 px : bouton ⚙ Filtrer + puces ; panneau plein écran (Pop. + Sandbox)
    │   ├── Paginator.svelte           # < 760 px : flèches ‹ › seules en liste ; segments dans le panneau
    │   ├── ThemeControls.svelte       # variant full réutilisé dans la sous-page « Apparence » (logique inchangée)
    │   ├── TraitModeSelector.svelte   # < 760 px : puces compactes 1/2/3
    │   ├── ResilienceOverrides.svelte # < 760 px : table « Par type » → lignes/cartes (BUG-001, ne débordait pas prévu)
    │   ├── CatalogueModal.svelte      # < 760 px : plein écran (au lieu de modale centrée)
    │   ├── EspecesModal.svelte        # < 760 px : plein écran
    │   └── MobileSheet.svelte (NOUVEAU, optionnel)  # enveloppe « feuille » réutilisable (patron SandboxPersonForm)
    └── views/
        ├── ListeView.svelte           # < 760 px : lignes flex (plus de grille), barre filtres collante
        ├── FicheView.svelte           # < 760 px : identité d'abord, arbre = entrée, barres de mesure hors-barème
        ├── ParametresView.svelte      # < 760 px : cartes à lignes, sous-page Apparence, éditeurs plein écran
        ├── SandboxView.svelte         # < 760 px : lignes (plus de table), lentille curseur, barre d'action contextuelle
        └── ArbreView.svelte           # < 760 px : contrôles en 2 rangées, viewport clamp(20rem,62vh,34rem)

package.json                           # version 0.12.1 → 0.13.0
```

**Bugfix**: 2026-07-30 — BUG-001 : `ResilienceOverrides.svelte` (éditeur imbriqué dans les `fieldset`
Avancés) ajouté à la liste des fichiers portant un traitement `@media (max-width: 760px)` — omis à la
planification initiale, sa table « Par type de trait » débordait horizontalement sous 760 px. Le
correctif reste confiné au mobile (INV-M1/SC-004) et n'utilise que des tokens (INV-M2).

**Structure Decision** : structure existante conservée ; séparation `src/core` (pur) ↔ `src/ui`
respectée sans exception. Toutes les modifications sont dans `src/ui` + `src/app.css` +
`package.json`. Le seuil **760 px** devient l'unique frontière mobile/desktop : les blocs
`@media (max-width: 640px)` (app.css, ListeView) et `(max-width: 720px)` (FicheView) sont
**réécrits en 760 px**, `ParametresView` (déjà 760) est conservé, et `StateIO`
(`min-width: 40rem` = 640 px) est porté à `min-width: 760px`. Un composant `MobileSheet.svelte`
peut factoriser le patron « feuille » (overlay + Échap + backdrop + focus piégé) réutilisé par la
feuille d'export, la feuille d'actions Sandbox, la feuille de confirmation « Tuer… » et les
sous-pages plein écran ; sinon on réutilise directement le patron de `SandboxPersonForm`
(décision tranchée en research R2).

## Complexity Tracking

> Aucune violation de la Constitution ⇒ section vide.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
