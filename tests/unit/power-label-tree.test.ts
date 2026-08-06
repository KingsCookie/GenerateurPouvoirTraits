import { describe, it, expect } from 'vitest';
import { powerLabelFromSublist } from '../../src/core/powers/powerLabelTree.js';

// Vérifie que l'arbre §6.4.2 (verbatim) produit exactement les feuilles attendues selon la
// présence des types. Les jetons {Ka}/{Ke}/{Kp}/{Kaj} (types absents) restent **littéraux**
// (la génération K est résolue par derivePowersFromTraits, pas par cette fonction pure).
// Depuis v0.15.0 : `powerLabelFromSublist` renvoie un **tableau** de 0, 1 ou 2 gabarits.
describe('Arbre de libellé §6.4.2 — feuilles non modifiées (non-régression, INV-C3)', () => {
  it('a & e seuls ⇒ [« {a} {e} »]', () => {
    expect(powerLabelFromSublist({ a: 'A', e: 'E' })).toEqual(['A E']);
  });

  it('a seul ⇒ [« {a} {Ke} »] (jeton K littéral)', () => {
    expect(powerLabelFromSublist({ a: 'A' })).toEqual(['A {Ke}']);
  });

  it('p seul ⇒ [« {Kaj} sur {p} »]', () => {
    expect(powerLabelFromSublist({ p: 'P' })).toEqual(['{Kaj} sur P']);
  });

  it('et seul ⇒ [« {Kp} {et} »]', () => {
    expect(powerLabelFromSublist({ et: 'ET' })).toEqual(['{Kp} ET']);
  });

  it('aj & et (sans a, p, e, r) ⇒ [« {aj} {et} sur {Kp} »]', () => {
    expect(powerLabelFromSublist({ aj: 'AJ', et: 'ET' })).toEqual(['AJ ET sur {Kp}']);
  });

  it('aj seul ⇒ [« {aj} sur {Kp} »]', () => {
    expect(powerLabelFromSublist({ aj: 'AJ' })).toEqual(['AJ sur {Kp}']);
  });

  it('p & e (sans a, aj, r, et) ⇒ [« {p} en {e} »]', () => {
    expect(powerLabelFromSublist({ p: 'P', e: 'E' })).toEqual(['P en E']);
  });

  it('a, e & p (sans r, aj, et) ⇒ [« {a} {e} avec {p} »] (feuille NON dédoublée)', () => {
    expect(powerLabelFromSublist({ a: 'A', e: 'E', p: 'P' })).toEqual(['A E avec P']);
  });

  it('aucun type ⇒ [] (feuille terminale, INV-C1)', () => {
    expect(powerLabelFromSublist({})).toEqual([]);
  });
});

describe('Arbre de libellé §6.4.2 — feuilles révisées à deux pouvoirs (v0.15.0, INV-C2)', () => {
  it('a/e/p/r/aj/et ⇒ 2 pouvoirs (1ᵉʳ reformulé « {aj} {et} », sans virgule)', () => {
    expect(powerLabelFromSublist({ a: 'A', e: 'E', p: 'P', aj: 'AJ', r: 'R', et: 'ET' })).toEqual([
      'A E avec AJ ET sur R à la place de P',
      'AJ ET sur R à la place de P',
    ]);
  });

  it('a/e/p/r/aj ⇒ 2 pouvoirs', () => {
    expect(powerLabelFromSublist({ a: 'A', e: 'E', p: 'P', aj: 'AJ', r: 'R' })).toEqual([
      'A E avec AJ sur R à la place de P',
      'AJ sur R à la place de P',
    ]);
  });

  it('a/e/et ⇒ [« {a} {e} {et} », « rends {e} {et} »]', () => {
    expect(powerLabelFromSublist({ a: 'A', e: 'E', et: 'ET' })).toEqual(['A E ET', 'rends E ET']);
  });

  it('a/aj/et (sans r, p) ⇒ [« {a} {aj} {et} », « rends {aj} {et} »]', () => {
    expect(powerLabelFromSublist({ a: 'A', aj: 'AJ', et: 'ET' })).toEqual([
      'A AJ ET',
      'rends AJ ET',
    ]);
  });

  it('a/et (sans e, aj, r, p) ⇒ [« {a} {Ke} {et} », « rends {Ke} {et} »] (jeton {et}, pas « et »)', () => {
    expect(powerLabelFromSublist({ a: 'A', et: 'ET' })).toEqual(['A {Ke} ET', 'rends {Ke} ET']);
  });

  it('e/aj/et (sans a, p, r) ⇒ [« {Ka} {e} avec {aj} {et} sur {Kp} », « {aj} {et} sur {Kp} »] ({Kp} partagé)', () => {
    expect(powerLabelFromSublist({ e: 'E', aj: 'AJ', et: 'ET' })).toEqual([
      '{Ka} E avec AJ ET sur {Kp}',
      'AJ ET sur {Kp}',
    ]);
  });

  it('e/r (sans a, p, aj, et) ⇒ 2 pouvoirs avec {Kp} partagé', () => {
    expect(powerLabelFromSublist({ e: 'E', r: 'R' })).toEqual([
      '{Ka} E avec R à la place de {Kp}',
      'R à la place de {Kp}',
    ]);
  });
});

describe('Arbre de libellé §6.4.2 — feuille reformulée mono-pouvoir (v0.15.0)', () => {
  it('aj/et/r (sans a, p, e) ⇒ [« {aj} {et} sur {r} à la place de {Kp} »] (un seul pouvoir, sans {Ka})', () => {
    expect(powerLabelFromSublist({ aj: 'AJ', et: 'ET', r: 'R' })).toEqual([
      'AJ ET sur R à la place de {Kp}',
    ]);
  });
});
