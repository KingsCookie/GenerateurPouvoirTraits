# Research — Révision de l'algorithme de transformation d'une sous-liste en pouvoir

Toutes les inconnues « Technical Context » sont internes (aucune recherche externe / dépendance).
Le seul point différé par `/speckit-clarify` (ordre de consommation du RNG) est tranché ici.

## R1 — Forme de retour de l'arbre `powerLabelTree`

- **Décision** : `powerLabelFromSublist(groups)` renvoie **`string[]`** (0, 1 ou 2 gabarits résolus pour les
  types présents), au lieu de `string | null`. En interne, `treeTemplate(...)` renvoie la **chaîne brute**
  d'une feuille, éventuellement à **deux gabarits séparés par `;`** (verbatim §6.4.2) ou `null` ; le
  découpage sur `;` (trim des espaces) produit le tableau de gabarits.
- **Rationale** : colle à la notation `"X" ; "Y"` de la source de vérité, garde l'arbre `treeTemplate`
  aussi proche que possible du verbatim (une `string` par feuille), et localise le « split » au seul point
  d'entrée. `[]` remplace proprement l'ancien `null` (feuille terminale).
- **Alternatives rejetées** : (a) renvoyer directement `string[]` depuis `treeTemplate` — s'éloigne du
  verbatim et complique la relecture ligne-à-ligne face au §6.4.2 ; (b) garder `string` avec `;` et laisser
  l'appelant parser — disperse la logique de découpage.

## R2 — `transformSublist` : de `Pouvoir | null` à `Pouvoir[]`

- **Décision** : `transformSublist(...)` renvoie **`Pouvoir[]`** (longueur 0, 1 ou 2). `derivePowersFromTraits`
  concatène (`push(...powers)`) les pouvoirs de chaque sous-liste.
- **Rationale** : une feuille peut désormais produire deux pouvoirs ; le contrat « 0 ou 1 » n'est plus
  suffisant. La concaténation préserve l'ordre des sous-listes puis l'ordre X→Y au sein d'une feuille.
- **Alternatives rejetées** : conserver `Pouvoir | null` et appeler deux fois — impossible de partager le
  tirage `Kx` entre les deux pouvoirs.

## R3 — Résolution des jetons `K` avec partage entre deux pouvoirs (ordre RNG)

- **Décision** : pour une feuille, on collecte l'ensemble **ordonné des jetons `K` distincts** en scannant
  **d'abord le 1ᵉʳ gabarit puis le 2ᵉ** (première apparition). Pour **chaque jeton distinct**, on effectue
  **une seule** séquence de tirage : `rng.chance(generationK)` puis, en cas de succès,
  `rng.pickWeightedOrNull(pool)`. Le résultat (trait généré → libellé, ou **échec**) est mémorisé dans une
  map `token → résultat`. Ensuite, pour **chaque** gabarit : s'il référence un jeton **en échec**, ce
  pouvoir **n'est pas produit** ; sinon on substitue tous ses jetons et on produit le pouvoir.
- **Ordre global des tirages (fixe ⇒ déterminisme)** : (1) tous les tirages `K` de la feuille (dans l'ordre
  ci-dessus), effectués pendant `derivePowersFromTraits` ; (2) puis, côté appelant, la **puissance/maîtrise**
  de chaque pouvoir dans l'ordre de la liste (`inheritStats(i, …)`). Cet ordre prolonge celui déjà en place
  (« dériver tout, puis P/M ») ; il est simplement étendu au cas « deux pouvoirs ».
- **Inscription ADN** : un trait généré par `K` est inscrit **une seule fois** dans l'ADN (map `working`,
  dédoublonnage par `traitId`, cf. `inscribeGenerated`) même s'il est réutilisé par les deux pouvoirs.
- **Rationale** : satisfait « un seul tirage par `Kx` partagé, réutilisé » (FR-004) et « échec ⇒ seuls les
  pouvoirs référençant ce jeton tombent » (FR-005), tout en gardant un ordre de consommation reproductible.
- **Conséquence attendue** : le flux RNG **diffère de v0.14.x** (gabarits changés, tirages `K` regroupés,
  davantage de P/M). Les tests seed-fixe figeront les **nouvelles** valeurs (documenté dans la spec).
- **Alternatives rejetées** : (a) un tirage `K` par occurrence (double tirage pour un `Kp` partagé) —
  viole FR-004 ; (b) annuler toute la feuille au moindre échec `K` — rejeté par l'auteur en clarification.

## R4 — Identité des pouvoirs (FR-011)

- **Décision** : l'id reste `pw:DERIVE:${traitIds.join('+')}` **suffixé par l'index** du pouvoir dans la
  sous-liste : `…#0`, `…#1`. Unicité **par personne** garantie ; collisions **inter-personnes** tolérées
  (id dérivé du contenu, aucun registre global) — conforme au comportement existant.
- **Rationale** : minimal, déterministe, n'altère pas la sémantique d'affichage (l'UI cle par **libellé**).
- **Alternatives rejetées** : hash de libellé (plus verbeux, dépend du libellé) ; ids composés uniquement
  des traits réellement référencés (n'assure pas l'unicité si les deux pouvoirs référencent les mêmes traits).

## R5 — `traitIds` porté par chaque pouvoir

- **Décision** : chaque pouvoir d'une feuille porte les `traitIds` de **la sous-liste** (base commune) plus
  les **traits générés par `K` qu'il référence**. Ainsi le pouvoir sans `{Ka}` ne se voit pas attribuer le
  trait action généré du pouvoir voisin, tandis que le trait `{Kp}` partagé figure dans les deux.
- **Rationale** : cohérent avec le sens « traits dont dérive le pouvoir » et avec l'inscription ADN unique.
- **Alternatives rejetées** : donner tous les traits générés aux deux pouvoirs (attribuerait à un pouvoir un
  trait qu'il ne mentionne pas).

## R6 — Points de génération impactés

- **Décision** : aucune modification propre à `genesis`, `reproduce`, `regeneratePowers`, sandbox
  make-it-real : tous appellent `derivePowersFromTraits` puis mappent `inheritStats` par index sur la liste
  retournée. Le passage à 2 pouvoirs est absorbé automatiquement.
- **Rationale** : point de passage unique ⇒ parité garantie (FR-009) sans duplication de logique.
- **Vérifié** : `reproduce.ts:69-77`, `regenerate.ts:34-41`.

## R7 — Persistance / migration

- **Décision** : `FORMAT_VERSION` **inchangé** ; aucune migration. Les pouvoirs déjà en base gardent leur
  forme ; seuls les pouvoirs **nouvellement générés** suivent le nouvel algorithme.
- **Rationale** : le format de `Pouvoir` n'évolue pas (mêmes champs) ; recalculer romprait le déterminisme
  des états sauvegardés. Un utilisateur peut, s'il le souhaite, régénérer via la sandbox (bouton existant).
