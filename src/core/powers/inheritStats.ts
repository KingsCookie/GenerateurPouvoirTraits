import type { Rng } from '../rng/rng.js';
import type { Parameters } from '../params/parameters.js';
import { statA } from '../params/parameters.js';
import type { Personne } from '../model/personne.js';

/**
 * Héritage de **puissance** et **maîtrise** du i-ᵉ pouvoir de l'enfant (§7.2).
 *
 * Pré-requis (fait **une seule fois** par l'appelant `reproduce`) : la liste des pouvoirs de
 * chaque parent a déjà été **mélangée** (déterministe). Ici on prend, pour chaque parent ayant
 * ≥ 1 pouvoir, son `i`-ᵉ pouvoir (ou `i mod nbPouvoirs`), on moyenne, on arrondit, puis on tire
 * la valeur finale A/B/C/B — **seul le cas A est borné [1,10]** (les moyennes ne le sont pas).
 *
 * Aucun parent source (aucun parent n'a de pouvoir) ⇒ **cas A** (aléatoire 1-10).
 */
export function inheritStats(
  childPowerIndex: number,
  parents: Personne[],
  params: Parameters,
  rng: Rng,
): { puissance: number; maitrise: number } {
  const sources = parents.filter((p) => p.pouvoirs.length > 0);

  if (sources.length === 0) {
    // Aucun parent source ⇒ cas A pour les deux valeurs (tirage 1-10 borné).
    const puissance = rng.nextInt(10) + 1;
    const maitrise = rng.nextInt(10) + 1;
    return { puissance, maitrise };
  }

  const puissances: number[] = [];
  const maitrises: number[] = [];
  for (const parent of sources) {
    const n = parent.pouvoirs.length;
    const idx = childPowerIndex < n ? childPowerIndex : childPowerIndex % n;
    const pw = parent.pouvoirs[idx];
    puissances.push(pw.puissance);
    maitrises.push(pw.maitrise);
  }

  const puissance = drawStat(mean(puissances), params, rng);
  const maitrise = drawStat(mean(maitrises), params, rng);
  return { puissance, maitrise };
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Arrondi §7.2 : à l'entier le plus proche ; en cas d'**égalité exacte** (partie décimale = 0,5),
// le départage est **aléatoire 50/50 via la seed** (`rng`). Ce départage symétrique supprime tout
// biais directionnel : les dépassements bas (ex. 0) et hauts (ex. 11) deviennent équiprobables.
// (Un arrondi « toujours vers le haut » ou « vers le pair » laissait un biais vers le haut.)
// `Math.floor` garantit `d ∈ [0,1)` pour tout signe ⇒ les deux candidats sont toujours `f` et `f+1`.
function roundMean(x: number, rng: Rng): number {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return rng.nextFloat() < 0.5 ? f : f + 1;
}

/**
 * Tire la valeur finale (§7.2) : A % nouvelle valeur 1-10 (bornée) / B % moy−1 / C % moy / B % moy+1.
 * Ordre des tirages (fixe) : d'abord l'arrondi de la moyenne (qui consomme un tirage **uniquement**
 * en cas d'égalité exacte à .5), puis la sélection du cas, puis (si cas A) le tirage de la valeur.
 */
function drawStat(rawMean: number, params: Parameters, rng: Rng): number {
  const m = roundMean(rawMean, rng);
  const A = statA(params);
  const B = params.statB;
  const C = params.statC;

  const roll = rng.nextFloat() * 100;
  if (roll < A) return rng.nextInt(10) + 1; // cas A : nouvelle valeur 1-10 (seul cas borné)
  if (roll < A + B) return m - 1;
  if (roll < A + B + C) return m;
  return m + 1;
}
