# Data Model — Révision de l'algorithme de transformation d'une sous-liste en pouvoir

Cette feature **ne change aucun format sérialisé** (`FORMAT_VERSION` inchangé). Les entités ci-dessous sont
celles impliquées par l'algorithme §6.4.2 ; seules leurs **règles** évoluent, pas leur schéma.

## Entité : Sous-liste de traits (interne, non sérialisée)

Ensemble de `TraitRef` (id, type, libellé, résilience) construit par `buildSublists` (§6.4.1).
Caractérisée par la **présence** de chaque type : `a`/`e`/`p`/`aj`/`r`/`et`.

- **Entrée** de l'algorithme de libellé.
- **Sortie** : **0, 1 ou 2** pouvoirs (auparavant 0 ou 1).
- Règle inchangée : regroupement d'un même type (« , … et » / « ou ») pour l'affichage.

## Entité : Gabarit de feuille (§6.4.2)

- Une feuille de l'arbre `treeTemplate` renvoie soit `null` (aucun pouvoir), soit une **chaîne** contenant
  **un ou deux** gabarits séparés par `;` (verbatim `rsrc/DescriptionProjet.md`).
- 24 feuilles révisées (23 à deux gabarits, 1 mono-gabarit reformulée `aj/et/r`).
- Jetons de type présent : `{a} {e} {p} {aj} {r} {et}` (substitués par les libellés regroupés).
- Jetons de génération : `{Ka} {Ke} {Kp} {Kaj}` (résolus par tirage `K`, laissés littéraux si type absent).

## Entité : Pouvoir (`Pouvoir`) — schéma inchangé, règles précisées

| Champ | Type | Règle (révisée) |
|---|---|---|
| `id` | `string` | `pw:DERIVE:${traitIds.join('+')}` **+ suffixe `#<index>`** (position dans la sous-liste). **Unique par personne** ; peut être partagé entre personnes (FR-011). |
| `label` | `string` | Gabarit résolu (jetons de type + jetons `K` substitués). Les deux pouvoirs d'une feuille ont des libellés **distincts**. |
| `template` | `'DERIVE'` | Inchangé pour les pouvoirs dérivés (§6.4). |
| `traitIds` | `string[]` | Traits de la sous-liste **+** traits générés `K` **référencés par ce pouvoir** (R5). Un `{Kp}` partagé figure dans les **deux** pouvoirs. |
| `puissance` | `number` | Attribuée par `inheritStats` (§7.2), **indépendamment par pouvoir** (FR-003). |
| `maitrise` | `number` | Idem, indépendante. |

**Cardinalité** : une personne peut désormais porter **deux** pouvoirs issus d'**une même** sous-liste.

## Entité : Trait généré par `K` (inscrit dans l'ADN)

- Créé avec `generationK` % de chance ; inscrit **actif** dans l'ADN (réactivé + bonus s'il existait).
- **Partage** : un même jeton `Kx` présent dans les deux gabarits d'une feuille ⇒ **un seul** trait généré,
  inscrit **une seule fois** dans l'ADN, réutilisé dans les deux libellés (FR-004).
- **Échec** du tirage `K` ⇒ tout pouvoir **référençant** ce jeton n'est pas produit ; un pouvoir ne
  référençant aucun jeton `K` échoué est **quand même** produit (FR-005).

## Invariants dérivés

- **INV-2P** : pour les 23 feuilles marquées, `transformSublist` renvoie exactement deux `Pouvoir` (sous
  réserve des échecs `K`), dans l'ordre X puis Y.
- **INV-K1** : au plus **un** tirage `chance(generationK)` (+ un `pickWeighted` si succès) par jeton `K`
  **distinct** d'une feuille, quel que soit le nombre de gabarits qui le référencent.
- **INV-IDP** : deux `Pouvoir` d'une même personne ont des `id` distincts.
- **INV-DET** : à (seed, sous-liste, params, catalogue) identiques, libellés + P/M + traits générés sont
  identiques.
- **INV-NR** : toute feuille **non listée** produit le libellé identique à la version précédente.
