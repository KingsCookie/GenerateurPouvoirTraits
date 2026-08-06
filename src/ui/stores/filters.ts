// État des filtres de la liste (Feature 4) — store module-level ⇒ **persiste sur la session**
// (FR-011b) ; NON exporté dans l'état applicatif (Principe VI). Le défaut « dernière génération »
// (FR-011a) est appliqué côté ListeView tant que `generationTouched === false` (INV-G5).
import { writable } from 'svelte/store';
import type {
  FilterCriteria,
  PowerPresence,
  TraitScope,
  TraitPresence,
  Statut,
} from '../../core/index.js';

type SetDimension = 'generations' | 'especeIds' | 'traitIds' | 'statuses';

function emptyCriteria(): FilterCriteria {
  return {
    nameQuery: '',
    generations: new Set<number>(),
    especeIds: new Set<string>(),
    traitIds: new Set<string>(),
    traitScope: 'actifs',
    traitPresence: null,
    powerPresence: null,
    statuses: new Set<Statut>(),
    bornNafter: null, // Feature 015 : filtres d'année inactifs par défaut
    bornBefore: null,
  };
}

export const criteria = writable<FilterCriteria>(emptyCriteria());

/** `false` tant que l'utilisateur n'a pas touché au filtre génération ⇒ défaut dynamique. */
export const generationTouched = writable<boolean>(false);

/** Met à jour le texte de recherche par nom. */
export function setNameQuery(q: string): void {
  criteria.update((c) => ({ ...c, nameQuery: q }));
}

/** Bascule une valeur dans une dimension multi-valeurs (OU intra). */
export function toggleInSet(dim: SetDimension, value: number | string): void {
  criteria.update((c) => {
    const next = new Set(c[dim] as Set<number | string>);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return { ...c, [dim]: next };
  });
  // Toute modification manuelle du filtre génération fige le défaut dynamique (FR-011b).
  if (dim === 'generations') generationTouched.set(true);
}

/** Définit la portée du filtre trait (actifs / inactifs / tous). */
export function setTraitScope(scope: TraitScope): void {
  criteria.update((c) => ({ ...c, traitScope: scope }));
}

/** Définit le filtre de présence de pouvoir (any / none / null = ignoré). */
export function setPowerPresence(p: PowerPresence): void {
  criteria.update((c) => ({ ...c, powerPresence: p }));
}

/** Définit le filtre de présence de trait (mono-sélection ; `null` = ignoré) — Feature 010. */
export function setTraitPresence(p: TraitPresence): void {
  criteria.update((c) => ({ ...c, traitPresence: p }));
}

/**
 * Définit la borne « né après X » (Feature 015). `null` ⇒ inactif. Dès qu'une borne d'année est
 * posée, le filtre génération devient inopérant (exclusivité gérée par `filterPopulation`, INV-F2).
 */
export function setBornAfter(year: number | null): void {
  criteria.update((c) => ({ ...c, bornNafter: year }));
}

/** Définit la borne « né avant Y » (Feature 015). `null` ⇒ inactif. */
export function setBornBefore(year: number | null): void {
  criteria.update((c) => ({ ...c, bornBefore: year }));
}

/** Réinitialise tous les filtres et rétablit le défaut « dernière génération » (FR-010). */
export function resetFilters(): void {
  criteria.set(emptyCriteria());
  generationTouched.set(false);
}
