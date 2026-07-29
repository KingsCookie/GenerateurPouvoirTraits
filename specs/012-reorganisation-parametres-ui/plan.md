# Implementation Plan: Réorganisation de la page Paramètres (onglets Principaux / Avancés + éditeurs en modale)

**Branch**: `012-reorganisation-parametres-ui` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-reorganisation-parametres-ui/spec.md`

**Bugfix**: 2026-07-29 — BUG-001 : (1) section « Catalogues & espèces » déplacée en onglet **Avancés** ; (2) `TraitCatalogEditor` doté d'un **sélecteur de type** (défaut Action, options alphabétiques par libellé, un seul type affiché) — l'ordre `TRAIT_TYPES` du cœur reste **inchangé** (tri d'affichage UI uniquement) ; (3) `SpeciesEditor` : espèce par défaut **« humain »**. Version cible **v0.12.1**. Toujours **zéro modif `src/core`** ; la note R3 « éditeurs rendus inchangés » est nuancée : les deux éditeurs subissent une **modification interne d'ergonomie** (pas de perte de fonction — FR-010).

## Summary

Réorganiser la page Paramètres, aujourd'hui à 8 sections empilées (~30 contrôles simultanés), en
**deux onglets internes** (« Principaux » / « Avancés », onglet « Principaux » actif par défaut) sur
le modèle des onglets de la Sandbox, et déplacer les deux gros éditeurs (**catalogues de traits** et
**espèces & reproduction**) dans des **fenêtres modales** réutilisant le patron de
`SandboxPersonForm` (fermeture Échap / arrière-plan / bouton). Le bouton « Générer la population »
reste **persistant** hors des panneaux d'onglets. **Impératif absolu : aucun paramètre existant
n'est retiré, désactivé ni rendu inaccessible** — la refonte est strictement présentationnelle.

**Approche technique** : intervention confinée à la couche `src/ui` (aucun changement de `src/core`,
du modèle de paramètres, ni du format d'export/import). Réutilisation des patrons UI déjà en place
(onglets `role=tablist` de `SandboxView`, modale autonome de `SandboxPersonForm`). Ajout d'un store
d'interface `paramsTab` persisté en `localStorage` (comme les axes de thème), et de deux composants
modaux enveloppant `TraitCatalogEditor` et `SpeciesEditor` sans modifier leur contenu. Aucune
dépendance nouvelle.

## Technical Context

**Language/Version**: TypeScript 5.x, Svelte (idiomes Svelte 4 : `$:`, stores)

**Primary Dependencies**: Vite, vite-plugin-pwa (inchangées ; **aucune dépendance ajoutée**)

**Storage**: `localStorage` pour l'état d'interface (`paramsTab`) — **hors** état applicatif et
**hors** export/import (Principe VI) ; aucun changement de `FORMAT_VERSION` ni du modèle `Parameters`

**Testing**: Vitest à seed fixe (cœur inchangé → pas de nouveau test cœur requis) ; un test unitaire
pur sur la lecture bornée du choix d'onglet (`readChoice`) ; validation UI par checklist manuelle
(quickstart.md)

**Target Platform**: navigateurs modernes desktop/mobile, PWA statique (GitHub Pages)

**Project Type**: application web statique client-side (SPA/PWA), structure existante `src/core` ↔ `src/ui`

**Performance Goals**: aucun impact mesurable ; le rendu conditionnel d'un seul panneau d'onglet
allège même le DOM par rapport à l'affichage simultané actuel

**Constraints**: hors-ligne préservé ; déterminisme strict (aucune RNG touchée) ; aucun paramètre
retiré ; responsive (barre d'onglets, panneaux et modales sans débordement horizontal)

**Scale/Scope**: une seule page (`ParametresView.svelte`) + `ui.ts` + 2 wrappers modaux ; ~24
paramètres à préserver, répartis entre 2 onglets + 2 modales

## Constitution Check

*GATE : doit passer avant Phase 0. Re-vérifié après Phase 1.*

| Principe | Verdict | Justification |
|---|---|---|
| **I. Déterminisme (seed unique)** | ✅ PASS | Aucune source d'aléatoire touchée ; refonte purement visuelle. SC-004 impose une population strictement identique à graine/actions égales. |
| **II. 100 % statique** | ✅ PASS | Aucun backend, aucun service ; build statique inchangé. |
| **III. PWA & hors-ligne** | ✅ PASS | Comportement PWA inchangé ; responsive préservé (edge cases mobile). |
| **IV. Cœur pur & isolé** | ✅ PASS | **Zéro modification de `src/core`.** Intervention confinée à `src/ui` ; l'UI continue de consommer le cœur sans l'inverse. |
| **V. Tests déterministes du cœur** | ✅ PASS | Cœur inchangé ⇒ aucun test cœur nouveau requis. Ajout d'un test unitaire pur (`readChoice` du choix d'onglet) ; le reste est validé par checklist manuelle (nature UI). |
| **VI. Persistance explicite par fichiers** | ✅ PASS | `paramsTab` est un **état d'interface** (comme `sbTab`, thème) — jamais inclus dans l'export/import. Aucun changement de format ni de `FORMAT_VERSION`. |
| **VII. Tout est paramétrable** | ✅ PASS (renforcé) | **Tous** les paramètres restent exposés et éditables (FR-001/FR-002) ; la feature améliore leur accessibilité sans en cacher aucun de façon irréversible. |
| **VIII. Simplicité & YAGNI** | ✅ PASS | Réutilise les patrons existants (onglets Sandbox, modale `SandboxPersonForm`) ; **aucune dépendance ajoutée** ; un seul niveau d'onglets. |
| **IX. Spécification = source de vérité** | ✅ PASS | `rsrc/DescriptionProjet.md` **ne prescrit pas la mise en page** de la page Paramètres : §8.4 dit seulement qu'elle « affiche notamment la seed… et les courbes », ce qui reste vrai ; §9 décrit *quels* paramètres existent, non leur agencement visuel. Aucune divergence fonctionnelle ⇒ **pas de mise à jour doc ni d'autorisation auteur requises**. |
| **X. Anonymat de l'auteur** | ✅ PASS | Commits sous identité `KingsCookie` sans email ; aucune donnée personnelle introduite. |

**Résultat du gate : PASS (0 violation).** La section « Complexity Tracking » reste vide.

## Project Structure

### Documentation (this feature)

```text
specs/012-reorganisation-parametres-ui/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 — décisions techniques (patrons UI, persistance onglet)
├── data-model.md        # Phase 1 — état d'interface (paramsTab) ; aucune entité métier
├── quickstart.md        # Phase 1 — checklist de validation manuelle + recensement des paramètres
├── contracts/
│   └── ui-contract.md   # Phase 1 — contrat UI (onglets, modales, store, invariants)
├── checklists/
│   └── requirements.md  # (créé par /speckit-specify)
└── tasks.md             # Phase 2 — créé par /speckit-tasks (PAS ici)
```

### Source Code (repository root)

```text
src/
├── core/                         # INCHANGÉ (aucune modification)
└── ui/
    ├── views/
    │   └── ParametresView.svelte # MODIFIÉ : barre d'onglets + 2 panneaux + bouton Générer persistant
    │                             #           + boutons d'ouverture des modales
    ├── stores/
    │   └── ui.ts                 # MODIFIÉ : ajout du store persistant `paramsTab` ('principaux'|'avances')
    └── components/
        ├── TraitCatalogEditor.svelte   # INCHANGÉ (déplacé dans une modale, contenu intact)
        ├── SpeciesEditor.svelte        # INCHANGÉ (déplacé dans une modale, contenu intact)
        ├── ThemeControls.svelte        # INCHANGÉ (rendu dans l'onglet Principaux)
        ├── ResilienceOverrides.svelte  # INCHANGÉ (rendu dans l'onglet Avancés)
        ├── CatalogueModal.svelte       # NOUVEAU : enveloppe modale de TraitCatalogEditor
        └── EspecesModal.svelte         # NOUVEAU : enveloppe modale de SpeciesEditor (+ case consanguinité en tête)

tests/
└── unit/
    └── params-tab-store.test.ts  # NOUVEAU : test pur de readChoice pour l'onglet (défaut + valeur invalide)

package.json                      # MODIFIÉ : version 0.11.1 → 0.12.0
```

**Structure Decision** : structure existante conservée. Le découpage `src/core` (pur) ↔ `src/ui`
(présentation) est respecté sans exception : **toutes** les modifications sont dans `src/ui` +
`package.json` + tests UI. Les deux éditeurs volumineux ne sont **pas réécrits** : ils sont
enveloppés par de fins composants modaux qui réutilisent le patron d'accessibilité de
`SandboxPersonForm` (backdrop cliquable, `Escape`, bouton de fermeture). La case « consanguinité »
migre dans `EspecesModal` en tête de l'éditeur d'espèces (clarification).

## Complexity Tracking

> Aucune violation de la Constitution ⇒ section vide.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
