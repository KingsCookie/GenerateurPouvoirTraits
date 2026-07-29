# Phase 1 — Modèle de données : Réorganisation de la page Paramètres

## Aucune entité métier nouvelle ni modifiée

Cette feature est **purement présentationnelle**. Elle ne touche ni au modèle `Parameters`, ni à
`AppState`/`DataState`, ni au format d'export/import, ni à `FORMAT_VERSION`. Le cœur `src/core` reste
inchangé.

## État d'interface ajouté (hors état applicatif)

Un seul élément d'état est introduit, dans `src/ui/stores/ui.ts`, catégorie **préférence d'interface
persistée** (comme les axes de thème). Il n'entre **jamais** dans l'export/import (Principe VI).

| Élément | Type | Valeurs autorisées | Défaut | Persistance |
|---|---|---|---|---|
| `paramsTab` | `Writable<ParamsTab>` | `'principaux'` \| `'avances'` | `'principaux'` | `localStorage` clé `ui.paramsTab` |

```text
export type ParamsTab = 'principaux' | 'avances';
export const PARAMS_TABS: readonly ParamsTab[] = ['principaux', 'avances'];
// lecture bornée + repli défaut (patron readChoice existant)
// subscribe → lsSet('ui.paramsTab', …)
```

**Règles de validation** :
- À l'initialisation, une valeur stockée absente ou non incluse dans `PARAMS_TABS` **doit** replier
  sur `'principaux'` (via `readChoice`).
- L'écriture est idempotente et silencieuse en cas d'échec `localStorage` (mode privé / quota) —
  l'app reste fonctionnelle sur le défaut.

## État de session local (non persisté, non exporté)

Dans `ParametresView.svelte` uniquement (variables locales, pas de store) :

| Élément | Type | Défaut | Rôle |
|---|---|---|---|
| `showCatalogue` | `boolean` | `false` | ouverture de la modale Catalogues de traits |
| `showEspeces` | `boolean` | `false` | ouverture de la modale Espèces & reproduction |

Ces booléens repartent à `false` à chaque montage de la vue (une modale ré-ouverte démarre fermée).

## Paramètres existants — inventaire de préservation (référence SC-002)

Répartition cible (aucun retrait ; tous restent éditables) :

- **Onglet Principaux** : `seed`, `batchSize`, `birthYear`, `powerChancePct` + apparence
  (`mode`, `palette`, `style` via `ThemeControls`).
- **Onglet Avancés** : `initialResilience`, `duplicationD`, `generationK`, `resilienceMax`,
  `bonusPoints`, `malusPoints`, `disappearThreshold`, `strongMutationRatePct`, `noPowerRatePct`,
  `weakMutationGainPct`, `weakMutationLossPct`, `statB`, `statC`, `statA` (lecture seule calculée),
  `genomeMalusEnabled`, `templateWeights` (`AE`/`PE`/`PA`/`PR`), overrides de résilience
  (`ResilienceOverrides`).
- **Modale Catalogues** : `TraitCatalogEditor` (traits, types, poids type/trait, résilience par trait).
- **Modale Espèces** : `SpeciesEditor` (espèces, genres, reproduction/portée, courbe) +
  `consanguinityAllowed`.

Total : les 24 réglages/éditeurs énumérés en FR-001 sont tous placés, sans exception.
