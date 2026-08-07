# Data Model — 017-config-defaults

Cette feature n'introduit **aucun nouveau type** ni changement de format. Elle centralise les **instances** de défauts. Les entités ci-dessous décrivent la source unique et ses invariants.

## Source unique : `src/core/default/defaultConfig`

### `defaultConfig.json`

Copie **verbatim** des trois blocs du fichier de config utilisateur :

```jsonc
{
  "catalog":    { "byType": { "Action": [...], "Ajout": [...], "Element": [...],
                              "Etat": [...], "PartieCorps": [...], "Remplacement": [...] } },
  "especes":    [ { "id": "humain", ... } ],
  "parameters": { "batchSize": 300, ..., "seed": "..." }   // seed présente mais neutralisée par le loader
}
```

- `kind` et `formatVersion` du fichier d'origine ne sont **pas** requis ici (le JSON ne sert qu'à porter les 3 blocs). S'ils sont conservés, ils sont ignorés.

### `defaultConfig.ts` (accès pur, typé)

- `DEFAULT_CATALOG(): Catalog` — clone profond du bloc `catalog`.
- `DEFAULT_ESPECES(): Espece[]` — clone profond du bloc `especes`.
- `DEFAULT_PARAMETERS(): Parameters` — clone profond du bloc `parameters` **avec `seed` forcée à `'0'`**.

> Les trois fabriques publiques (`defaultCatalog`, `defaultEspeces`, `defaultParameters`) réexportent/appellent ces accès. Aucun changement de signature ni d'export public dans `src/core/index.ts`.

## Entités (instances par défaut)

### Catalogue par défaut (`Catalog`)

- `byType: Record<TraitType, Trait[]>` avec `TraitType ∈ {Action, Ajout, Element, Etat, PartieCorps, Remplacement}`.
- `Trait = { id: string; type: TraitType; label: string; weight: number | null }`.
- Contenu = celui du fichier de config (types, libellés, **ids exacts**, surcharges de poids incluses — ex. `Action:controle-1` `weight:6`, `Ajout:bras-6` `weight:0.5`, `Remplacement:main-3` `weight:0.5`).

### Espèce par défaut (`Espece`, « humain »)

- `id: 'humain'`, `label: 'Humain'`.
- `genres`: `[{id:'tout',label:'Tout'},{id:'feminin',label:'Féminin'},{id:'masculin',label:'Masculin'}]`.
- Repro/vie : `reproStartAge:18, reproPeakAge:30, reproEndAge:50, reproPeakPct:20, reproSlope:6, groupSize:2, litterMin:1, litterMax:4, litterExtraPct:5, divorcePct:2, esperanceVie:60, mortNaturellePct:9`.

### Paramètres par défaut (`Parameters`)

- Numériques/booléens issus du fichier : `batchSize:300, birthYear:1880, powerChancePct:1, initialResilience:50, duplicationD:1.5, generationK:10, resilienceMax:95, bonusPoints:5, malusPoints:5, disappearThreshold:20, strongMutationRatePct:10, noPowerRatePct:10, weakMutationGainPct:10, weakMutationLossPct:10, genomeMalusEnabled:true, statB:25, statC:25, consanguinityAllowed:false`.
- `templateWeights: { AE:4, PA:1, PE:1, PR:1 }`.
- `traitTypeWeights: { Action:4, Ajout:1, Element:2, Etat:1, PartieCorps:1, Remplacement:1 }`.
- `resilienceOverrides: { byType:{}, byTrait:{} }`.
- `seed: '0'` — **forcée** (jamais la valeur du fichier).

## Invariants

- **INV-DM1 (source unique)** : toute valeur par défaut de catalogue/espèces/paramètres provient de `src/core/default/`. Aucune autre définition de défaut ne subsiste (les anciennes constantes `RAW`, littéraux de `defaultEspece`/`defaultParameters` sont supprimés ou dérivés).
- **INV-DM2 (verbatim)** : `defaultCatalog()` et `defaultEspeces()` sont profondément égaux aux blocs `catalog`/`especes` du fichier de config (ids, labels, poids, ordre au sein de chaque type).
- **INV-DM3 (params complets)** : `defaultParameters()` est profondément égal au bloc `parameters` du fichier **sauf** `seed` (= `'0'`).
- **INV-DM4 (seed exclue)** : `defaultParameters().seed === '0'` et jamais `"4392551652664730716"`.
- **INV-DM5 (immutabilité)** : deux appels successifs d'une fabrique retournent des objets **distincts** (pas d'aliasing) ; muter l'un n'affecte pas l'autre.
- **INV-DM6 (format inchangé)** : `FORMAT_VERSION` inchangé ; aucun code de migration ajouté.
- **INV-DM7 (pas d'aléa)** : aucune des fabriques n'utilise `Math.random`/horloge ; la seed n'est jamais tirée dans le cœur.
