# Phase 1 — Modèle de données : Refonte de l'UI mobile

## Aucune entité métier nouvelle ni modifiée

Feature **purement présentationnelle**. Elle ne touche ni au modèle du domaine, ni à
`AppState`/`DataState`, ni au format d'export/import, ni à `FORMAT_VERSION`. `src/core` reste intact.

## États d'interface ajoutés (locaux, non persistés, non exportés)

Conformément à FR-035, aucun store métier ni aucune persistance nouvelle. Les états ci-dessous sont
**locaux de session** (variables de composant ou petit store d'UI non persisté selon la portée) et ne
figurent jamais dans l'export/import (Principe VI).

| État | Type | Défaut | Portée | Rôle |
|---|---|---|---|---|
| `filterSheetOpen` | `boolean` | `false` | Population / Sandbox (via `FilterBar`) | ouverture du panneau plein écran « Filtres & tri » |
| `traitSubScreen` | `'presence' \| 'portee' \| 'selection' \| null` | `null` | panneau Filtres | sous-écran de traits ouvert (le catalogue ne s'affiche jamais en ligne) |
| `actionSheet` | `{ kind: 'export' \| 'row' \| 'fiche' \| null, id?: string }` | `{ kind: null }` | App / Sandbox / Fiche | feuille d'actions courante (export, actions d'une ligne Sandbox, actions de fiche) |
| `themePageOpen` | `boolean` | `false` | Paramètres | sous-page plein écran « Apparence » |
| `killSheetOpen` | `boolean` | `false` | Fiche | feuille de confirmation « Tuer… » (champ cause obligatoire, `role="alert"`) |

**Règles** :
- Tous ces états démarrent fermés/neutres à chaque montage ; **aucun** n'est persisté en
  `localStorage`.
- Une feuille ouverte piège le focus et le rend au déclencheur à la fermeture (Échap / ✕ / backdrop).
- `prefers-reduced-motion` supprime les transitions d'ouverture (règle globale existante).

## Préférences existantes (persistées — inchangées)

Restent dans `localStorage` exactement comme aujourd'hui (aucune modification de logique) :
`mode`, `palette`, `style` (thème), `listePageSize`, `paramsTab`, `traitMode`. La refonte ne fait que
les **rendre accessibles** différemment sur mobile (sous-page Apparence, panneau de filtres).

## Réutilisation des stores existants (aucun nouveau store métier)

- `appState` : population, currentYear, genesisYear, catalog, couples, selectedPerson, treeRootId,
  treeDepth.
- `filters` : criteria, generationTouched (défaut dynamique de génération — INV conservé).
- `ui` : mode, palette, style, paramsTab, listePage, listePageSize, listeSort, sbTab, sbPage,
  sbPageSize, sbSort, traitMode, showScrollTop.
- `sandboxStore` : état de la sandbox, mode reproduction, sélection de parents.

Total : 0 entité métier, 0 champ de persistance ajouté ; seuls des états d'affichage locaux.
