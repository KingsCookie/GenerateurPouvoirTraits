import type { Rng } from '../rng/rng.js';
import type { Catalog } from '../model/trait.js';
import type { Parameters } from '../params/parameters.js';
import { resolveResilience } from '../params/resolveResilience.js';
import type { Personne } from '../model/personne.js';
import { GENRE_TOUT } from '../model/espece.js';
import { defaultEspece } from '../catalog/defaultCatalog.js';
import { generateStrongMutationPower } from '../powers/strongMutation.js';
import { generateName } from './names.js';
import { isoDate } from './dates.js';

function personId(index: number): string {
  return `p-${String(index + 1).padStart(6, '0')}`;
}

/**
 * Génère le batch initial de façon **strictement déterministe** : toute l'aléatoire passe
 * par `rng`. Chaque individu naît à l'âge 0 dans `params.birthYear`, avec au plus un
 * pouvoir (gabarit de mutation forte) selon `params.powerChancePct` (INV-1..7).
 *
 * Ordre des tirages par individu (fixe) : genre → prénom → jour de naissance →
 * présence de pouvoir → [gabarit/traits/puissance/maîtrise si pouvoir].
 */
export function generateInitialPopulation(
  params: Parameters,
  catalog: Catalog,
  rng: Rng,
): Personne[] {
  const espece = defaultEspece();
  const concreteGenres = espece.genres.filter((g) => g.id !== GENRE_TOUT);
  const genrePool = concreteGenres.length > 0 ? concreteGenres : espece.genres;

  const population: Personne[] = [];
  for (let i = 0; i < params.batchSize; i++) {
    const genreId = rng.pick(genrePool).id;
    const nom = generateName(rng, genreId);
    const dayOfYear = rng.nextInt(365);
    const dateNaissance = isoDate(params.birthYear, dayOfYear);

    const personne: Personne = {
      id: personId(i),
      nom,
      especeId: espece.id,
      genreId,
      dateNaissance,
      age: 0, // genèse : tout le monde naît à 0 an (§6.5)
      vivant: true,
      raisonDeces: null,
      immortel: false,
      parents: [],
      enfants: [],
      conjoints: [],
      adn: { traits: [] },
      pouvoirs: [],
      notes: null,
    };

    if (rng.chance(params.powerChancePct)) {
      const power = generateStrongMutationPower(catalog, params, rng);
      if (power) {
        personne.pouvoirs = [power];
        personne.adn = {
          traits: power.traitIds.map((traitId) => {
            // Résilience initiale **effective** (global → type → trait), plafonnée (§9.2).
            const eff = resolveResilience(params, traitId);
            return {
              traitId,
              active: true,
              resilience: Math.min(eff.initial, eff.max),
            };
          }),
        };
      }
    }

    population.push(personne);
  }
  return population;
}
