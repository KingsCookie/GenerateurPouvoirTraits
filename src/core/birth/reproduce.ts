import type { Rng } from '../rng/rng.js';
import type { Catalog, Trait } from '../model/trait.js';
import { TRAIT_TYPES } from '../model/traitType.js';
import type { Parameters } from '../params/parameters.js';
import { resolveResilience } from '../params/resolveResilience.js';
import { resolveWeight } from '../params/resolveWeight.js';
import type { Personne } from '../model/personne.js';
import type { ADN, ResilientTrait } from '../model/adn.js';
import type { Pouvoir } from '../model/pouvoir.js';
import { inheritADN } from '../heredity/inherit.js';
import { derivePowersFromTraits } from '../powers/traitsToPowers.js';
import { inheritStats } from '../powers/inheritStats.js';
import { generateStrongMutationPower } from '../powers/strongMutation.js';
import { generateName } from '../genesis/names.js';
import { isoDate } from '../genesis/dates.js';

export type BirthCase = 'forte' | 'sansPouvoir' | 'normale';

export interface ReproduceOptions {
  childId: string;
  birthYear: number;
  /**
   * Jour de l'année (0–364) **partagé** par toute une portée (US2). Fourni par l'appelant
   * (`tick.reproduceCouple`) qui le tire **une seule fois** par portée ⇒ tous les enfants d'une
   * même reproduction ont la **même** date de naissance. Absent ⇒ tirage interne via `rng`
   * (comportement conservé pour une reproduction d'un seul enfant, ex. sandbox).
   */
  birthDayOfYear?: number;
}

/**
 * Produit **un** enfant déterministe à partir des parents sélectionnés (≥ 1), selon le pipeline §5.
 * N'effectue **aucune** vérification d'appariement (espèce/couple/consanguinité — Feature 3).
 *
 * Ordre des tirages (fixe ⇒ déterminisme strict, SC-001/INV-1) :
 *   1. cas (forte / sans pouvoir / normale)   2. identité (genre, nom, jour)
 *   3. ADN (hérédité §4 | parental inactif)    4. mutation faible (normale)
 *   5. pouvoirs (§6.4 | gabarit | aucun)        6. puissance/maîtrise (§7.2 | 1-10)
 */
export function reproduce(
  parents: Personne[],
  params: Parameters,
  catalog: Catalog,
  rng: Rng,
  options: ReproduceOptions,
): Personne {
  // 1. Tirage du cas (deux tirages, ordre fixe : mutation forte puis sans pouvoir).
  const strongRoll = rng.chance(params.strongMutationRatePct);
  const noPowerRoll = rng.chance(params.noPowerRatePct);
  const birthCase: BirthCase = strongRoll ? 'forte' : noPowerRoll ? 'sansPouvoir' : 'normale';

  // 2. Identité de l'enfant.
  const genreId = rng.pick(parents.map((p) => p.genreId));
  const nom = generateName(rng, genreId);
  // US2 : jour partagé de portée si fourni ; sinon tirage interne (portée d'un seul enfant).
  const dayOfYear = options.birthDayOfYear ?? rng.nextInt(365);
  const dateNaissance = isoDate(options.birthYear, dayOfYear);
  const especeId = parents[0].especeId;

  let adn: ADN;
  let pouvoirs: Pouvoir[] = [];

  if (birthCase === 'normale') {
    // 3. ADN par hérédité (§4).
    adn = inheritADN(parents, params, rng);
    // 4. Mutation faible (gain puis perte) — AVANT la dérivation des pouvoirs (§5, étape 3 < 4).
    adn = applyWeakMutation(adn, catalog, params, rng);
    // 5. Pouvoirs dérivés (§6.4) ; l'ADN peut être enrichi (génération K).
    const derived = derivePowersFromTraits(adn, catalog, params, rng);
    adn = derived.adn;
    pouvoirs = derived.pouvoirs;
    // 6. Puissance/maîtrise (§7.2) : mélange unique des pouvoirs de chaque parent, puis i-ᵉ.
    const shuffledParents = parents.map((p) => ({ ...p, pouvoirs: rng.shuffle(p.pouvoirs) }));
    pouvoirs = pouvoirs.map((pw, i) => ({
      ...pw,
      ...inheritStats(i, shuffledParents, params, rng),
    }));
  } else {
    // Cas spéciaux : tous les traits parentaux hérités **inactifs** (option « malus génome »).
    adn = inheritInactiveADN(parents, params);
    if (birthCase === 'forte') {
      // 5/6. Un unique pouvoir gabarit (Feature 1) ; ses traits deviennent actifs ; P/M 1-10.
      const power = generateStrongMutationPower(catalog, params, rng);
      if (power) {
        pouvoirs = [power]; // generateStrongMutationPower tire déjà puissance/maîtrise ∈ [1,10]
        adn = activateTraits(adn, power.traitIds, params);
      }
    }
    // sansPouvoir : aucun pouvoir, ADN parental inactif.
  }

  return {
    id: options.childId,
    nom,
    especeId,
    genreId,
    dateNaissance,
    age: 0, // nouveau-né : 0 an (§6.5)
    vivant: true,
    raisonDeces: null,
    immortel: false,
    parents: parents.map((p) => p.id),
    enfants: [],
    conjoints: [],
    adn,
    pouvoirs,
    notes: null,
  };
}

