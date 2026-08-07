import { describe, it, expect } from 'vitest';
import {
  addTrait,
  renameTrait,
  removeTrait,
  setTraitWeight,
  propagateTypeWeight,
} from '../../src/core/catalog/editCatalog.js';
import { defaultCatalog } from '../../src/core/catalog/defaultCatalog.js';
import type { Catalog } from '../../src/core/model/trait.js';

// Petit catalogue de test (déterministe, pur).
function cat(): Catalog {
  return {
    byType: {
      Remplacement: [],
      PartieCorps: [],
      Etat: [],
      Element: [{ id: 'Element:feu-0', type: 'Element', label: 'feu', weight: null }],
      Ajout: [],
      Action: [{ id: 'Action:brule-0', type: 'Action', label: 'brûle', weight: null }],
    },
  };
}

describe('editCatalog — addTrait', () => {
  it('ajoute un trait avec un id stable et unique `type:slug-n`, sans surcharge de poids', () => {
    const next = addTrait(cat(), 'Element', 'Eau Vive');
    const list = next.byType.Element;
    expect(list).toHaveLength(2);
    expect(list[1]).toEqual({
      id: 'Element:eau-vive-1',
      type: 'Element',
      label: 'Eau Vive',
      weight: null,
    });
  });

  it('tolère un libellé en doublon en produisant un id différent (INV-C2)', () => {
    let next = addTrait(cat(), 'Element', 'feu');
    next = addTrait(next, 'Element', 'feu');
    const ids = next.byType.Element.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length); // tous uniques
  });

  it('ne mute pas le catalogue d’entrée (immutabilité)', () => {
    const base = cat();
    addTrait(base, 'Element', 'glace');
    expect(base.byType.Element).toHaveLength(1);
  });
});

describe('editCatalog — renameTrait / removeTrait', () => {
  it('renomme sans changer l’id', () => {
    const next = renameTrait(cat(), 'Element:feu-0', 'Flamme');
    expect(next.byType.Element[0]).toEqual({
      id: 'Element:feu-0',
      type: 'Element',
      label: 'Flamme',
      weight: null,
    });
  });

  it('removeTrait retire du catalogue (futur seulement)', () => {
    const next = removeTrait(cat(), 'Element:feu-0');
    expect(next.byType.Element).toHaveLength(0);
    expect(next.byType.Action).toHaveLength(1); // n’affecte que le bon type
  });

  it('removeTrait sur un id absent est un no-op sûr', () => {
    const before = cat();
    const next = removeTrait(before, 'Element:inexistant-99');
    expect(next.byType.Element).toHaveLength(1);
  });
});

describe('editCatalog — poids (surcharge ?? type)', () => {
  it('setTraitWeight pose une surcharge ≥ 0', () => {
    const next = setTraitWeight(cat(), 'Element:feu-0', 5);
    expect(next.byType.Element[0].weight).toBe(5);
  });

  it('setTraitWeight borne les négatifs à 0', () => {
    const next = setTraitWeight(cat(), 'Element:feu-0', -3);
    expect(next.byType.Element[0].weight).toBe(0);
  });

  it('setTraitWeight(null) retire la surcharge (réhéritage du type)', () => {
    let next = setTraitWeight(cat(), 'Element:feu-0', 7);
    next = setTraitWeight(next, 'Element:feu-0', null);
    expect(next.byType.Element[0].weight).toBeNull();
  });

  it('propagateTypeWeight efface toutes les surcharges du type', () => {
    let next = addTrait(cat(), 'Element', 'glace'); // weight null
    next = setTraitWeight(next, 'Element:feu-0', 9);
    next = setTraitWeight(next, 'Element:glace-1', 2);
    next = propagateTypeWeight(next, 'Element');
    expect(next.byType.Element.every((t) => t.weight === null)).toBe(true);
    expect(next.byType.Action[0].weight).toBeNull(); // autres types intacts
  });
});

describe('editCatalog — catalogue par défaut', () => {
  it('les traits par défaut portent les surcharges de poids du fichier de config (source unique)', () => {
    const def = defaultCatalog();
    const all = Object.values(def.byType).flat();
    // Le catalogue par défaut vient désormais du fichier de config : certains traits portent une
    // surcharge de poids explicite, d'autres héritent du poids de leur type (weight === null).
    expect(all.some((t) => t.weight !== null)).toBe(true);
    expect(all.some((t) => t.weight === null)).toBe(true);
  });
});
