# Contrat cœur — algorithme §6.4.2 révisé

Interfaces internes du cœur pur `src/core/powers`. Aucune API réseau (application 100 % statique).
Contrat exprimé en invariants vérifiables par tests Vitest à seed fixe.

## `powerLabelFromSublist(groups: SublistGroups): string[]`

- **Entrée** : libellés (déjà regroupés) des types présents dans la sous-liste.
- **Sortie** : tableau de **0, 1 ou 2** gabarits résolus pour les types présents (jetons `{a}…{et}`
  substitués ; jetons `{Ka}…{Kaj}` laissés littéraux).
- **INV-C1** : feuille terminale `null` ⇒ `[]`.
- **INV-C2** : les 23 feuilles « deux pouvoirs » ⇒ tableau de longueur 2, ordre X puis Y, correspondant
  **verbatim** aux chaînes du §6.4.2 après substitution des types présents.
- **INV-C3** (non-régression) : toute feuille non listée ⇒ tableau de longueur 1 identique au libellé actuel.

## `transformSublist(sublist, working, catalog, params, rng): Pouvoir[]`

- **Sortie** : **0 à 2** `Pouvoir`.
- **INV-C4 (Kx partagé)** : pour un jeton `K` distinct présent dans les deux gabarits, **une seule**
  séquence de tirage (`chance` puis éventuel `pickWeighted`) ; le trait généré est **identique** dans les
  deux pouvoirs et inscrit **une seule fois** dans `working` (ADN).
- **INV-C5 (échec K par pouvoir)** : si le tirage d'un jeton `K` échoue (ou pool vide/poids nul), tout
  gabarit **référençant** ce jeton ne produit pas de pouvoir ; un gabarit sans jeton `K` échoué produit son
  pouvoir.
- **INV-C6 (ordre des tirages)** : les jetons `K` distincts sont tirés dans l'ordre de **première
  apparition** en scannant le 1ᵉʳ gabarit puis le 2ᵉ ; aucune puissance/maîtrise n'est tirée ici (déléguée
  à l'appelant, après dérivation).
- **INV-C7 (id + position)** : chaque pouvoir reçoit `pw:DERIVE:${traitIds.join('+')}#<index>` où `<index>`
  est la **position** dans la feuille (`0` = primaire, `1` = secondaire). `traitIds` étant les **traits
  affichés** (INV-C8 révisé), l'id peut se répéter chez une personne (deux pouvoirs de même position aux
  traits affichés incomparables) : l'unicité par personne n'est **plus** garantie ; la clé d'affichage
  reste le **libellé**.
- **INV-C8 (traitIds = traits affichés — révisé BUG-002)** : `traitIds` = traits des types **mentionnés
  dans le gabarit** de ce pouvoir (dans l'ordre de la sous-liste) + traits générés `K` **affichés**. Un
  type présent dans la sous-liste mais **non affiché** par le gabarit (incohérences volontaires §6.4.2)
  n'y figure **pas**.

## `derivePowersFromTraits(adn, catalog, params, rng): { pouvoirs: Pouvoir[]; adn: ADN }`

- **INV-C9** : `pouvoirs` = concaténation, dans l'ordre des sous-listes, des `transformSublist(...)` ;
  au sein d'une feuille, ordre X puis Y — **puis** déduplication (INV-C15/INV-C16).
- **INV-C10 (pureté)** : ne mute pas l'ADN d'entrée ; renvoie une copie enrichie par les traits générés `K`.
- **INV-C11 (déterminisme)** : à (seed, ADN, params, catalogue) identiques, sortie identique.
- **INV-C14** : ~~(déduplication par libellé — BUG-001) conserve la 1ʳᵉ occurrence de chaque libellé.~~
  **Superseded par INV-C15/INV-C16 (BUG-002)** — `dedupeByLabel` est retiré.
- **INV-C15 (déduplication par position + sous-ensemble — BUG-002)** : avant le `return`, les pouvoirs
  sont regroupés par **position** (primaires `#0` entre eux, secondaires `#1` entre eux) ; dans chaque
  groupe, tout pouvoir dont l'ensemble de **traits affichés** (`traitIds`, INV-C8) est **inclus (⊆)** dans
  celui d'un autre du groupe est **supprimé** (on garde les ensembles **maximaux** ; ensembles **égaux** ⇒
  on garde le **1ᵉʳ**). Un primaire et un secondaire ne sont **jamais** comparés (les deux pouvoirs d'une
  feuille sont préservés). Aucune statistique comparée (P/M à 0), **aucun** tirage RNG, ADN **non** modifié.
- **INV-C16 (garde-fou libellé — BUG-002)** : après INV-C15, si deux pouvoirs restants ont un **libellé
  strictement identique**, seul le **1ᵉʳ** (ordre de production) est conservé. Ne peut se produire qu'avec
  des **traits homonymes** au catalogue.

## Contrat d'intégration (appelants)

- **INV-C12** : `reproduce`, `regeneratePowers`, `genesis`, sandbox make-it-real attribuent la
  puissance/maîtrise (§7.2) via `inheritStats(i, …)` en **mappant par index** la liste `pouvoirs` retournée ;
  deux pouvoirs d'une même sous-liste reçoivent donc des index consécutifs et des P/M **indépendantes**.
- **INV-C13 (UI)** : l'UI liste/fiche continue de cléer les pouvoirs par **libellé** ; aucune modification
  d'affichage requise. Deux pouvoirs d'une feuille ayant des libellés distincts, aucune collision de clé.
