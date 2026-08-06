// Fixture de test partagée (Feature 4) : familles déterministes construites à la main (sans RNG),
// couvrant parents/enfants, conjoints actuel/ex, enfants d'unions multiples, enfants tiers,
// consanguinité (cousins) et plusieurs générations (> 60 ans). Réutilisée par les tests cœur
// arbre (genealogy-tree) et filtres (genealogy-filter).
import type { Personne } from '../../src/core/model/personne.js';
import type { ResilientTrait } from '../../src/core/model/adn.js';
import type { Pouvoir } from '../../src/core/model/pouvoir.js';
import type { Conjoint } from '../../src/core/model/personne.js';

interface PartialPersonne {
  id: string;
  nom: string;
  dateNaissance: string;
  especeId?: string;
  vivant?: boolean;
  parents?: string[];
  enfants?: string[];
  conjoints?: Conjoint[];
  traits?: ResilientTrait[];
  pouvoirs?: Pouvoir[];
}

function mk(p: PartialPersonne): Personne {
  return {
    id: p.id,
    nom: p.nom,
    especeId: p.especeId ?? 'humain',
    genreId: 'g-1',
    dateNaissance: p.dateNaissance,
    // Âge suivi (Feature 015) = valeur dérivée à currentYear=100 (les tests arbre/filtre l'utilisent).
    age: 100 - Number(p.dateNaissance.split('-')[0]),
    vivant: p.vivant ?? true,
    raisonDeces: p.vivant === false ? 'âge' : null,
    immortel: false,
    parents: p.parents ?? [],
    enfants: p.enfants ?? [],
    conjoints: p.conjoints ?? [],
    adn: { traits: p.traits ?? [] },
    pouvoirs: p.pouvoirs ?? [],
    notes: null,
  };
}

// Pouvoir minimal (DERIVE ⇒ libellé pré-calculé, aucune dépendance au catalogue).
const POUVOIR_FEU: Pouvoir = {
  id: 'pw-1',
  label: 'boule de feu',
  template: 'DERIVE',
  traitIds: ['tr-feu'],
  puissance: 5,
  maitrise: 5,
};

/**
 * Arbre de référence (id → personne) :
 *
 * a1 + a2 (gen 0)                  — grands-parents
 *   ├─ b1 (gen 1) × cx (ex) ⇒ d1   et × cc (actuel) ⇒ d2   (cc a aussi d3 avec xo : enfant tiers)
 *   └─ b2 (gen 1) × bs (actuel) ⇒ e1
 *        d1 × e1 (cousins, consanguinité) ⇒ f1 (gen 3, naissance 0062)
 */
