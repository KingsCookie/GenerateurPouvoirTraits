import { describe, it, expect } from 'vitest';
import {
  addEspece,
  renameEspece,
  removeEspece,
  setEspeceParam,
  addGenre,
  renameGenre,
  removeGenre,
  validateEspece,
} from '../../src/core/species/editEspeces.js';
import { defaultEspeces } from '../../src/core/catalog/defaultCatalog.js';
import { GENRE_TOUT } from '../../src/core/model/espece.js';

describe('editEspeces — espèces', () => {
  it('addEspece inclut toujours le genre « tout » et des paramètres de reproduction par défaut', () => {
    const list = addEspece([], 'Dragon');
    expect(list).toHaveLength(1);
    const e = list[0];
    expect(e.label).toBe('Dragon');
    expect(e.genres.some((g) => g.id === GENRE_TOUT)).toBe(true);
    expect(validateEspece(e).ok).toBe(true);
  });

  it('addEspece génère des ids uniques pour des libellés identiques', () => {
    let list = addEspece([], 'Chat');
    list = addEspece(list, 'Chat');
    const ids = list.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renameEspece change le libellé, pas l’id', () => {
    let list = addEspece([], 'Chat');
    const id = list[0].id;
    list = renameEspece(list, id, 'Félin');
    expect(list[0]).toMatchObject({ id, label: 'Félin' });
  });

  it('removeEspece retire l’espèce (futur seulement)', () => {
    let list = addEspece([], 'Chat');
    list = removeEspece(list, list[0].id);
    expect(list).toHaveLength(0);
  });
});

describe('editEspeces — genres', () => {
  it('addGenre ajoute un genre distinct de « tout »', () => {
    let list = addEspece([], 'Chat');
    const id = list[0].id;
    list = addGenre(list, id, 'Femelle');
    expect(list[0].genres.some((g) => g.label === 'Femelle')).toBe(true);
  });

  it('removeGenre refuse de supprimer « tout » (no-op)', () => {
    let list = addEspece([], 'Chat');
    const id = list[0].id;
    const before = list[0].genres.length;
    list = removeGenre(list, id, GENRE_TOUT);
    expect(list[0].genres).toHaveLength(before);
    expect(list[0].genres.some((g) => g.id === GENRE_TOUT)).toBe(true);
  });

  it('removeGenre retire un genre concret', () => {
    let list = addEspece([], 'Chat');
    const id = list[0].id;
    list = addGenre(list, id, 'Mâle');
    const genreId = list[0].genres.find((g) => g.label === 'Mâle')!.id;
    list = removeGenre(list, id, genreId);
    expect(list[0].genres.some((g) => g.id === genreId)).toBe(false);
  });

  it('renameGenre change le libellé sans changer l’id', () => {
    let list = addEspece([], 'Chat');
    const id = list[0].id;
    list = addGenre(list, id, 'Mâle');
    const genreId = list[0].genres.find((g) => g.label === 'Mâle')!.id;
    list = renameGenre(list, id, genreId, 'Masculin');
    expect(list[0].genres.find((g) => g.id === genreId)!.label).toBe('Masculin');
  });
});

describe('editEspeces — setEspeceParam + validateEspece (INV-E3)', () => {
  it('setEspeceParam met à jour un champ (immutable)', () => {
    const base = defaultEspeces();
    const next = setEspeceParam(base, base[0].id, 'reproPeakPct', 55);
    expect(next[0].reproPeakPct).toBe(55);
    expect(base[0].reproPeakPct).toBe(40); // entrée non mutée
  });

  it('validateEspece : début ≤ pic ≤ fin', () => {
    const e = { ...defaultEspeces()[0], reproStartAge: 30, reproPeakAge: 25 };
    expect(validateEspece(e).ok).toBe(false);
  });

  it('validateEspece : pente > 0', () => {
    const e = { ...defaultEspeces()[0], reproSlope: 0 };
    expect(validateEspece(e).ok).toBe(false);
  });

  it('validateEspece : M ≤ N', () => {
    const e = { ...defaultEspeces()[0], litterMin: 5, litterMax: 2 };
    expect(validateEspece(e).ok).toBe(false);
  });

  it('validateEspece : groupSize ≥ 1', () => {
    const e = { ...defaultEspeces()[0], groupSize: 0 };
    expect(validateEspece(e).ok).toBe(false);
  });

  it('validateEspece : pourcentages ∈ [0,100]', () => {
    expect(validateEspece({ ...defaultEspeces()[0], reproPeakPct: 150 }).ok).toBe(false);
    expect(validateEspece({ ...defaultEspeces()[0], divorcePct: -1 }).ok).toBe(false);
    expect(validateEspece({ ...defaultEspeces()[0], litterExtraPct: 20 }).ok).toBe(true);
  });

  it('validateEspece : espérance de vie entière ≥ 0 (Feature 015)', () => {
    expect(validateEspece({ ...defaultEspeces()[0], esperanceVie: -1 }).ok).toBe(false);
    expect(validateEspece({ ...defaultEspeces()[0], esperanceVie: 60.5 }).ok).toBe(false);
    expect(validateEspece({ ...defaultEspeces()[0], esperanceVie: 0 }).ok).toBe(true);
  });

  it('validateEspece : % de mort naturelle ∈ [0,100] (Feature 015)', () => {
    expect(validateEspece({ ...defaultEspeces()[0], mortNaturellePct: 150 }).ok).toBe(false);
    expect(validateEspece({ ...defaultEspeces()[0], mortNaturellePct: -1 }).ok).toBe(false);
    expect(validateEspece({ ...defaultEspeces()[0], mortNaturellePct: 10 }).ok).toBe(true);
  });
});
