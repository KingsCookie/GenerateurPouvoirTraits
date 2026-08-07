// Source UNIQUE et centralisée des valeurs par défaut de l'application (Feature 017).
//
// `defaultConfig.json` embarque **verbatim** les trois blocs (`catalog`, `especes`,
// `parameters`) du fichier de config de référence fourni par un utilisateur. Il est bundlé
// au build (import JSON, Principe II) — aucune I/O runtime, aucune dépendance à `rsrc/`.
//
// Règle d'or : **toute** valeur par défaut de catalogue/espèces/paramètres provient d'ici
// (INV-DM1). Les fabriques `defaultCatalog()`/`defaultEspeces()`/`defaultParameters()` ne
// sont plus que de minces adaptateurs vers cette source.
import raw from './defaultConfig.json';
import type { Catalog } from '../model/trait.js';
import type { Espece } from '../model/espece.js';
import type { Parameters } from '../params/parameters.js';

// Le JSON est typé de façon lâche à l'import ; on le fige aux types du domaine. Les données
// ont été copiées depuis un export produit par l'application, donc structurellement conformes.
interface DefaultConfig {
  catalog: Catalog;
  especes: Espece[];
  parameters: Parameters;
}
const CONFIG = raw as unknown as DefaultConfig;

/**
 * Clone profond pur (déterministe, sans I/O). Garantit qu'un appelant qui mute le résultat
 * n'altère pas la source ni les appels suivants (INV-C5 / INV-DM5).
 */
function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Catalogue par défaut = bloc `catalog` du fichier de config (clone frais). */
export function DEFAULT_CATALOG(): Catalog {
  return clone(CONFIG.catalog);
}

/** Espèces par défaut = bloc `especes` du fichier de config (clone frais). */
export function DEFAULT_ESPECES(): Espece[] {
  return clone(CONFIG.especes);
}

/**
 * Paramètres par défaut = bloc `parameters` du fichier de config (clone frais), **seed exclue** :
 * la `seed` est **toujours** forcée à `'0'` ici (cœur pur sans entropie, Principe I / FR-005).
 * L'UI tire une vraie seed via `createSeed()` au démarrage (seul point d'entropie).
 */
export function DEFAULT_PARAMETERS(): Parameters {
  return { ...clone(CONFIG.parameters), seed: '0' };
}
