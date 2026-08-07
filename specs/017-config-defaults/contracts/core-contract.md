# Core Contract — 017-config-defaults

Interface publique inchangée (`src/core/index.ts`) : `defaultCatalog()`, `defaultEspece()`, `defaultEspeces()`, `defaultParameters()`, `slug()` conservent leurs signatures. Le contrat porte sur leur **valeur de retour** (désormais dérivée de la source unique).

## Invariants de contrat

- **INV-C1** : `defaultCatalog()` retourne un `Catalog` profondément égal au bloc `catalog` de `defaultConfig.json` (types, ordre intra-type, `id`/`label`/`type`/`weight` exacts).
- **INV-C2** : `defaultEspeces()` retourne un `Espece[]` profondément égal au bloc `especes` du fichier ; `defaultEspece()` retourne son premier élément.
- **INV-C3** : `defaultParameters()` retourne un `Parameters` profondément égal au bloc `parameters` du fichier, **à l'exception** de `seed` qui vaut `'0'`.
- **INV-C4** : `defaultParameters().seed === '0'` (jamais la seed du fichier). Vérifiable sans UI.
- **INV-C5** : chaque fabrique retourne une **nouvelle** instance à chaque appel ; muter le résultat n'altère pas les appels suivants (immutabilité, pas d'aliasing de la source).
- **INV-C6** : aucune fabrique n'accède au DOM, au réseau, à `rsrc/`, ni à `Math.random`/horloge (cœur pur, Principes I/II/IV ; FR-009).
- **INV-C7** : les exports de `src/core/index.ts` restent identiques (mêmes noms, mêmes signatures) ; l'UI n'a pas à changer d'import.
- **INV-C8** : `FORMAT_VERSION` inchangé ; `parseImport`/`mergeConfig`/`mergeData` se comportent comme avant sur des fichiers existants (SC-004).
- **INV-C9 (déterminisme)** : à seed fixée et actions identiques, les sorties restent reproductibles ; il est **attendu** que les valeurs numériques diffèrent des versions ≤ v0.15.x (nouveaux défauts, FR-008).

## Points de vérification (tests)

| ID | Vérifie | Type de test |
|----|---------|--------------|
| INV-C1 | catalogue = config | `default-config.test.ts` (deep equal) |
| INV-C2 | espèces = config | `default-config.test.ts` |
| INV-C3 | paramètres = config (hors seed) | `default-config.test.ts` |
| INV-C4 | seed = '0' | `default-config.test.ts` |
| INV-C5 | immutabilité / non-aliasing | `default-config.test.ts` + `edit-catalog.test.ts` (déjà) |
| INV-C6 | pureté (pas d'I/O) | revue de code + absence d'import interdit |
| INV-C7 | API inchangée | compilation + tests existants |
| INV-C8 | import/format inchangé | `state.test.ts` |
| INV-C9 | déterminisme seed-fixe | tests génétiques existants réalignés |
