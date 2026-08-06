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
- **INV-C7 (id)** : chaque pouvoir reçoit `pw:DERIVE:${traitIds.join('+')}#<index>` ; les deux pouvoirs
  d'une sous-liste ont des id distincts.
- **INV-C8 (traitIds)** : `traitIds` = traits de la sous-liste + traits générés `K` **référencés** par ce
  pouvoir.

## `derivePowersFromTraits(adn, catalog, params, rng): { pouvoirs: Pouvoir[]; adn: ADN }`

- **INV-C9** : `pouvoirs` = concaténation, dans l'ordre des sous-listes, des `transformSublist(...)` ;
  au sein d'une feuille, ordre X puis Y.
- **INV-C10 (pureté)** : ne mute pas l'ADN d'entrée ; renvoie une copie enrichie par les traits générés `K`.
- **INV-C11 (déterminisme)** : à (seed, ADN, params, catalogue) identiques, sortie identique.

## Contrat d'intégration (appelants)

- **INV-C12** : `reproduce`, `regeneratePowers`, `genesis`, sandbox make-it-real attribuent la
  puissance/maîtrise (§7.2) via `inheritStats(i, …)` en **mappant par index** la liste `pouvoirs` retournée ;
  deux pouvoirs d'une même sous-liste reçoivent donc des index consécutifs et des P/M **indépendantes**.
- **INV-C13 (UI)** : l'UI liste/fiche continue de cléer les pouvoirs par **libellé** ; aucune modification
  d'affichage requise. Deux pouvoirs d'une feuille ayant des libellés distincts, aucune collision de clé.
