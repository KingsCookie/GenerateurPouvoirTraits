# Phase 0 — Recherche & décisions : Refonte de l'UI mobile

Aucune inconnue « NEEDS CLARIFICATION » ne subsiste (spec + handoff hifi + 2 clarifications). Cette
phase consigne les décisions techniques, toutes ancrées dans le handoff et le code existant.

## R1 — Seuil de bascule unique : 760 px

- **Décision** : tous les blocs mobiles utilisent `@media (max-width: 760px)`. Les seuils existants
  hétérogènes sont harmonisés : `src/app.css` (640 → 760), `ListeView` (640 → 760), `FicheView`
  (720 → 760), `ParametresView` (760, conservé), `StateIO` (`min-width: 40rem` = 640 → `min-width:
  760px`).
- **Rationale** : clarification 2026-07-30 (override du handoff qui disait 640) ; un seuil unique
  évite les zones de rendu incohérentes 640–760.
- **Alternatives rejetées** : garder 640 (handoff) — contredit la clarification ; multiples seuils —
  source d'incohérences.

## R2 — Patron « feuille » (bottom sheet / plein écran)

- **Décision** : réutiliser le patron modale déjà éprouvé (`SandboxPersonForm`, `CatalogueModal`,
  `EspecesModal`) : overlay `fixed`, backdrop cliquable, fermeture `Escape`, bouton de fermeture,
  focus piégé, retour du focus au déclencheur. Optionnellement, factoriser un composant
  `MobileSheet.svelte` (props `onClose`, `title`, slot) pour les 4 usages (export, actions ligne
  Sandbox, confirmation « Tuer… », sous-pages plein écran).
- **Rationale** : cohérence d'accessibilité, aucune dépendance, YAGNI ; entrée par translation
  verticale ~200 ms, neutralisée par `prefers-reduced-motion` (règle globale existante `app.css`).
- **Alternatives rejetées** : `<dialog>` natif (stylage hétérogène selon thèmes) ; librairie de
  sheets (dépendance interdite).

## R3 — Barre de filtres mobile + panneau plein écran

- **Décision** : sous 760 px, `FilterBar` ne rend plus le bloc `.filters` en flux ; il expose un
  bouton « ⚙ Filtrer » (rendu `.nav-item.is-active` + compteur) et une rangée de puces défilante
  (une par filtre actif + tri courant). Le panneau plein écran « Filtres & tri » réutilise la prop
  `list: ListName` existante (Population **et** Sandbox), applique les filtres en direct, et son
  bouton bas « Voir les N individus » lit le compte courant. « Réinitialiser » appelle
  `resetFilters()` + `resetSort(list)`.
- **Rationale** : c'est le cœur du problème (liste invisible) ; réutilise l'état `filters` et
  `cycleSort`/`resetSort` existants (`ui.ts`).
- **Détail** : le `Paginator` complet (segments 50/100/250/1000/Tous) migre dans le panneau ; en
  liste, seules les flèches ‹ › (≥ 44 px) restent quand `nbPages > 1`.

## R4 — Population en lignes (plus de grille étiquetée par en-tête)

- **Décision** : sous 760 px, remplacer la grille `.trow` (dont l'en-tête de colonnes est masqué)
  par des lignes `flex` : colonne texte (nom + `†`, méta étiquetée par le format
  `an … · … ans · espèce · gN`, puces pouvoirs `P/M`) + chevron `›`. **Pas de bouton « ⋯ »**
  (clarification) : un tap sur la ligne appelle `selectPerson(id)`.
- **Rationale** : lisibilité, ≥ 8 individus visibles (SC-001) ; l'édition n'existant qu'en Sandbox,
  un menu d'actions Population serait vide.

## R5 — Fiche : identité d'abord, arbre en entrée, barres de mesure

- **Décision** : sous 760 px, `FicheView` n'instancie ni `GenealogyTree` ni `TreeLegend` ; l'arbre
  devient une **entrée** vers `ArbreView` (inchangée). Ordre : titre (← / nom / ⋯) → statut → tuiles
  → cartes pouvoir (barres de mesure) → entrée arbre → `TraitModeSelector` → liste d'infos → barre
  d'action basse (« Explorer l'arbre », « Tuer… » en feuille).
