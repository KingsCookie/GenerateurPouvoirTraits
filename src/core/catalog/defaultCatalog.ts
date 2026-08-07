import type { Catalog } from '../model/trait.js';
import type { Espece } from '../model/espece.js';
import { DEFAULT_CATALOG, DEFAULT_ESPECES } from '../default/defaultConfig.js';

// Slug stable et déterministe pour l'id de trait (`type:slug-i`). Conservé ici car utilisé par
// l'édition de catalogue (`editCatalog.addTrait`) et l'UI. Sans dépendre de la casse/accents
// pour l'unicité fonctionnelle, tout en gardant un identifiant lisible.
export function slug(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Catalogue par défaut : provient **intégralement** de la source unique `src/core/default/`
 * (Feature 017, INV-DM1). Les ids/libellés/poids sont ceux du fichier de config de référence
 * (embarqués **verbatim** — non régénérables par index car des traits y ont été supprimés).
 * Un trait sans surcharge de poids (`weight = null`) hérite du poids de son type
 * (`traitTypeWeights`, Feature 5).
 */
export function defaultCatalog(): Catalog {
  return DEFAULT_CATALOG();
}

/** Espèce par défaut « humain » (premier élément de la source unique). */
export function defaultEspece(): Espece {
  return DEFAULT_ESPECES()[0];
}

/** Toutes les espèces par défaut (source unique — actuellement « humain » seul). */
export function defaultEspeces(): Espece[] {
  return DEFAULT_ESPECES();
}