// --- Helpers internes -------------------------------------------------------

/** Mutation faible (§6.3) : gain puis perte, tirages indépendants. Renvoie un nouvel ADN. */
function applyWeakMutation(adn: ADN, catalog: Catalog, params: Parameters, rng: Rng): ADN {
  const traits = adn.traits.map((t) => ({ ...t }));

  // Gain d'un trait. Poids effectif (surcharge ?? poids du type) ; tirage **tolérant** : si aucun
  // candidat tirable (tous poids 0) ⇒ **no-op** (pas de gain, FR-052b), jamais d'exception.
  if (rng.chance(params.weakMutationGainPct)) {
    const flat = flattenCatalog(catalog);
    if (flat.length > 0) {
      const gained = rng.pickWeightedOrNull(flat, (t) =>
        resolveWeight(t.id, t.weight, params.traitTypeWeights),
      );
      if (gained !== null) {
        const eff = resolveResilience(params, gained.id);
        const existing = traits.find((t) => t.traitId === gained.id);
        if (existing) {
          existing.active = true;
          existing.resilience = Math.min(existing.resilience + params.bonusPoints, eff.max);
        } else {
          traits.push({
            traitId: gained.id,
            active: true,
            resilience: Math.min(eff.initial, eff.max),
          });
        }
      }
    }
  }

  // Perte d'un trait (parmi ses traits, actif ou inactif).
  if (rng.chance(params.weakMutationLossPct) && traits.length > 0) {
    const idx = rng.nextInt(traits.length);
    traits.splice(idx, 1);
  }

  return { traits };
}

/** Cas spéciaux : union des traits parentaux **inactifs** ; résilience = max ; malus optionnel. */
function inheritInactiveADN(parents: Personne[], params: Parameters): ADN {
  const maxResById = new Map<string, number>();
  for (const parent of parents) {
    for (const t of parent.adn.traits) {
      const prev = maxResById.get(t.traitId);
      maxResById.set(t.traitId, prev === undefined ? t.resilience : Math.max(prev, t.resilience));
    }
  }

  const traits: ResilientTrait[] = [];
  for (const traitId of [...maxResById.keys()].sort()) {
    // Plafond/seuil **effectifs** par trait (global → type → trait, §9.2).
    const eff = resolveResilience(params, traitId);
    let resilience = maxResById.get(traitId)!;
    if (params.genomeMalusEnabled) resilience -= params.malusPoints;
    resilience = Math.min(Math.max(resilience, 0), eff.max);
    if (resilience < eff.disappearThreshold) continue;
    traits.push({ traitId, active: false, resilience });
  }
  return { traits };
}

/** Active (ou ajoute) les traits d'un pouvoir gabarit dans l'ADN, à la résilience initiale effective. */
function activateTraits(adn: ADN, traitIds: string[], params: Parameters): ADN {
  const byId = new Map(adn.traits.map((t) => [t.traitId, { ...t }]));
  for (const traitId of traitIds) {
    const eff = resolveResilience(params, traitId);
    byId.set(traitId, { traitId, active: true, resilience: Math.min(eff.initial, eff.max) });
  }
  return { traits: [...byId.values()] };
}

// Ordre canonique fixe (TRAIT_TYPES) : indépendant de l'ordre des clés de l'objet `byType`,
// que la sérialisation canonique réordonne (clés triées). Garantit que `pickWeighted` tire le
// même trait avant/après export-import (déterminisme strict, FR-021).
function flattenCatalog(catalog: Catalog): Trait[] {
  const out: Trait[] = [];
  for (const type of TRAIT_TYPES) out.push(...catalog.byType[type]);
  return out;
}