export function buildGenealogyFixture(): { population: Personne[]; byId: Map<string, Personne> } {
  const population: Personne[] = [
    mk({
      id: 'a1',
      nom: 'Aldric',
      dateNaissance: '0000-01-01',
      conjoints: [{ id: 'a2', statut: 'actuel' }],
      enfants: ['b1', 'b2'],
    }),
    mk({
      id: 'a2',
      nom: 'Aria',
      dateNaissance: '0002-01-01',
      conjoints: [{ id: 'a1', statut: 'actuel' }],
      enfants: ['b1', 'b2'],
    }),

    mk({
      id: 'b1',
      nom: 'Bren',
      dateNaissance: '0021-01-01',
      parents: ['a1', 'a2'],
      conjoints: [
        { id: 'cx', statut: 'ex' },
        { id: 'cc', statut: 'actuel' },
      ],
      enfants: ['d1', 'd2'],
      traits: [{ traitId: 'tr-feu', active: true, resilience: 50 }],
    }),
    mk({
      id: 'b2',
      nom: 'Bora',
      dateNaissance: '0023-01-01',
      parents: ['a1', 'a2'],
      conjoints: [{ id: 'bs', statut: 'actuel' }],
      enfants: ['e1'],
      traits: [{ traitId: 'tr-feu', active: false, resilience: 30 }],
    }),

    mk({
      id: 'cx',
      nom: 'Cassia',
      dateNaissance: '0020-01-01',
      conjoints: [{ id: 'b1', statut: 'ex' }],
      enfants: ['d1'],
    }),
    mk({
      id: 'cc',
      nom: 'Coram',
      dateNaissance: '0022-01-01',
      conjoints: [{ id: 'b1', statut: 'actuel' }],
      enfants: ['d2', 'd3'],
    }),
    mk({
      id: 'bs',
      nom: 'Belen',
      dateNaissance: '0024-01-01',
      conjoints: [{ id: 'b2', statut: 'actuel' }],
      enfants: ['e1'],
    }),
    mk({
      id: 'xo',
      nom: 'Xanthe',
      dateNaissance: '0019-01-01',
      conjoints: [{ id: 'cc', statut: 'ex' }],
      enfants: ['d3'],
    }),

    mk({
      id: 'd1',
      nom: 'Dara',
      dateNaissance: '0041-01-01',
      parents: ['b1', 'cx'],
      conjoints: [{ id: 'e1', statut: 'actuel' }],
      enfants: ['f1'],
      traits: [{ traitId: 'tr-glace', active: true, resilience: 40 }],
    }),
    mk({ id: 'd2', nom: 'Doran', dateNaissance: '0044-01-01', parents: ['b1', 'cc'] }),
    mk({
      id: 'd3',
      nom: 'Délphine',
      dateNaissance: '0040-01-01',
      parents: ['cc', 'xo'],
      especeId: 'elfe',
      vivant: false,
      pouvoirs: [POUVOIR_FEU],
    }),

    mk({
      id: 'e1',
      nom: 'Elias',
      dateNaissance: '0043-01-01',
      parents: ['b2', 'bs'],
      conjoints: [{ id: 'd1', statut: 'actuel' }],
      enfants: ['f1'],
    }),

    mk({ id: 'f1', nom: 'Faye', dateNaissance: '0062-01-01', parents: ['d1', 'e1'] }),

    // Famille à 3 parents (union de groupe, BUG-006) — isolée du reste pour ne pas perturber les
    // autres assertions. pa, pb, pc sont conjoints entre eux et co-parents de `tri`.
    mk({
      id: 'pa',
      nom: 'Paavo',
      dateNaissance: '0030-01-01',
      conjoints: [
        { id: 'pb', statut: 'actuel' },
        { id: 'pc', statut: 'actuel' },
      ],
      enfants: ['tri'],
    }),
    mk({
      id: 'pb',
      nom: 'Petra',
      dateNaissance: '0031-01-01',
      conjoints: [
        { id: 'pa', statut: 'actuel' },
        { id: 'pc', statut: 'actuel' },
      ],
      enfants: ['tri'],
    }),
    mk({
      id: 'pc',
      nom: 'Pirjo',
      dateNaissance: '0032-01-01',
      conjoints: [
        { id: 'pa', statut: 'actuel' },
        { id: 'pb', statut: 'actuel' },
      ],
      enfants: ['tri'],
    }),
    mk({ id: 'tri', nom: 'Tristan', dateNaissance: '0033-01-01', parents: ['pa', 'pb', 'pc'] }),

    // Co-parents NON conjoints (BUG-007) — qa et qb ont un enfant commun `duo` mais ne sont PAS en
    // union (aucun `conjoints`). Valide le cas « parents reliés sans symbole ⚭ » côté données.
    mk({ id: 'qa', nom: 'Quill', dateNaissance: '0034-01-01', enfants: ['duo'] }),
    mk({ id: 'qb', nom: 'Quira', dateNaissance: '0035-01-01', enfants: ['duo'] }),
    mk({ id: 'duo', nom: 'Dario', dateNaissance: '0036-01-01', parents: ['qa', 'qb'] }),
  ];

  const byId = new Map(population.map((p) => [p.id, p]));
  return { population, byId };
}

export const FIXTURE_CATALOG_ID = 'tr-feu';