- **Hors-barème (P/M > 10)** : la barre est pleine, hachurée d'accent, halo + liseré interne +
  butoir, valeur en `var(--fg)` gras, `/10` conservé, `role="meter"` avec `aria-valuenow` réel.
  **Aucun** effet équivalent dans la liste Population (note mono simple). Toutes les valeurs
  proviennent de tokens CSS.
- **Rationale** : lisibilité mobile ; P/M non plafonnées par le cœur (rappel §7.2), donc signalées
  par le style sans jamais déborder la piste.

## R6 — Paramètres : cartes à lignes, sous-pages plein écran

- **Décision** : sous 760 px, les `fieldset` deviennent des cartes à lignes (libellé gauche, champ
  droite ~96 px `text-align:right`) ; onglets Principaux/Avancés conservés (`paramsTab`) ; les
  paramètres graphiques passent en **ligne de navigation « Apparence »** ouvrant une sous-page plein
  écran (`ThemeControls variant="full"`, logique inchangée) ; « Catalogues & espèces » ouvre
  `CatalogueModal`/`EspecesModal` **en plein écran** (via le seuil 760 des styles de modale) ; champ
  « A » en lecture seule ; bouton « Générer » en barre basse persistante.
- **Rationale** : réduit la densité (cohérent avec la feature 012) sans changer la logique de thème
  ni retirer de paramètre.

## R7 — Sandbox : lignes au lieu de table, lentille curseur

- **Décision** : sous 760 px, remplacer le `<table>` par des lignes `flex` ; actions de ligne
  (Éditer / Cloner / Régénérer / Supprimer) via « ⋯ » → feuille ; lentille temporelle avec
  `<input type="range">` pleine largeur synchronisé au champ numérique, borné `[minYear, maxYear]` ;
  onglets internes Population/Couples en segments ; barre de filtres identique à la Population ;
  barre d'action basse contextuelle (mode reproduction : cases 20 px, rôles, compte + enfants +
  Valider/Annuler) ; ligne sélectionnée : rendu actuel conservé (mix accent 24 % + liseré interne).
- **Rationale** : supprime le défilement horizontal (SC-003) ; conserve les invariants de sélection.

## R8 — Chrome commun (App.svelte + StateIO)

- **Décision** : sous 760 px, en-tête en 2 rangées fixes (marque + 3 boutons icône 36 px : Exporter →
  feuille des 3 exports, Importer → `<input type=file>` existant, toggle clair/sombre
  `ThemeControls variant="toggle"`) ; nav segmentée `flex:1` (séparateur supprimé) ; `StateIO` perd
  ses libellés et sa `.io-bar` (le bandeau teinté disparaît). `aria-label` obligatoire sur chaque
  bouton icône.
- **Rationale** : supprime le `flex-wrap` subi et le bandeau sur deux lignes ; garde export/import
  visibles en compact.

## R9 — Thèmes & tokens (contrainte absolue)

- **Décision** : n'utiliser que les variables de `src/app.css` ; aucune couleur/police/rayon/graisse
  nouvelle. Contrôler les 6 styles × 6 palettes × 2 modes, en particulier A (chip doux) et E
  (bordures 2 px, coins droits), en clair et sombre.
- **Rationale** : exigence explicite du commanditaire (FR-003/FR-004/SC-005) ; les hex du handoff ne
  servent qu'à relire la maquette.

## R10 — Desktop intact (contrainte absolue)

- **Décision** : toutes les nouveautés vivent sous `@media (max-width: 760px)` ou en variantes
  conditionnées par la largeur ; **aucune** règle de base modifiée. Vérification avant/après ≥ 760 px
  sur les 5 vues (SC-004).
- **Rationale** : exigence explicite (FR-001/FR-002).

## R11 — Doc & version

- **Décision** : **aucune** modification de `rsrc/DescriptionProjet.md` (agencement responsive non
  prescrit) ; bump `package.json` 0.12.1 → **0.13.0** (feature mineure).
- **Rationale** : Principe IX non déclenché ; versionnage feature→mineure du projet.

## R12 — Tests

- **Décision** : aucun test cœur nouveau (cœur intact) ; `npm run test` + `npm run lint` doivent
  rester verts (SC-008) ; validation fonctionnelle par **checklist manuelle** responsive
  (quickstart.md). Pas de dépendance de test DOM ajoutée.
- **Rationale** : Principe V vise le cœur (inchangé) ; la nature responsive se valide en navigateur.
