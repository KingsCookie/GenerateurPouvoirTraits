# Quickstart — 017-config-defaults

## Prérequis

- `npm install` déjà fait. Node 18+ (pour `structuredClone` en test).
- Fichier source : `rsrc/PowerGenerator_config_20260807-153421.json` (référence de vérité pour recopier dans `src/core/default/defaultConfig.json`).

## Vérification automatisée (Vitest, seed fixe)

```bash
npm run test
```

Doit passer, dont le nouveau fichier `tests/unit/default-config.test.ts` :

1. **INV-C1/C2/C3** — charger le JSON de config de référence, et vérifier `defaultCatalog()`, `defaultEspeces()`, `defaultParameters()` (hors `seed`) sont profondément égaux aux blocs correspondants.
2. **INV-C4** — `defaultParameters().seed === '0'` et `!== '4392551652664730716'`.
3. **INV-C5** — `const a = defaultCatalog(); a.byType.Action.push(...)` n'affecte pas `defaultCatalog()` (nouvel appel).
4. **INV-DM2** — quelques poids ciblés présents (`Action:controle-1` → 6, `Ajout:bras-6` → 0.5, `Remplacement:main-3` → 0.5).

Tests réalignés (valeurs par défaut changées, FR-008) :

- `gaussian.test.ts` : pic à **30** ans, max **20 %** (au lieu de 25 / 40 %). Idéalement, lire les valeurs depuis `defaultEspece()` plutôt que des littéraux.
- `edit-especes.test.ts` : `reproPeakPct` par défaut **20** (au lieu de 40).
- `edit-catalog.test.ts` : remplacer l'assertion « tous `weight === null` » par une assertion cohérente avec la source (ex. égalité avec `DEFAULT_CATALOG`, ou présence des poids attendus).
- `state.test.ts` : réaligner toute assertion portant sur une valeur par défaut modifiée.

## Vérification manuelle (UI)

Desktop + mobile :

1. Vider le stockage local (ou navigation privée) et charger l'app **sans importer** de fichier.
2. Page **Paramètres** :
   - onglet Principaux/Avancés : `batchSize` 300, année 1880, `powerChancePct` 1, `duplicationD` 1.5, seuil disparition 20, malus génome **activé**, `statB` 25 / `statC` 25, mutations 10, pondérations types `Action:4`/`Element:2`.
   - Espèce humain : pic repro 30 ans / 20 %, pente 6, divorce 2 %, mort naturelle 9 %, espérance 60.
   - Catalogue : libellés du fichier (ex. « Résistant au », « Partie de crabe », « Partie insectoïde », « Matière réfléchissante »), poids visibles là où le fichier en fixe.
3. **Seed** : vérifier qu'une seed **aléatoire** est présente (différente à chaque rechargement, jamais `4392551652664730716`).
4. Lancer une génération : population cohérente, aucune erreur console.
5. **Non-régression import** : importer un ancien fichier `full`/`config` → se charge comme avant (SC-004).

## Definition of Done

- [ ] `src/core/default/defaultConfig.json` = blocs `catalog`/`especes`/`parameters` du fichier (verbatim).
- [ ] `defaultConfig.ts` expose des accès clonés ; seed forcée à `'0'`.
- [ ] `defaultCatalog`/`defaultEspece(s)`/`defaultParameters` dérivent **uniquement** de `default/` (anciens littéraux/`RAW` supprimés).
- [ ] `default-config.test.ts` vert ; tests réalignés verts ; `npm run test` global vert.
- [ ] `npm run build` OK ; aucune dépendance runtime à `rsrc/`.
- [ ] Principe IX : `DescriptionProjet.md`/`.adoc` mis à jour (autorisation auteur) + `.pdf` recompilé **avant** implémentation.
- [ ] Bump **v1.0.0** effectué **après** validation de l'auteur.
