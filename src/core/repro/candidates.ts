import type { Rng } from '../rng/rng.js';
import type { Personne } from '../model/personne.js';
import type { Espece } from '../model/espece.js';
import { reproProbability } from './gaussian.js';

/** Un individu a-t-il un conjoint **actuel** (donc en couple) ? */
export function hasCurrentSpouse(person: Personne): boolean {
  return person.conjoints.some((c) => c.statut === 'actuel');
}

/**
 * Sélectionne les **candidats** à la reproduction d'une année (§6.6 pt 2, R4) : individus **vivants**,
 * **célibataires/divorcés** (aucun conjoint actuel), d'**âge ≤ reproEndAge**, qui tirent avec succès
 * `chance(reproProbability(âge))`. Parcours dans l'**ordre stable** de la population (déterminisme).
 * L'âge utilisé est l'âge **suivi** `person.age` (Feature 015, §R1), déjà vieilli par le tick.
 * `_currentYear` est conservé pour la stabilité de la signature (appelants positionnels).
 */
export function selectCandidates(
  population: Personne[],
  _currentYear: number,
  especeById: Map<string, Espece>,
  rng: Rng,
): string[] {
  const candidates: string[] = [];
  for (const person of population) {
    if (!person.vivant) continue;
    if (hasCurrentSpouse(person)) continue;
    const espece = especeById.get(person.especeId);
    if (!espece) continue;
    const age = person.age;
    if (age > espece.reproEndAge) continue;
    if (rng.chance(reproProbability(age, espece))) candidates.push(person.id);
  }
  return candidates;
}
