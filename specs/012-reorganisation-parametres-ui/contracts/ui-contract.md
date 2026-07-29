# Contrat UI — Réorganisation de la page Paramètres

Ce contrat décrit les surfaces d'interface introduites/modifiées et leurs invariants. Aucune API de
cœur n'est touchée.

## 1. Store d'interface (`src/ui/stores/ui.ts`)

```text
export type ParamsTab = 'principaux' | 'avances';
export const PARAMS_TABS: readonly ParamsTab[] = ['principaux', 'avances'];
export const paramsTab: Writable<ParamsTab>;   // initialisé via readChoice('ui.paramsTab', PARAMS_TABS, 'principaux')
export function setParamsTab(t: ParamsTab): void;
```

**Invariants**
- INV-1 : au premier chargement sans préférence stockée, `paramsTab === 'principaux'`.
- INV-2 : toute écriture de `paramsTab` est persistée en `localStorage` (`ui.paramsTab`) et repliée
  au défaut si la valeur relue est invalide.
- INV-3 : `paramsTab` n'apparaît **jamais** dans un export (`kind: config|data|full`).

## 2. Barre d'onglets (`ParametresView.svelte`)

- Deux boutons `role="tab"` (`aria-selected` reflétant `paramsTab`) dans un conteneur
  `role="tablist"` : « Principaux » et « Avancés ».
- Un seul panneau rendu à la fois via `{#if $paramsTab === 'principaux'}` / `{:else}`.
- Contrat d'accessibilité identique au patron `SandboxView` (tablist/tab/aria-selected).

**Contenu — Onglet Principaux**
- `ThemeControls` (variant complet) ; graine (input + bouton régénérer) ; `batchSize` ; `birthYear` ;
  `powerChancePct` ; boutons « Modifier les catalogues de traits… » et « Gérer les espèces… ».

**Contenu — Onglet Avancés**
- `initialResilience`, `duplicationD`, `generationK` ; bloc « Hérédité & naissance » complet
  (12 champs dont `statA` en lecture seule + case `genomeMalusEnabled`) ; pondérations de gabarits
  (`templateWeights`) ; `ResilienceOverrides`.

**Zone d'action persistante (hors panneaux)**
- Bouton « Générer la population » (`generate`) visible et actif quel que soit `$paramsTab`.

**Invariants**
- INV-4 : aucun paramètre listé en FR-001 n'est retiré, désactivé ou rendu inatteignable.
- INV-5 : changer d'onglet ne modifie aucune valeur de paramètre (aucun appel `setParam` déclenché
  par la bascule).
- INV-6 : le comportement de chaque contrôle (liaison `setParam`/`setSeed`/`regenerateSeed`/
  `generate`) est identique à l'actuel.

## 3. Modales d'éditeurs

### `CatalogueModal.svelte`
- Props : `onClose: () => void`.
- Rend `TraitCatalogEditor` **inchangé** dans un overlay modal.
- Fermeture : touche `Escape`, clic sur l'arrière-plan, bouton « Fermer ».

### `EspecesModal.svelte`
- Props : `onClose: () => void`.
- Rend, en tête, la case « Autoriser la consanguinité » (liée à `consanguinityAllowed` via
  `setParam`), puis `SpeciesEditor` **inchangé**.
- Fermeture : touche `Escape`, clic sur l'arrière-plan, bouton « Fermer ».

**Invariants**
- INV-7 : les modales offrent l'intégralité des fonctions des éditeurs (aucune fonction perdue).
- INV-8 : une modification faite dans une modale est effective dès sa réalisation (les éditeurs
  appellent déjà `setParam`/mutations de catalogue) et persiste après fermeture ; elle est prise en
  compte à la génération suivante.
- INV-9 : ouvrir/fermer une modale ne déclenche aucune génération.
- INV-10 : à la réouverture, une modale démarre fermée (état de session local, non mémorisé).

## 4. Invariant transverse — déterminisme

- INV-11 : à graine et séquence d'actions identiques, la population générée est **strictement
  identique** avant/après la refonte (aucune RNG ni logique de cœur touchée).
