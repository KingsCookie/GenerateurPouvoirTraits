import type { Espece, Genre } from '../model/espece.js';
import { GENRE_TOUT } from '../model/espece.js';
import { slug } from '../catalog/defaultCatalog.js';

// Mutations **pures** du catalogue d'espèces (Feature 5, US1/US2). Chaque fonction renvoie une
// **nouvelle** liste. Le genre spécial « tout » est toujours présent, non supprimable, jamais
// dupliqué (INV-E1). La suppression d'espèce est **futur seulement** (n'invalide pas les
// individus existants — INV-E2).

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Paramètres de reproduction par défaut d'une nouvelle espèce (défauts « humain », §9.4). */
function defaultReproParams(): Omit<Espece, 'id' | 'label' | 'genres'> {
  return {
    reproStartAge: 18,
    reproPeakAge: 25,
    reproEndAge: 50,
    reproPeakPct: 40,
    reproSlope: 8,
    groupSize: 2,
    litterMin: 1,
    litterMax: 4,
    litterExtraPct: 15,
    divorcePct: 0,
    // Mort naturelle (Feature 015) : défauts alignés sur l'humain.
    esperanceVie: 60,
    mortNaturellePct: 10,
  };
}

/** Génère un id unique (kebab) dans une collection d'ids déjà pris. */
function uniqueId(label: string, taken: Set<string>, fallback: string): string {
  const base = slug(label) || fallback;
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Ajoute une espèce (params de reproduction par défaut + genre « tout »). */
export function addEspece(list: Espece[], label: string): Espece[] {
  const taken = new Set(list.map((e) => e.id));
  const id = uniqueId(label, taken, 'espece');
  const espece: Espece = {
    id,
    label: label.trim(),
    genres: [{ id: GENRE_TOUT, label: 'Tout' }],
    ...defaultReproParams(),
  };
  return [...list, espece];
}

/** Renomme une espèce (id inchangé). No-op sûr si l'id est absent. */
export function renameEspece(list: Espece[], especeId: string, label: string): Espece[] {
  return list.map((e) => (e.id === especeId ? { ...e, label: label.trim() } : e));
}

/** Retire une espèce (**futur seulement** : n'invalide pas les individus existants — INV-E2). */
export function removeEspece(list: Espece[], especeId: string): Espece[] {
  return list.filter((e) => e.id !== especeId);
}

/** Met à jour un paramètre nommé d'une espèce (immutables). La validation est faite par l'UI. */
export function setEspeceParam<K extends keyof Espece>(
  list: Espece[],
  especeId: string,
  key: K,
  value: Espece[K],
): Espece[] {
  return list.map((e) => (e.id === especeId ? { ...e, [key]: value } : e));
}

/** Ajoute un genre à une espèce (id unique ; jamais un second « tout »). */
export function addGenre(list: Espece[], especeId: string, label: string): Espece[] {
  return list.map((e) => {
    if (e.id !== especeId) return e;
    const taken = new Set(e.genres.map((g) => g.id));
    const id = uniqueId(label, taken, 'genre');
    if (id === GENRE_TOUT) return e; // ne jamais recréer « tout »
    const genre: Genre = { id, label: label.trim() };
    return { ...e, genres: [...e.genres, genre] };
  });
}

/** Renomme un genre (id inchangé). Le libellé de « tout » peut être ajusté mais pas son id. */
export function renameGenre(
  list: Espece[],
  especeId: string,
  genreId: string,
  label: string,
): Espece[] {
  return list.map((e) => {
    if (e.id !== especeId) return e;
    return {
      ...e,
      genres: e.genres.map((g) => (g.id === genreId ? { ...g, label: label.trim() } : g)),
    };
  });
}

/** Retire un genre. **Refuse** de supprimer « tout » (no-op, INV-E1). */
export function removeGenre(list: Espece[], especeId: string, genreId: string): Espece[] {
  if (genreId === GENRE_TOUT) return list; // « tout » non supprimable
  return list.map((e) =>
    e.id === especeId ? { ...e, genres: e.genres.filter((g) => g.id !== genreId) } : e,
  );
}

/**
 * Valide les paramètres de reproduction d'une espèce (INV-E3) : `début ≤ pic ≤ fin`,
 * `M ≤ N`, `pente > 0`, `groupSize ≥ 1`, pourcentages ∈ [0,100]. Messages en français.
 */
export function validateEspece(e: Espece): ValidationResult {
  if (!(e.reproStartAge <= e.reproPeakAge && e.reproPeakAge <= e.reproEndAge)) {
    return { ok: false, error: 'Les âges doivent vérifier : début ≤ pic ≤ fin.' };
  }
  if (e.reproSlope <= 0) {
    return { ok: false, error: 'La pente (écart-type) doit être strictement positive.' };
  }
  if (e.groupSize < 1) {
    return { ok: false, error: 'La taille de groupe doit être ≥ 1.' };
  }
  if (e.litterMin < 0 || e.litterMax < e.litterMin) {
    return { ok: false, error: 'La portée doit vérifier : 0 ≤ minimum (M) ≤ maximum (N).' };
  }
  if (!Number.isInteger(e.esperanceVie) || e.esperanceVie < 0) {
    return { ok: false, error: "L'espérance de vie doit être un entier ≥ 0." };
  }
  const pcts: [number, string][] = [
    [e.reproPeakPct, 'la probabilité au pic'],
    [e.litterExtraPct, "la chance d'enfant supplémentaire"],
    [e.divorcePct, 'le taux de divorce'],
    [e.mortNaturellePct, 'le taux de mort naturelle'],
  ];
  for (const [v, name] of pcts) {
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      return { ok: false, error: `Valeur invalide pour ${name} : attendu entre 0 et 100.` };
    }
  }
  return { ok: true };
}
