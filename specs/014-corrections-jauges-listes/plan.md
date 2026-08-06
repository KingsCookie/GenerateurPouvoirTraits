# Implementation Plan: Corrections UI — listes mobiles, bulles extensibles, jauges P/M à états extrêmes

**Branch**: `014-corrections-jauges-listes` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-corrections-jauges-listes/spec.md`

## Summary

Lot de corrections d'interface (v0.13.1 → **v0.13.2**), **UI uniquement** (`src/ui`), sans toucher
`src/core`, le modèle, ni le déterminisme. Cinq changements, ordonnés :

1. **Composant de jauge partagé** (`Gauge.svelte`) + fonction d'état **pure** (`src/ui/lib`)
   implémentant les 3 états de `rsrc/jauges-etats-extremes.md` : `rompu` (`v<0`), `normal`
   (`0≤v≤10`), `surchargé` (`v>10`), avec couleurs remappées sur les **tokens existants**.
2. **Intégration fiche mobile ET desktop** : le composant remplace les barres mobiles actuelles et
   le texte P/M desktop → jauges identiques sur les deux plateformes.
3. **Liste Population mobile** : afficher la **date de naissance complète** (déjà disponible dans
   `row.dateNaissance`) au lieu de `yearOf(...)`.
4. **Liste Sandbox mobile** : réaligner la ligne sur le format Population (mêmes champs + puces
   pouvoirs) **plus** le bouton « ⋯ » ; tap sur le corps = aucune navigation (clarif. 2026-08-06).
5. **Bulle de saisie extensible** : la bulle « Avancer » (et champs numériques compacts analogues)
   grandit avec le contenu jusqu'à une largeur max qui garde la barre sur une ligne.

## Technical Context

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Svelte, Vite, vite-plugin-pwa (aucune dépendance ajoutée)

**Storage**: N/A — aucun changement de persistance ; états de présentation non persistés

**Testing**: Vitest (seed fixe pour le cœur, inchangé) ; **nouveau test unitaire pur** pour la
fonction de dérivation d'état des jauges (bornes `-1, 0, 10, 11`)

**Target Platform**: PWA statique (navigateurs desktop + mobile), GitHub Pages

**Project Type**: application web statique (cœur pur `src/core` + UI `src/ui`)

**Performance Goals**: 60 fps ; l'état `rompu` est **statique** (pas d'animation, lisible en liste
longue) ; l'état `surchargé` utilise 2 animations CSS bornées, coupées par `prefers-reduced-motion`

**Constraints**: desktop ≥ 760 px inchangé **sauf** l'ajout volontaire des jauges dans la fiche
(demande explicite) ; thèmes/tokens seule source ; `src/core` intact ; aucune valeur en dur

**Scale/Scope**: 5 fichiers UI env. + 1 nouveau composant + 1 lib + 1 test ; montée de version patch

## Constitution Check

*GATE : doit passer avant Phase 0. Re-vérifié après Phase 1.*

| Principe | Verdict | Justification |
|---|---|---|
| I. Déterminisme seed unique | ✅ PASS | Aucun accès RNG/horloge ; jauges purement présentationnelles. |
| II. 100 % statique | ✅ PASS | Aucun backend ; build statique inchangé. |
| III. PWA responsive/offline | ✅ PASS | Améliore la lisibilité mobile ; aucun impact SW. |
| IV. Cœur pur isolé | ✅ PASS | Fonction d'état dans `src/ui/lib` (présentation), **pas** dans `src/core` ; `src/core` **intact**. |
| V. Tests déterministes | ✅ PASS | Fonction d'état **pure** couverte par Vitest aux bornes (FR-008) ; tests cœur inchangés restent verts. |
| VI. Persistance explicite | ✅ PASS | Aucun auto-save ; aucun format d'export touché ; état de présentation non persisté. |
| VII. Tout paramétrable | ✅ PASS | Aucun nouveau comportement chiffré métier ; seuils d'état (`0`,`10`) dictés par §7.2, pas des paramètres UI. |
| VIII. Simplicité / YAGNI | ✅ PASS | Un composant partagé réutilisé ; réemploi du format de ligne existant ; aucune abstraction superflue. |
| IX. Spéc. fonctionnelle source de vérité | ✅ PASS | `rsrc/DescriptionProjet.md` **non modifié** ; §7.2 (P/M) inchangé — seul l'affichage change. |
| X. Anonymat auteur | ✅ PASS | Commits `KingsCookie`, email vide ; aucune donnée perso. |

**Note « desktop inchangé »** : c'est une contrainte **de la feature 013**, pas un principe
constitutionnel. La constitution n'interdit pas de faire évoluer le desktop. L'ajout des jauges dans
la fiche desktop est **explicitement demandé** ; il est cadré (fiche uniquement) et documenté
(FR-009/SC-008). Aucune violation, aucune entrée « Complexity Tracking » nécessaire.

## Project Structure

### Documentation (this feature)

```text
specs/014-corrections-jauges-listes/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 : décisions R1→R6
├── data-model.md        # Phase 1 : état de présentation dérivé (aucune entité)
├── quickstart.md        # Phase 1 : checklist de validation manuelle + gates
├── contracts/
│   └── ui-contract.md   # Phase 1 : contrat par composant, invariants INV-J1→…
└── tasks.md             # Phase 2 (/speckit-tasks — pas créé ici)
```

### Source Code (repository root)

```text
src/
├── app.css                              # (au besoin) tokens de jauge dérivés des tokens existants
└── ui/
    ├── lib/
    │   └── gauge.ts                      # NOUVEAU : gaugeState(value, max) pur + type GaugeState (testé)
    ├── components/
    │   └── Gauge.svelte                  # NOUVEAU : jauge label+valeur+rail, états normal/surchargé/rompu
    └── views/
        ├── FicheView.svelte             # intègre <Gauge> en mobile ET desktop (remplace barres + texte P/M)
        ├── ListeView.svelte             # < 760 px : méta ligne = date de naissance COMPLÈTE (au lieu de yearOf)
        └── SandboxView.svelte           # < 760 px : ligne alignée sur Population + « ⋯ » ; tap corps = rien
        # TimeBar.svelte (composant)     # < 760 px : bulle « Avancer » extensible (largeur = f(longueur), max borné)

tests/
└── unit/
    └── gauge.test.ts                     # NOUVEAU : bornes -1, 0, 10, 11 (+ valeurs 5, 17)

package.json                              # version 0.13.1 → 0.13.2
```

**Structure Decision** : structure existante conservée (`src/core` pur ↔ `src/ui`). Toute la
logique nouvelle est présentationnelle et vit dans `src/ui` (composant + lib), plus un test unitaire
Vitest. Le seuil mobile reste **760 px** (feature 013). Le composant `Gauge` est **agnostique de la
plateforme** : c'est le même rendu qui sert mobile et desktop (le desktop n'a pas de variante propre,
conformément au document de référence §9).

## Complexity Tracking

*Aucune violation de la Constitution → section vide.*
