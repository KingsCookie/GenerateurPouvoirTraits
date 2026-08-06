// Moteur de filtres de la population — cœur PUR, déterministe, LECTURE SEULE (Principes I/IV).
// OU au sein d'une dimension non vide, ET entre dimensions renseignées (INV-G4). Aucune mutation
// des entrées : renvoie un nouveau tableau (INV-G6).
import type { Personne } from '../model/personne.js';
import { computeGeneration, yearOf } from '../genesis/derived.js';

export type TraitScope = 'actifs' | 'inactifs' | 'tous';
export type PowerPresence = 'any' | 'none' | null;
export type Statut = 'vivant' | 'décédé';

/**
 * Présence de trait dans l'ADN (dimension indépendante du choix de traits précis) — Feature 010.
 * `null` ⇒ ignoré.
 *   none-active   : aucun trait actif        · some-active   : ≥1 trait actif
 *   some-inactive : ≥1 trait inactif         · some-any      : ≥1 trait (actif ou inactif)
 */
export type TraitPresence = 'none-active' | 'some-active' | 'some-inactive' | 'some-any' | null;

export interface FilterCriteria {
  /** Sous-chaîne, normalisée (casse + accents) ; vide ⇒ ignoré. */
  nameQuery: string;
  /** OU intra ; vide ⇒ ignoré. */
  generations: Set<number>;
  /** OU intra ; vide ⇒ ignoré. */
  especeIds: Set<string>;
  /** OU intra ; vide ⇒ ignoré. */
  traitIds: Set<string>;
  /** Portée du filtre trait (défaut `actifs`). */
  traitScope: TraitScope;
  /** Présence de trait dans l'ADN (mono-sélection) ; `null` ⇒ ignoré. */
  traitPresence: TraitPresence;
  /** Présence/absence de pouvoir ; `null` ⇒ ignoré. */
  powerPresence: PowerPresence;
  /** OU intra ; vide ⇒ ignoré. */
  statuses: Set<Statut>;
  /**
   * Filtres par **année de naissance** (Feature 015, bornes **inclusives**) ; `null` ⇒ inactif.
   * Dès qu'au moins l'un des deux est non-null, le filtre `generations` est **ignoré** (exclusivité).
   */
  bornNafter: number | null; // « né après X » : année de naissance ≥ X
  bornBefore: number | null; // « né avant Y » : année de naissance ≤ Y
}

export interface FilterContext {
  currentYear: number;
  genesisYear: number; // origine du calcul de génération (§6.2, Feature 011)
}

/** Clé de tri d'une liste d'individus (Feature 010 ; + puissance/maîtrise en Feature 015). */
export type SortKey = 'nom' | 'naissance' | 'age' | 'puissance' | 'maitrise';
/** Sens de tri. */
export type SortDir = 'asc' | 'desc';

/** Plage Unicode des diacritiques combinants (à retirer après normalisation NFD). */
const DIACRITICS = /[̀-ͯ]/g;

/** Minuscule + diacritiques retirés (comparaison de noms insensible casse/accents). */
function normalize(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
}

/** Vrai si au moins un trait recherché est présent selon la portée (OU intra-dimension). */
function matchTrait(p: Personne, traitIds: Set<string>, scope: TraitScope): boolean {
  for (const t of p.adn.traits) {
    if (!traitIds.has(t.traitId)) continue;
    if (scope === 'actifs' && !t.active) continue;
    if (scope === 'inactifs' && t.active) continue;
    return true; // 'tous' (ou état correspondant à la portée)
  }
  return false;
}

/** Vrai si le statut de l'individu figure dans l'ensemble demandé (OU intra-dimension). */
function matchStatus(p: Personne, statuses: Set<Statut>): boolean {
  return (statuses.has('vivant') && p.vivant) || (statuses.has('décédé') && !p.vivant);
}

/** Vrai si l'ADN de l'individu satisfait le critère de présence de trait (Feature 010). */
function matchTraitPresence(p: Personne, presence: Exclude<TraitPresence, null>): boolean {
  const traits = p.adn.traits;
  switch (presence) {
    case 'none-active':
      return !traits.some((t) => t.active); // aucun trait actif (inclut ADN vide)
    case 'some-active':
      return traits.some((t) => t.active);
    case 'some-inactive':
      return traits.some((t) => !t.active);
    case 'some-any':
      return traits.length > 0;
  }
}

/** Comparateur déterministe : date de naissance puis id. */
function byBirthThenId(a: Personne, b: Personne): number {
  const ya = yearOf(a.dateNaissance);
  const yb = yearOf(b.dateNaissance);
  if (ya !== yb) return ya - yb;
  const md = a.dateNaissance
    .replace(/^-?\d+-/, '')
    .localeCompare(b.dateNaissance.replace(/^-?\d+-/, ''));
  if (md !== 0) return md;
  return a.id.localeCompare(b.id);
}

