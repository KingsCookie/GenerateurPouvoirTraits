---
description: "Task list — Refonte de l'UI mobile (direction 1a)"
---

# Tasks: Refonte de l'UI mobile (direction 1a « Dense & rangé »)

**Input**: Design documents from `specs/013-refonte-ui-mobile/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md, `design_handoff_refonte_mobile_1a/README.md`

**Tests**: feature responsive (cœur inchangé) → aucun test cœur nouveau. Validation par **checklist manuelle** (quickstart.md) ; `npm run test` + `npm run lint` restent verts.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance sur une tâche incomplète)
- **[Story]** : US1…US6

## Contraintes transverses (à respecter dans CHAQUE tâche)

- **Desktop ≥ 760 px strictement inchangé** (FR-002/SC-004) : n'écrire que dans des blocs `@media (max-width: 760px)` ou des variantes conditionnées par la largeur ; ne jamais modifier une règle de base.
- **Thèmes/tokens seule source de vérité** (FR-003/SC-005) : uniquement des variables `src/app.css` ; aucune couleur/police/rayon/graisse codée en dur.
- **`src/core/**` interdit** (FR-005) ; aucune dépendance ajoutée ; aucun store métier nouveau (états d'interface locaux non persistés uniquement).
- **Seuil unique 760 px** (clarification) ; glyphes déjà employés ; feuilles = patron `SandboxPersonForm`/`MobileSheet`.

> ⚠️ **I1 (analyse)** — Le handoff `design_handoff_refonte_mobile_1a/README.md` écrit littéralement `@media (max-width: 640px)`. **Ignorer ce 640** : le seuil retenu est **760 px** (clarification). Suivre les tâches, pas le littéral du handoff.
> ⚠️ **C1 (analyse)** — Convertir aussi les blocs `@media` **existants au niveau composant** vers 760 px, pas seulement `app.css` (T002) : `ListeView.svelte` (640 → 760), `FicheView.svelte` (720 → 760), `ParametresView.svelte` (déjà 760, conservé), `StateIO.svelte` (`min-width: 40rem` → `760px`). Fait dans les tâches de chaque composant concerné.

---

## Phase 1: Setup

- [X] T001 Bumper la version dans [package.json](../../package.json) de `0.12.1` à `0.13.0`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: seuil unique, brique « feuille » réutilisable, et chrome commun — prérequis de toutes les vues.

- [X] T002 [P] Dans [src/app.css](../../src/app.css), harmoniser le seuil mobile à **760 px** : réécrire le bloc `@media (max-width: 640px)` en `@media (max-width: 760px)` (conserver `#app` padding, `min-height` des cibles tactiles, la règle `table` de repli), sans modifier aucune règle de base ; vérifier qu'à ≥ 760 px le rendu est identique.
- [X] T003 [P] Créer [src/ui/components/MobileSheet.svelte](../../src/ui/components/MobileSheet.svelte) : enveloppe « feuille » réutilisable (props `onClose`, `title`, slot) reprenant le patron de [src/ui/components/SandboxPersonForm.svelte](../../src/ui/components/SandboxPersonForm.svelte) — overlay `fixed`, backdrop cliquable, fermeture `Escape`, bouton ✕, focus piégé et rendu au déclencheur ; entrée par translation ~200 ms neutralisée par `prefers-reduced-motion` (INV-M5). Plein écran sous 760 px.
- [X] T004 Dans [src/ui/App.svelte](../../src/ui/App.svelte), refondre le chrome sous 760 px : en-tête en 2 rangées fixes (rangée 1 : logo 28 px + titre tronqué à l'ellipse + 3 boutons icône 36 px « Exporter » / « Importer… » / toggle clair-sombre `ThemeControls variant="toggle"`, chacun avec `aria-label` ; rangée 2 : nav `.nav-item` en segments `flex:1`, séparateur `.sep` masqué, état actif = rendu `app.css`). En-tête `sticky; top:0` ; `AppFooter`/`ScrollToTop` inchangés (FR-007/FR-009).
- [X] T005 Dans [src/ui/components/StateIO.svelte](../../src/ui/components/StateIO.svelte), sous 760 px : masquer les libellés, supprimer la barre `.io-bar` pleine largeur (bandeau teinté), porter `@media (min-width: 40rem)` à `min-width: 760px` ; « Exporter » ouvre une feuille (`MobileSheet`) présentant les 3 exports existants (Configuration / Données / Tout) ; « Importer… » déclenche l'`<input type="file">` existant (FR-008). Conserver le message d'erreur d'import `role="alert"` (`.error-msg`) inchangé (FR-034).

**Checkpoint**: chrome mobile en place (en-tête 2 rangées, nav segmentée, export/import en icônes) ; `npm run build` vert.

---

## Phase 3: User Story 1 — Population lisible (Priority: P1) 🎯 MVP

**Goal**: ≥ 8 individus visibles sans défiler ; filtres hors du flux ; lignes lisibles, tap = fiche.

**Independent Test**: à 390 × 844 px, la Population montre ≥ 8 lignes sans défiler, `.filters` non rendu, « ⚙ Filtrer » présent, tap sur une ligne ouvre la fiche (aucun « ⋯ »).

- [X] T006 [US1] Dans [src/ui/components/TimeBar.svelte](../../src/ui/components/TimeBar.svelte), sous 760 px : barre de temps compacte (année sur une ligne : libellé `an` mono + valeur 22 px accent ; à droite stepper −/valeur/+ 34 px + bouton « Avancer » `button.primary`), champ `<input type="number">` restant accessible et borné `min=1`, désactivé si < 1 (FR-010).
- [X] T007 [US1] Dans [src/ui/views/ListeView.svelte](../../src/ui/views/ListeView.svelte), sous 760 px : **convertir le bloc `@media (max-width: 640px)` existant (ListeView.svelte:256) en 760 px** (C1), puis remplacer la grille `.trow` par des **lignes flex** (colonne texte : nom 15 px + `†` `var(--danger)` si décédé ; méta mono `an … · … ans · espèce · gN` ; puces pouvoirs `.chip` au format `P/M`, « aucun pouvoir » sinon ; chevron `›`). **Aucun bouton « ⋯ »** ; tap sur la ligne = `selectPerson(id)` (clarification). Viser ≥ 8 lignes visibles à 390 × 844 px (FR-013/SC-001).
- [X] T008 [US1] Dans [src/ui/components/FilterBar.svelte](../../src/ui/components/FilterBar.svelte), sous 760 px : ne plus rendre le bloc `.filters` (INV-M6) ; afficher une barre collante « ⚙ Filtrer » (rendu `.nav-item.is-active` + pastille compteur dès ≥ 1 filtre) + rangée de puces défilante (`overflow-x:auto`, masque de dégradé) : une puce par filtre actif avec croix de retrait (appelle l'action de filtre correspondante) + une puce neutre de tri courant (FR-011).
- [X] T009 [US1] Dans [src/ui/components/Paginator.svelte](../../src/ui/components/Paginator.svelte) et [src/ui/views/ListeView.svelte](../../src/ui/views/ListeView.svelte), sous 760 px : n'afficher en liste que les flèches ‹ › (≥ 44 px) quand `nbPages > 1`, et une ligne de résultats compacte (« n / N individus » · « 1–n · page x/y ») ; les segments 50/100/250/1000/Tous ne sont plus rendus en liste (ils iront dans le panneau — T012) (FR-014).

**Checkpoint**: Population utilisable au doigt ; ≥ 8 individus visibles ; MVP atteint dès que le panneau (US2) permet d'éditer les filtres.

---

## Phase 4: User Story 2 — Panneau Filtres & tri (Priority: P1)

**Goal**: éditer filtres et tri hors du flux, en plein écran, réutilisé par Population et Sandbox.

**Independent Test**: « ⚙ Filtrer » (Pop. ou Sandbox) ouvre un panneau plein écran ; modifier un critère met à jour « Voir les N individus » en direct ; « Réinitialiser » = filtres + tri ; le catalogue de 64 traits n'apparaît jamais en ligne.

- [X] T010 [US2] Dans [src/ui/components/FilterBar.svelte](../../src/ui/components/FilterBar.svelte), ajouter un état local `filterSheetOpen` (non persisté) et un **panneau plein écran** (`MobileSheet` ou patron équivalent) ouvert par « ⚙ Filtrer », réutilisable par Population **et** Sandbox via la prop `list: ListName` existante : en-tête « Filtres & tri » + « Réinitialiser » (`resetFilters()` + `resetSort(list)`) + ✕ ; corps avec recherche par nom, tri (3 segments Nom/Naissance/Âge, direction via `cycleSort`, actif = `.nav-item.is-active`), génération (défaut dynamique si `generationTouched` faux — INV-M7), espèce·statut, pouvoir (mono-sélection, re-clic = null) (FR-015).
- [X] T011 [US2] Dans [src/ui/components/FilterBar.svelte](../../src/ui/components/FilterBar.svelte), ajouter le bloc « Traits » du panneau : 3 lignes de navigation (Présence / Portée / Traits sélectionnés `n / 64`) vers des sous-écrans (`traitSubScreen`), le catalogue de traits n'étant **jamais** rendu en ligne (INV-M8/FR-016) ; puces sélectionnées via le rendu existant `.chip:has(input:checked)`.
- [X] T012 [US2] Dans [src/ui/components/FilterBar.svelte](../../src/ui/components/FilterBar.svelte), héberger le `Paginator` complet (segments 50/100/250/1000/Tous) dans le panneau, appliquer les filtres **en direct**, et poser une barre d'action basse « Voir les N individus » (compte à jour) fermant le panneau ; fermeture aussi par ✕ / backdrop / Échap avec retour du focus (FR-017/INV-M5).

**Checkpoint**: US1 + US2 = socle P1 complet — la Population est pleinement utilisable sur mobile.

---

## Phase 5: User Story 3 — Fiche lisible d'abord (Priority: P2)

**Goal**: identité en premier ; arbre en entrée ; barres de mesure (hors-barème signalé).

**Independent Test**: la fiche montre l'identité d'abord, ne monte ni `GenealogyTree` ni `TreeLegend`, offre une entrée « Arbre généalogique », et affiche l'effet hors-barème pour P/M > 10 (absent de la liste).

- [X] T013 [US3] Dans [src/ui/views/FicheView.svelte](../../src/ui/views/FicheView.svelte), sous 760 px : **convertir le bloc `@media (max-width: 720px)` existant (FicheView.svelte:440) en 760 px** (C1), puis réordonner en barre de titre (← 36 px / nom tronqué / ⋯) → ligne de statut (`.chip` Vivant/Décédé + méta mono) → 2 tuiles (pouvoirs / traits actifs) → cartes pouvoir → entrée arbre → `TraitModeSelector` → liste d'infos → barre d'action basse ; **ne pas monter** `GenealogyTree` ni `TreeLegend` sous 760 px (INV-M9/FR-019).
- [X] T014 [US3] Dans [src/ui/views/FicheView.svelte](../../src/ui/views/FicheView.svelte), implémenter les **barres de mesure** P/M : cas normal remplissage `valeur/10` (`var(--accent)`) ; cas **> 10** (P/M non plafonnées §7.2) barre pleine hachurée d'accent + halo (`--year-shadow`) + liseré interne + butoir, valeur `var(--fg)` gras, `/10` conservé, sans déborder la piste, `role="meter"` avec valeur réelle ; **aucun** effet équivalent dans la liste Population (INV-M10/FR-021/SC-006).
- [X] T015 [US3] Dans [src/ui/views/FicheView.svelte](../../src/ui/views/FicheView.svelte) et [src/ui/components/TraitModeSelector.svelte](../../src/ui/components/TraitModeSelector.svelte), sous 760 px : entrée « Arbre généalogique » (vignette + `›`) ouvrant `ArbreView` (remise à zéro du défilement conservée) ; `TraitModeSelector` en puces compactes 1/2/3 (`.nav-item.is-active`) ; action « Tuer… » ouvrant une feuille (`MobileSheet`) avec champ **cause obligatoire** et message `role="alert"` (règle métier inchangée) ; « Explorer l'arbre » en barre basse (FR-020/FR-022).

**Checkpoint**: fiche mobile lisible ; arbre déporté ; hors-barème correct.

---

## Phase 6: User Story 4 — Paramètres en cartes (Priority: P2)

**Goal**: cartes à lignes, sous-page Apparence, éditeurs plein écran, bouton Générer persistant.

**Independent Test**: onglets conservés, cartes à lignes, ligne « Apparence » → sous-page `ThemeControls variant="full"`, « Catalogues & espèces » en plein écran, « Générer » en bas sur les deux onglets.

- [X] T016 [US4] ✅ Résolu (BUG-001) Dans [src/ui/views/ParametresView.svelte](../../src/ui/views/ParametresView.svelte), sous 760 px : rendre les `fieldset` en **cartes à lignes** (en-tête pastille + titre ; une valeur par ligne, libellé gauche, champ droite ~96 px `text-align:right`, `min-height:44px`), descriptions repliées sauf règle métier (seed, A = 100 − 2·B − C) ; conserver les onglets Principaux/Avancés (`paramsTab`) ; « Générer la population » en **barre d'action basse persistante** (FR-023/FR-026 ; champ « A » readonly). *(Correction BUG-001 : la portée « cartes à lignes » n'avait pas cascadé dans le sous-composant `ResilienceOverrides` → voir T028 ; ne pas re-cocher T016 tant que le débordement de la section Résilience n'est pas résolu.)*
- [X] T017 [US4] Dans [src/ui/views/ParametresView.svelte](../../src/ui/views/ParametresView.svelte) (état local `themePageOpen`) et [src/ui/components/ThemeControls.svelte](../../src/ui/components/ThemeControls.svelte) : sous 760 px, remplacer les puces graphiques en ligne par une **ligne de navigation « Apparence »** (valeur courante `A · violet · sombre` + pastille accent + `›`) ouvrant une **sous-page plein écran** reprenant `ThemeControls variant="full"` (une section par axe), **sans changer la logique de thème** (INV-M11/FR-024).
- [X] T018 [US4] Dans [src/ui/components/CatalogueModal.svelte](../../src/ui/components/CatalogueModal.svelte) et [src/ui/components/EspecesModal.svelte](../../src/ui/components/EspecesModal.svelte), sous 760 px : rendre les éditeurs en **plein écran** (overlay sans marges, `max-width:none`, hauteur pleine) au lieu de la modale centrée ; la ligne « Catalogues & espèces » de `ParametresView` les ouvre (FR-025).

- [X] T028 [US4] (BUG-001) Dans [src/ui/components/ResilienceOverrides.svelte](../../src/ui/components/ResilienceOverrides.svelte), ajouter un bloc `@media (max-width: 760px)` : la table « Par type de trait » (5 colonnes, inputs `4.5rem`, `.type-name` nowrap) DOIT cesser de déborder — l'empiler en lignes/cartes (une par type : libellé + champs Initiale/Maximale/Seuil + « Propager ») **ou** confiner la table dans un conteneur `overflow-x: auto` ; assouplir `.field.select select { min-width: 14rem }` et les largeurs d'input fixes. Tokens uniquement (INV-M2), desktop ≥ 760 px inchangé (INV-M1/SC-004), aucun débordement horizontal du corps de page (INV-M12/SC-003/FR-023). Vérifier aussi que les autres éditeurs imbriqués des Avancés (pondérations `.grid`, hérédité) ne débordent pas.

**Checkpoint**: Paramètres mobiles en cartes ; apparence et éditeurs en plein écran ; génération accessible ; **aucune section (dont Résilience) ne déborde horizontalement sous 760 px**.

**Bugfix**: 2026-07-30 — BUG-001 : T016 rouverte (fausse complétion, portée arrêtée au conteneur) ; T028 ajoutée pour rendre `ResilienceOverrides` responsive. Dépendance : T028 [P] vs T016 (fichiers distincts). Non parallélisable avec elle-même ; indépendant des autres phases. **Résolu** : `ResilienceOverrides.svelte` reçoit un bloc `@media (max-width: 760px)` (table « Par type » → cartes empilées via `data-label`, `select`/inputs assouplis) ; version applicative **0.13.0 → 0.13.1** (le pied de page affiche v0.13.1, en révision de INV-M14/FR-036). Portes vertes : 298 tests, build, lint.

---

## Phase 7: User Story 5 — Sandbox sans tableau (Priority: P2)

**Goal**: lignes au lieu de table, lentille curseur, actions via ⋯, barre contextuelle de reproduction.

**Independent Test**: aucune table à défilement horizontal ; lentille curseur pleine largeur bornée ; actions de ligne via ⋯ ; mode reproduction avec cases + barre dédiée.

- [X] T019 [US5] Dans [src/ui/views/SandboxView.svelte](../../src/ui/views/SandboxView.svelte), sous 760 px : remplacer le `<table>` par des **lignes flex** (nom + méta mono ; ligne sélectionnée = rendu actuel conservé, mix accent 24 % + liseré interne 3 px — INV-M13) ; bandeau (badge « Bac à sable », ↺/✕ icônes 36 px, « ✔ Make it real ») ; onglets internes Population/Couples en segments `.nav-item.is-active` ; barre de filtres identique à la Population (réutilise `FilterBar` avec `list="sandbox"`) (FR-027/FR-029).
- [X] T020 [US5] Dans [src/ui/views/SandboxView.svelte](../../src/ui/views/SandboxView.svelte), sous 760 px : **lentille temporelle** avec libellé « Année observée » + valeur mono + `<input type="range">` pleine largeur (`accent-color: var(--accent)`) synchronisé au champ numérique et borné `[minYear, maxYear]` (FR-028) ; bouton « ⋯ » par ligne ouvrant une feuille (`MobileSheet`) avec les actions Éditer / Cloner / Régénérer / Supprimer (FR-027).
- [X] T021 [US5] Dans [src/ui/views/SandboxView.svelte](../../src/ui/views/SandboxView.svelte), sous 760 px : **barre d'action basse contextuelle** — hors reproduction : « ⚭ Reproduction manuelle », « ＋ Créer un individu », « ↩ Re-sélectionner les derniers parents » ; en mode reproduction : cases à cocher 20 × 20 px, méta indiquant le rôle (parent 1/2) en `var(--accent-text)`, barre « n parent(s) · m enfant » + champ enfants + « Valider ⚭ » + « Annuler » ; onglet Couples en pile (selects pleine largeur, actions Divorcer/Dissoudre sur leur ligne) (FR-029/FR-030).

**Checkpoint**: Sandbox pleinement utilisable au doigt, sans défilement horizontal.

---

## Phase 8: User Story 6 — Thèmes conservés & desktop intact (Priority: P1, transverse)

**Goal**: vérifier les deux contraintes absolues après implémentation des écrans.

**Independent Test**: comparaison desktop avant/après identique ; matrice styles×palettes×modes correcte sur mobile.

- [X] T022 [US6] Vérifier la **parité desktop** (≥ 760 px) avant/après sur les 5 vues (Population, Filtres, Fiche, Paramètres, Sandbox) : rendu **identique**, y compris `.filters`, `Paginator` complet, arbre dans la fiche, tableaux (FR-002/SC-004). Corriger toute fuite de style hors `@media`.
- [X] T023 [US6] Vérifier la **matrice de thèmes** sur mobile : 6 styles × 6 palettes × 2 modes, en contrôlant A (chip doux) et E (bordures 2 px, coins droits) en clair et sombre ; s'assurer qu'**aucune** valeur (couleur/police/rayon/graisse) n'est codée en dur — uniquement des variables `app.css` (FR-003/FR-004/SC-005). Vérifier que le changement de thème reste accessible et persistant sur mobile.

**Checkpoint**: contraintes absolues satisfaites.

---

## Phase 9: Arbre & Polish

- [X] T024 Dans [src/ui/views/ArbreView.svelte](../../src/ui/views/ArbreView.svelte), sous 760 px : contrôles (Profondeur, Zoom) en deux rangées de segments (`min-height:40px`), viewport `height: clamp(20rem, 62vh, 34rem)` ; pan/zoom tactile conservé (FR-031).
- [X] T025 [P] Portes de qualité : `npm run test` (cœur inchangé, vert), `npm run build` (`tsc --noEmit && vite build`), `npm run lint` (eslint + prettier) tous verts (SC-008).
- [X] T026 [P] Dérouler la **checklist manuelle** de [quickstart.md](./quickstart.md) via `npm run dev` (390 × 844 px + points de bascule 760 px + matrice thèmes). *(Validation navigateur à confirmer par l'auteur avant prod.)*
- [X] T027 Vérifier que le pied de page affiche **v0.13.0** après build (INV-M14).

---

## Dependencies & Execution Order

- **Setup (T001)** puis **Foundational (T002–T005)** : T002 (seuil) et T003 (MobileSheet) sont prérequis de tout ; T004/T005 (chrome) partagés par toutes les vues. T002‖T003 parallélisables.
- **US1 (T006–T009)** : dépend de T002 (+ T004/T005 pour le chrome). T006 (TimeBar) ‖ T007 (ListeView) possibles au début ; T008 puis T009 touchent FilterBar/ListeView.
- **US2 (T010–T012)** : dépend de **US1** (même fichier `FilterBar.svelte` que T008) + T003 (MobileSheet). Séquentiel entre T010→T011→T012.
- **US3 (T013–T015)** : dépend de T003 (feuille « Tuer… ») ; même fichier `FicheView.svelte` → T013→T014→T015 séquentiels.
- **US4 (T016–T018)** : T016→T017 séquentiels (même `ParametresView.svelte`) ; T018 (modals) parallélisable.
- **US5 (T019–T021)** : dépend de **US2** (réutilise le panneau `FilterBar` avec `list="sandbox"`) + T003 ; T019→T020→T021 séquentiels (même `SandboxView.svelte`).
- **US6 (T022–T023)** : après l'implémentation des écrans (vérification transverse).
- **Polish (T024–T027)** : T024 indépendant ; T025/T026 parallélisables ; T027 en dernier.

**Ordre recommandé** : T001 → (T002‖T003) → T004 → T005 → US1 → US2 → US3 → US4 → US5 → US6 → T024 → T025/T026 → T027.

## Parallel Opportunities

- T002 ‖ T003 (fichiers distincts : `app.css` vs nouveau composant).
- Début US1 : T006 (`TimeBar`) ‖ T007 (`ListeView`) — fichiers distincts.
- T018 (`CatalogueModal`/`EspecesModal`) ‖ T016/T017 (`ParametresView`/`ThemeControls`).
- T025 ‖ T026 (portes auto vs checklist manuelle).

⚠️ **Non parallélisable** : les tâches touchant le **même** fichier — `FilterBar.svelte` (T008, T010, T011, T012), `ListeView.svelte` (T007, T009), `FicheView.svelte` (T013–T015), `ParametresView.svelte` (T016, T017), `SandboxView.svelte` (T019–T021).

## Implementation Strategy

- **MVP** = Foundational (chrome) + **US1** + **US2** (les deux P1 du socle) : la Population devient utilisable (≥ 8 individus, filtres accessibles). Livrable et testable seul.
- **Incréments** : US3 (fiche), US4 (paramètres), US5 (sandbox) ajoutent chacun un écran sans casser les précédents.
- **Garde-fou permanent** : US6 (desktop intact + thèmes) est une exigence à vérifier **à chaque** tâche, pas seulement en Phase 8 — ne jamais écrire hors `@media (max-width:760px)`, ne jamais coder une valeur en dur.
