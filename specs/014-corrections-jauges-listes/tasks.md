---
description: "Task list — Corrections UI : jauges P/M à états extrêmes, listes mobiles, bulle extensible"
---

# Tasks: Corrections UI — listes mobiles, bulles extensibles, jauges P/M à états extrêmes

**Input**: Design documents from `specs/014-corrections-jauges-listes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md, `rsrc/jauges-etats-extremes.md`

**Tests**: le document de référence (§8) **exige** un test unitaire de la fonction de dérivation
d'état (pure). C'est le seul test nouveau ; les tests du cœur restent inchangés.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance sur une tâche incomplète)
- **[Story]** : US1…US4

## Contraintes transverses (à respecter dans CHAQUE tâche)

- **`src/core` interdit** (FR-019/INV-J1) : toute logique nouvelle vit dans `src/ui` ; la fonction
  d'état va dans `src/ui/lib`, jamais dans `src/core`. `rsrc/DescriptionProjet.md` non modifié
  (§7.2 inchangé).
- **Tokens seule source** (FR-020/INV-J2) : couleurs/polices/rayons/graisses uniquement via variables
  `src/app.css` ; aucune valeur en dur ; rendu correct 6 styles × 6 palettes × 2 modes.
- **Desktop ≥ 760 px inchangé** (INV-J3) **sauf** l'ajout **voulu** des jauges dans la fiche desktop
  (FR-009/SC-008).
- **Aucune dépendance ajoutée** ; déterminisme préservé ; seuil mobile **760 px**.

---

## Phase 1: Setup

- [X] T001 Bumper la version dans [package.json](../../package.json) de `0.13.1` à `0.13.2` (INV-J4/FR-021).

---

## Phase 2: User Story 1 — Jauges P/M à états extrêmes, mobile ET desktop (Priority: P1) 🎯 MVP

**Goal**: un composant de jauge partagé (rompu / normal / surchargé) rendu à l'identique sur mobile
et desktop, conforme à `rsrc/jauges-etats-extremes.md`.

**Independent Test**: ouvrir une fiche (mobile **et** desktop) et vérifier les 3 états avec
`-1, 0, 5, 10, 11, 17` ; effets identiques sur les deux plateformes.

- [X] T002 [P] [US1] Créer [src/ui/lib/gauge.ts](../../src/ui/lib/gauge.ts) : type `GaugeState = 'broken' | 'normal' | 'overloaded'` et fonction **pure** `gaugeState(value: number, max = 10)` (`v<0`→`broken` ; `0≤v≤max`→`normal` ; `v>max`→`overloaded`). Aucune dépendance DOM/Svelte (FR-002/FR-008 ; data-model).
- [X] T003 [US1] Créer [tests/unit/gauge.test.ts](../../tests/unit/gauge.test.ts) couvrant `gaugeState` aux bornes `-1, 0, 10, 11` (+ `5`, `17`) : `-1→broken`, `0→normal`, `10→normal`, `11→overloaded` (FR-008/SC-001). Dépend de T002.
- [X] T004 [US1] Créer [src/ui/components/Gauge.svelte](../../src/ui/components/Gauge.svelte) (props `label`, `value`, `max=10`) : en-tête (label + **valeur réelle** sans clamp) + rail ; état porté par une **classe** (`gauge--broken`/`gauge--overloaded`) via `gaugeState` (INV-J5). `normal` = remplissage `v/max`, aucune animation (INV-J6). `overloaded` = remplissage 100 % + bandes animées + onde, rail `overflow:hidden` + masque des bandes sur 20 % finaux → **rien ne sort du rail** (INV-J7/SC-002), extrémité droite continue, **pas** de glitch/flash. `broken` = 2 tronçons, aucun remplissage, aucune animation, hauteur de conteneur réservée (INV-J8/INV-J10/SC-003). `role="meter"` avec `aria-valuenow` réel + min/max + `aria-label` explicite ; couleur valeur `var(--danger)`/`var(--accent-text)` ; dégradé `var(--accent)`→`var(--accent-text)`, halo `var(--year-shadow)`, tous mappés sur **tokens** (INV-J2/INV-J9 ; research R2). `@media (prefers-reduced-motion: reduce)` coupe les 2 animations (FR-007/SC-004). Dépend de T002.
- [X] T005 [US1] Dans [src/ui/views/FicheView.svelte](../../src/ui/views/FicheView.svelte), **mobile** : remplacer le rendu ad hoc `.meter-row`/`.fill.over`/`.cap` (et helpers `barPct`/`isOver` devenus inutiles) par `<Gauge label value />` pour Puissance et Maîtrise (INV-J11/INV-J12). Dépend de T004.
- [X] T006 [US1] Dans [src/ui/views/FicheView.svelte](../../src/ui/views/FicheView.svelte), **desktop** : remplacer le texte `Puissance : X / 10 / Maîtrise : X / 10` (bloc `.stats`) par les mêmes `<Gauge>` → jauges identiques mobile/desktop (INV-J11/FR-009/SC-008). Dépend de T005 (même fichier).

**Checkpoint**: jauges opérationnelles sur les deux plateformes ; test unitaire vert.

---

## Phase 3: User Story 2 — Date de naissance complète dans la liste Population (Priority: P2)

**Goal**: afficher la date de naissance complète sur mobile.

**Independent Test**: à 390 × 844 px, chaque ligne Population montre la date complète, identique à la
fiche.

- [X] T007 [P] [US2] Dans [src/ui/views/ListeView.svelte](../../src/ui/views/ListeView.svelte), sous 760 px : dans la méta de ligne (`.mmeta`), remplacer `an {yearOf(row.dateNaissance)}` par la **date de naissance complète** `{row.dateNaissance}` (format identique à la fiche/table desktop) ; retirer l'import `yearOf` s'il devient inutilisé (INV-J13/FR-010/SC-005). Desktop inchangé (INV-J14).

**Checkpoint**: dates complètes en liste Population mobile.

---

## Phase 4: User Story 3 — Liste Sandbox alignée sur Population + « ⋯ » (Priority: P2)

**Goal**: lignes Sandbox = lignes Population + bouton « ⋯ » ; tap corps = aucune navigation.

**Independent Test**: à 390 × 844 px, comparer une ligne Population et une ligne Sandbox : mêmes
champs, la Sandbox ayant en plus « ⋯ ».

- [X] T008 [P] [US3] Dans [src/ui/views/SandboxView.svelte](../../src/ui/views/SandboxView.svelte), sous 760 px (hors mode reproduction) : aligner la ligne (`.sb-mrow`) sur le format Population (nom + `†` si décédé, **date de naissance complète**, âge, espèce, génération, **puces de pouvoirs `P/M`**), en réutilisant le même view-model de ligne que Population ; conserver le bouton « ⋯ » ouvrant la feuille d'actions existante (Éditer/Cloner/Régénérer/Supprimer) (INV-J15/FR-012/FR-013). Le corps de ligne **n'est pas** un bouton de navigation : **aucun** `on:click` de navigation sur le corps (INV-J16/FR-014). Le **mode reproduction** (cases à cocher + marquage sélection mix accent 24 % + liseré) reste **inchangé** (INV-J17). Desktop Sandbox inchangé (INV-J17/FR-015). Cohérent avec le format retenu en T007.

**Checkpoint**: parité visuelle Population/Sandbox sur mobile.

---

## Phase 5: User Story 4 — Bulle « Avancer » extensible (Priority: P3)

**Goal**: la bulle de saisie grandit avec le contenu jusqu'à une largeur max sans casser la barre.

**Independent Test**: mobile, saisir 3–4 chiffres dans « Avancer » : tout est visible, la barre reste
sur une ligne.

- [X] T009 [P] [US4] Dans [src/ui/components/TimeBar.svelte](../../src/ui/components/TimeBar.svelte), sous 760 px : rendre la largeur du champ « Avancer » fonction de la longueur de la valeur — largeur = `clamp(<min ≈ 2 ch>, calc(longueur en ch + padding), <max>)` liée réactivement à `String(years).length` ; borne haute choisie pour que « an XXX », `−`, champ, `+`, « Avancer » restent sur **une seule ligne** (`flex-wrap: nowrap` déjà en place) ; au-delà, le champ cesse de grandir, **aucun** débordement horizontal (INV-J18/FR-016/FR-017/SC-007). Desktop inchangé (INV-J19/FR-018).

**Checkpoint**: saisie « Avancer » confortable sans casse de mise en page.

---

## Phase 6: Polish & portes de qualité

- [X] T010 [P] Portes de qualité : `npm run test` (dont `tests/unit/gauge.test.ts`, cœur inchangé vert), `npm run build` (`tsc --noEmit && vite build`), `npm run lint` (eslint + prettier) tous verts (SC-009).
- [ ] T011 [P] Dérouler la **checklist manuelle** de [quickstart.md](./quickstart.md) via `npm run dev` (390 × 844 px + bascule 760 px + matrice thèmes A/E clair/sombre sur les jauges). *(Validation navigateur à confirmer par l'auteur avant prod.)*
- [X] T012 Vérifier que le pied de page affiche **v0.13.2** après build (INV-J4).

---

## Dependencies & ordre d'exécution

- **Setup (T001)** : indépendant.
- **US1 (T002→T006)** : `T002` (lib pure) prérequis de `T003` (test) et `T004` (composant) ;
  `T004`→`T005`→`T006` séquentiels (T005/T006 même fichier `FicheView.svelte`).
- **US2 (T007)** : indépendant (`ListeView.svelte`).
- **US3 (T008)** : indépendant côté fichier (`SandboxView.svelte`) ; **suit logiquement T007** pour
  le format de date/ligne commun (pas de dépendance de code stricte).
- **US4 (T009)** : indépendant (`TimeBar.svelte`).
- **Polish (T010–T012)** : après l'implémentation ; `T010`‖`T011` ; `T012` en dernier.

**Ordre recommandé** : T001 → T002 → (T003 ‖ T004) → T005 → T006 → T007 → T008 → T009 → T010/T011 → T012.

## Parallélisation

- `T002` (nouveau fichier lib) ‖ rien au départ ; puis `T003` (test) ‖ `T004` (composant) — fichiers
  distincts.
- Une fois `T004` fait, les correctifs d'écrans indépendants sont parallélisables entre eux car sur
  **fichiers distincts** : `T007` (`ListeView`) ‖ `T008` (`SandboxView`) ‖ `T009` (`TimeBar`).
- ⚠️ **Non parallélisable** : `T005` et `T006` (même fichier `FicheView.svelte`).

## Implementation strategy (MVP first)

- **MVP = US1** (jauges P/M sur les deux plateformes) : c'est le cœur visuel du lot et il est
  indépendamment livrable/testable (composant + test unitaire + intégration fiche).
- Incréments suivants indépendants : US2 (date Population), US3 (parité Sandbox), US4 (bulle
  extensible) — chacun livrable seul.