/**
 * Filtre la population selon `criteria`. Dimensions vides (`Set` vide, `nameQuery` vide,
 * `powerPresence === null`) sans effet ; ET entre dimensions renseignées (INV-G4). Renvoie un
 * **nouveau** tableau (mêmes références d'individus) trié par date puis id. `pop` non modifié.
 */
export function filterPopulation(
  pop: Personne[],
  criteria: FilterCriteria,
  ctx: FilterContext,
): Personne[] {
  const q = normalize(criteria.nameQuery.trim());
  // Feature 015 : exclusivité génération ↔ filtres d'année. Si une borne d'année est active,
  // le filtre par génération est **ignoré** (INV-F2).
  const yearBoundsActive = criteria.bornNafter !== null || criteria.bornBefore !== null;
  const result = pop.filter((p) => {
    if (q && !normalize(p.nom).includes(q)) return false;
    const birthYear = yearOf(p.dateNaissance);
    if (yearBoundsActive) {
      if (criteria.bornNafter !== null && birthYear < criteria.bornNafter) return false; // né après X (≥)
      if (criteria.bornBefore !== null && birthYear > criteria.bornBefore) return false; // né avant Y (≤)
    } else if (
      criteria.generations.size > 0 &&
      !criteria.generations.has(computeGeneration(birthYear, ctx.genesisYear))
    ) {
      return false;
    }
    if (criteria.especeIds.size > 0 && !criteria.especeIds.has(p.especeId)) return false;
    if (criteria.traitIds.size > 0 && !matchTrait(p, criteria.traitIds, criteria.traitScope))
      return false;
    if (criteria.traitPresence && !matchTraitPresence(p, criteria.traitPresence)) return false;
    if (criteria.powerPresence === 'any' && p.pouvoirs.length === 0) return false;
    if (criteria.powerPresence === 'none' && p.pouvoirs.length > 0) return false;
    if (criteria.statuses.size > 0 && !matchStatus(p, criteria.statuses)) return false;
    return true;
  });
  return result.sort(byBirthThenId);
}

/**
 * Trie une population **déjà filtrée** selon une clé et un sens (Feature 010). PUR : renvoie un **nouveau**
 * tableau, ne mute pas `pop`. `key === null` ⇒ ordre reçu **préservé** (= tri « par défaut »). Le départage
 * final est toujours `byBirthThenId` (déterministe et stable — FR-009). `age` dérive de `ctx.currentYear`.
 */
export function sortPopulation(
  pop: readonly Personne[],
  key: SortKey | null,
  dir: SortDir,
  _ctx: FilterContext,
): Personne[] {
  const arr = [...pop];
  if (key === null) return arr; // ordre d'entrée conservé (défaut)
  const sign = dir === 'desc' ? -1 : 1;

  // Feature 015 — tris puissance/maîtrise : on classe selon le pouvoir **le plus extrême dans le
  // sens du tri** (valeur la plus basse en croissant, la plus haute en décroissant). Les individus
  // **sans pouvoir** sont **toujours en fin** de liste, quel que soit le sens (INV-S2/S3).
  if (key === 'puissance' || key === 'maitrise') {
    const withPow = arr.filter((p) => p.pouvoirs.length > 0);
    const without = arr.filter((p) => p.pouvoirs.length === 0);
    const keyVal = (p: Personne): number => {
      const vals = p.pouvoirs.map((pw) => (key === 'puissance' ? pw.puissance : pw.maitrise));
      return dir === 'asc' ? Math.min(...vals) : Math.max(...vals);
    };
    withPow.sort((a, b) => {
      const primary = keyVal(a) - keyVal(b);
      if (primary !== 0) return sign * primary;
      return byBirthThenId(a, b); // départage stable, non inversé
    });
    without.sort(byBirthThenId);
    return [...withPow, ...without];
  }

  arr.sort((a, b) => {
    let primary = 0;
    if (key === 'nom') primary = normalize(a.nom).localeCompare(normalize(b.nom));
    else if (key === 'naissance') primary = byBirthThenId(a, b);
    else primary = a.age - b.age; // 'age' : âge suivi (Feature 015)
    if (primary !== 0) return sign * primary;
    return byBirthThenId(a, b); // départage stable, non inversé
  });
  return arr;
}

/**
 * Plus grande génération présente dans `pop` (= max `computeGeneration`), ou `null` si vide.
 * Sert de défaut dynamique au filtre génération côté UI (FR-011a). `genesisYear` = origine (§6.2).
 */
export function lastGeneration(pop: Personne[], genesisYear: number): number | null {
  let max: number | null = null;
  for (const p of pop) {
    const g = computeGeneration(yearOf(p.dateNaissance), genesisYear);
    if (max === null || g > max) max = g;
  }
  return max;
}
