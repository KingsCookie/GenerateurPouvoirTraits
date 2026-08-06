# Modèle de données — Feature 014 (corrections UI)

Conformément à FR-019, **aucune entité de données n'est ajoutée ni modifiée** ; `src/core`, le
modèle et les formats d'export/import restent intacts. La feature n'introduit qu'un **état de
présentation dérivé**, non persisté.

## État de présentation dérivé : `GaugeState`

- **Type** : `'broken' | 'normal' | 'overloaded'`
- **Dérivation (pure)** : `gaugeState(value: number, max = 10)` :
  - `value < 0` → `'broken'`
  - `0 <= value <= max` → `'normal'`
  - `value > max` → `'overloaded'`
- **Portée** : calculé à l'affichage à partir de la valeur numérique d'un pouvoir (puissance ou
  maîtrise) déjà présente dans le view-model de fiche. **Non stocké, non exporté.**
- **Invariants** :
  - `value = 0` → `normal` (jamais `broken`).
  - `value = max` (10) → `normal` (jamais `overloaded`).
  - Les états sont **mutuellement exclusifs** (jamais cumulés).
  - La valeur numérique brute est conservée telle quelle (aucun clamp) — cohérent avec §7.2 où P/M
    ne sont bornées à 10 **que** dans le cas A (le cœur n'est pas touché).

## Données de ligne réutilisées (listes)

- **Population / Sandbox (mobile)** : réutilisent le view-model de ligne existant (`buildListRow` ou
  équivalent) fournissant `nom`, `vivant`, `dateNaissance` (**date complète**), `age`, `especeId`,
  `generation`, `pouvoirs[] { label, puissance, maitrise }`. Aucun champ nouveau ; seule la
  **présentation** change (date complète au lieu de l'année ; parité Sandbox ; bouton « ⋯ »).

Aucune transition d'état persistée, aucune règle de validation de données nouvelle.
