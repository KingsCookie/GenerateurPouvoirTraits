import { describe, it, expect } from 'vitest';
import { sortPopulation, type FilterContext } from '../../src/core/genealogy/filter.js';
import type { Personne } from '../../src/core/model/personne.js';
import type { Pouvoir } from '../../src/core/model/pouvoir.js';

// Tri pur, déterministe (Feature 010). Population construite à la main pour contrôler noms/dates.
const ctx: FilterContext = { currentYear: 100, genesisYear: 0 };

function mk(id: string, nom: string, dateNaissance: string, pouvoirs: Pouvoir[] = []): Personne {
  return {
    id,
    nom,
    especeId: 'humain',
    genreId: 'g-1',
    dateNaissance,
    // Âge suivi (Feature 015) = valeur dérivée à currentYear=100 (comportement historique du tri âge).
    age: 100 - Number(dateNaissance.split('-')[0]),
    vivant: true,
    raisonDeces: null,
    immortel: false,
    parents: [],
    enfants: [],
    conjoints: [],
    adn: { traits: [] },
    pouvoirs,
    notes: null,
  };
}

/** Pouvoir minimal avec puissance/maîtrise donnés (pour les tris P/M). */
function pow(puissance: number, maitrise: number): Pouvoir {
  return { id: 'x', label: 'x', template: 'DERIVE', traitIds: [], puissance, maitrise };
}

// Ordre « par défaut » = date de naissance puis id (comme filterPopulation).
const base: Personne[] = [
  mk('p2', 'Bruno', '0010-01-01'),
  mk('p1', 'Zoé', '0005-01-01'),
  mk('p3', 'alice', '0020-01-01'),
];
const ids = (pop: { id: string }[]) => pop.map((p) => p.id);

describe('sortPopulation (Feature 010)', () => {
  it('key=null ⇒ ordre reçu préservé (tri par défaut)', () => {
    expect(ids(sortPopulation(base, null, 'asc', ctx))).toEqual(['p2', 'p1', 'p3']);
  });

  it('nom : alphabétique insensible casse/accents (asc puis desc)', () => {
    // « alice » (minuscule) doit passer avant « Bruno » et « Zoé ».
    expect(ids(sortPopulation(base, 'nom', 'asc', ctx))).toEqual(['p3', 'p2', 'p1']);
    expect(ids(sortPopulation(base, 'nom', 'desc', ctx))).toEqual(['p1', 'p2', 'p3']);
  });

  it('naissance : chronologique (asc) puis inverse (desc)', () => {
    expect(ids(sortPopulation(base, 'naissance', 'asc', ctx))).toEqual(['p1', 'p2', 'p3']);
    expect(ids(sortPopulation(base, 'naissance', 'desc', ctx))).toEqual(['p3', 'p2', 'p1']);
  });

  it('age : numérique — croissant = du plus jeune au plus vieux', () => {
    // À currentYear=100 : p3 (né 0020) = 80 ans, p2 (0010) = 90, p1 (0005) = 95.
    expect(ids(sortPopulation(base, 'age', 'asc', ctx))).toEqual(['p3', 'p2', 'p1']);
    expect(ids(sortPopulation(base, 'age', 'desc', ctx))).toEqual(['p1', 'p2', 'p3']);
  });

  it('départage stable et déterministe pour des clés égales', () => {
    // Deux individus nés la même année ⇒ départage par id (byBirthThenId), non inversé.
    const tie = [mk('b', 'Même', '0030-01-01'), mk('a', 'Même', '0030-01-01')];
    // tri par nom (égal) ⇒ ordre stable a avant b (id croissant), en asc comme en desc.
    expect(ids(sortPopulation(tie, 'nom', 'asc', ctx))).toEqual(['a', 'b']);
    expect(ids(sortPopulation(tie, 'nom', 'desc', ctx))).toEqual(['a', 'b']);
  });

  it('pur : ne mute pas le tableau d’entrée', () => {
    const order = ids(base).join(',');
    sortPopulation(base, 'nom', 'asc', ctx);
    expect(ids(base).join(',')).toBe(order);
  });
});

describe('sortPopulation — tris puissance/maîtrise (Feature 015, US3)', () => {
  // p1 : pouvoirs P{2,9} ; p2 : P{5} ; p3 : sans pouvoir. Dates distinctes pour un ordre stable.
  const multi = pow(2, 3);
  const p1 = mk('p1', 'A', '0001-01-01', [multi, pow(9, 1)]);
  const p2 = mk('p2', 'B', '0002-01-01', [pow(5, 5)]);
  const p3 = mk('p3', 'C', '0003-01-01', []); // sans pouvoir

  it('croissant : classe le multi-pouvoirs sur sa valeur la plus basse ; sans-pouvoir en fin', () => {
    // Puissance : p1→min(2,9)=2, p2→5. Ordre croissant : p1, p2, puis p3 (sans pouvoir) en fin.
    expect(ids(sortPopulation([p3, p2, p1], 'puissance', 'asc', ctx))).toEqual(['p1', 'p2', 'p3']);
  });

  it('décroissant : classe le multi-pouvoirs sur sa valeur la plus haute ; sans-pouvoir en fin', () => {
    // Puissance : p1→max(2,9)=9, p2→5. Ordre décroissant : p1 (9), p2 (5), puis p3 en fin (jamais en tête).
    expect(ids(sortPopulation([p3, p1, p2], 'puissance', 'desc', ctx))).toEqual(['p1', 'p2', 'p3']);
  });

  it('maîtrise : même règle d’extrême et sans-pouvoir en fin', () => {
    // Maîtrise : p1→min(3,1)=1 (asc), p2→5. Croissant : p1(1), p2(5), p3 fin.
    expect(ids(sortPopulation([p2, p3, p1], 'maitrise', 'asc', ctx))).toEqual(['p1', 'p2', 'p3']);
    // Décroissant : p1→max(3,1)=3, p2→5 ⇒ p2(5), p1(3), p3 fin.
    expect(ids(sortPopulation([p3, p1, p2], 'maitrise', 'desc', ctx))).toEqual(['p2', 'p1', 'p3']);
  });
});
