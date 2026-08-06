import { describe, it, expect } from 'vitest';
import { buildSublists, derivePowersFromTraits } from '../../src/core/powers/traitsToPowers.js';
import { defaultParameters, type Parameters } from '../../src/core/params/parameters.js';
import type { Catalog } from '../../src/core/model/trait.js';
import type { ADN } from '../../src/core/model/adn.js';
import { fakeRng } from './_fakeRng.js';

const P: Parameters = { ...defaultParameters() };

// Sous-liste → liste d'ids (pour comparer aux exemples de la spec).
const ids = (sublists: { traitId: string }[][]) => sublists.map((sl) => sl.map((t) => t.traitId));

function ref(traitId: string, type: string, resilience = 50) {
  return { traitId, type: type as never, label: traitId, resilience };
}

describe('§6.4.1 — Constitution des sous-listes', () => {
  it('Exemple 1 (sans duplication) reproduit à l’identique (INV-7)', () => {
    const active = [
      ref('a1', 'Action'),
      ref('a2', 'Action'),
      ref('e1', 'Etat'),
      ref('r1', 'Remplacement'),
      ref('r2', 'Remplacement'),
      ref('r3', 'Remplacement'),
    ];
    // shuffle = identité ; aucune duplication (4 tirages faux, un par placement).
    const sub = buildSublists(active, P, fakeRng({ chances: [false, false, false, false] }));
    expect(ids(sub)).toEqual([
      ['a1', 'e1', 'r2'],
      ['a2', 'r1', 'r3'],
    ]);
  });

  it('Exemple 2 (avec duplication) reproduit à l’identique (INV-7 / INV-5)', () => {
    const active = [
      ref('a1', 'Action'),
      ref('a2', 'Action'),
      ref('a3', 'Action'),
      ref('e1', 'Etat'),
      ref('e2', 'Etat'),
      ref('e3', 'Etat'),
      ref('e4', 'Etat'),
      ref('r1', 'Remplacement'),
      ref('r2', 'Remplacement'),
      ref('r3', 'Remplacement'),
    ];
    // Duplications scriptées : e2 (×1) puis r1 (×2). Cf. trace §6.4.1 exemple 2.
    const sub = buildSublists(
      active,
      P,
      fakeRng({ chances: [false, true, false, false, false, true, true, false, false] }),
    );
    expect(ids(sub)).toEqual([
      ['a1', 'e1', 'e3', 'r1', 'r3'],
      ['a2', 'e2', 'e4', 'r1'],
      ['a3', 'e2', 'r1', 'r2'],
    ]);
    // INV-5 : un trait n'apparaît jamais deux fois dans la même sous-liste.
    for (const sl of sub) expect(new Set(sl.map((t) => t.traitId)).size).toBe(sl.length);
  });

  it('ni Action ni Partie du corps ⇒ une seule sous-liste', () => {
    const active = [ref('e1', 'Etat'), ref('r1', 'Remplacement')];
    const sub = buildSublists(active, P, fakeRng());
    expect(ids(sub)).toEqual([['e1', 'r1']]);
  });
});

function miniCatalog(): Catalog {
  return {
    byType: {
      Action: [{ id: 'a1', type: 'Action', label: 'courir', weight: 1 }],
      Element: [{ id: 'e1', type: 'Element', label: 'feu', weight: 1 }],
      PartieCorps: [{ id: 'p1', type: 'PartieCorps', label: 'Bras', weight: 1 }],
      Ajout: [{ id: 'aj1', type: 'Ajout', label: 'griffes', weight: 1 }],
      Remplacement: [{ id: 'r1', type: 'Remplacement', label: 'lame', weight: 1 }],
      Etat: [{ id: 'et1', type: 'Etat', label: 'gelé', weight: 1 }],
    },
  };
}

describe('§6.4.2 — derivePowersFromTraits', () => {
  it('aucun trait actif ⇒ aucun pouvoir', () => {
    const adn: ADN = { traits: [{ traitId: 'a1', active: false, resilience: 50 }] };
    const res = derivePowersFromTraits(adn, miniCatalog(), P, fakeRng());
    expect(res.pouvoirs).toEqual([]);
  });

  it('génération K réussie : trait inscrit actif dans l’ADN (INV-6)', () => {
    // 1 action active ⇒ feuille « {a} {Ke} » ⇒ une génération K (Élément).
    const adn: ADN = { traits: [{ traitId: 'a1', active: true, resilience: 50 }] };
    const res = derivePowersFromTraits(adn, miniCatalog(), P, fakeRng({ chances: [true] }));
    expect(res.pouvoirs).toHaveLength(1);
    expect(res.pouvoirs[0].label).toBe('courir feu');
    expect(res.pouvoirs[0].template).toBe('DERIVE');
    expect(res.pouvoirs[0].traitIds).toEqual(['a1', 'e1']);
    // L'Élément généré est inscrit actif dans l'ADN renvoyé.
    expect(res.adn.traits.find((t) => t.traitId === 'e1')).toEqual({
      traitId: 'e1',
      active: true,
      resilience: P.initialResilience,
    });
  });

  it('échec d’un K requis ⇒ aucun pouvoir pour la sous-liste', () => {
    const adn: ADN = { traits: [{ traitId: 'a1', active: true, resilience: 50 }] };
    const res = derivePowersFromTraits(adn, miniCatalog(), P, fakeRng({ chances: [false] }));
    expect(res.pouvoirs).toEqual([]);
  });

  it('ne mute pas l’ADN d’entrée', () => {
    const adn: ADN = { traits: [{ traitId: 'a1', active: true, resilience: 50 }] };
    const snapshot = structuredClone(adn);
    derivePowersFromTraits(adn, miniCatalog(), P, fakeRng({ chances: [true] }));
    expect(adn).toEqual(snapshot);
  });
});

// Catalogue riche pour les feuilles à deux pouvoirs (v0.15.0).
function catStar(): Catalog {
  return {
    byType: {
      Action: [{ id: 'a1', type: 'Action', label: 'courir', weight: 1 }],
      Element: [{ id: 'e1', type: 'Element', label: 'feu', weight: 1 }],
      PartieCorps: [{ id: 'p1', type: 'PartieCorps', label: 'bras', weight: 1 }],
      Ajout: [{ id: 'aj1', type: 'Ajout', label: 'griffes', weight: 1 }],
      Remplacement: [{ id: 'r1', type: 'Remplacement', label: 'lame', weight: 1 }],
      Etat: [{ id: 'et1', type: 'Etat', label: 'gelé', weight: 1 }],
    },
  } as Catalog;
}

const active = (...ids: string[]): ADN => ({
  traits: ids.map((traitId) => ({ traitId, active: true, resilience: 50 })),
});

describe('§6.4.2 — feuille à deux pouvoirs (US1, v0.15.0)', () => {
  // Feuille a/e/et ⇒ ['{a} {e} {et}', 'rends {e} {et}'] — aucun jeton K.
  it('T-2POWERS : produit exactement deux pouvoirs (ordre X→Y), libellés attendus', () => {
    const res = derivePowersFromTraits(active('a1', 'e1', 'et1'), catStar(), P, fakeRng());
    expect(res.pouvoirs).toHaveLength(2);
    expect(res.pouvoirs.map((p) => p.label)).toEqual(['courir feu gelé', 'rends feu gelé']);
  });

  it('T-ID : les deux pouvoirs ont des id distincts (#0 / #1)', () => {
    const res = derivePowersFromTraits(active('a1', 'e1', 'et1'), catStar(), P, fakeRng());
    const [p0, p1] = res.pouvoirs;
    expect(p0.id).not.toBe(p1.id);
    expect(p0.id.endsWith('#0')).toBe(true);
    expect(p1.id.endsWith('#1')).toBe(true);
    expect(p0.id).toBe('pw:DERIVE:a1+e1+et1#0');
  });

  it('T-DET : même seed ⇒ résultat identique (déterminisme)', () => {
    const a = derivePowersFromTraits(active('a1', 'e1', 'et1'), catStar(), P, fakeRng());
    const b = derivePowersFromTraits(active('a1', 'e1', 'et1'), catStar(), P, fakeRng());
    expect(a).toEqual(b);
  });
});

describe('§6.4.2 — jeton Kx partagé entre deux pouvoirs (US2, v0.15.0)', () => {
  // Feuille e/aj/et ⇒ ['{Ka} {e} avec {aj} {et} sur {Kp}', '{aj} {et} sur {Kp}'].
  // Une seule sous-liste (ni Action ni Partie du corps) ⇒ 0 tirage de duplication.
  // Jetons distincts, dans l'ordre : {Ka} (gabarit 1) puis {Kp} (partagé).
  it('T-KSHARED : un seul trait « partie du corps » généré, réutilisé dans les deux pouvoirs', () => {
    const res = derivePowersFromTraits(
      active('e1', 'aj1', 'et1'),
      catStar(),
      P,
      fakeRng({ chances: [true, true] }), // {Ka} ok, {Kp} ok
    );
    expect(res.pouvoirs).toHaveLength(2);
    expect(res.pouvoirs[0].label).toBe('courir feu avec griffes gelé sur bras');
    expect(res.pouvoirs[1].label).toBe('griffes gelé sur bras');
    // Le {Kp} partagé = « bras » (p1) dans les deux ; inscrit UNE seule fois dans l'ADN.
    expect(res.pouvoirs.every((p) => p.label.includes('bras'))).toBe(true);
    expect(res.adn.traits.filter((t) => t.traitId === 'p1')).toHaveLength(1);
    expect(res.adn.traits.find((t) => t.traitId === 'p1')?.active).toBe(true);
  });

  it('T-TRAITIDS : traitIds par pouvoir (le 2ᵉ ne contient pas l’action générée du 1ᵉʳ)', () => {
    const res = derivePowersFromTraits(
      active('e1', 'aj1', 'et1'),
      catStar(),
      P,
      fakeRng({ chances: [true, true] }),
    );
    expect(res.pouvoirs[0].traitIds).toEqual(['e1', 'aj1', 'et1', 'a1', 'p1']);
    expect(res.pouvoirs[1].traitIds).toEqual(['e1', 'aj1', 'et1', 'p1']);
  });

  it('T-KFAIL-SHARED : échec du {Kp} partagé ⇒ aucun des deux pouvoirs', () => {
    const res = derivePowersFromTraits(
      active('e1', 'aj1', 'et1'),
      catStar(),
      P,
      fakeRng({ chances: [true, false] }), // {Ka} ok, {Kp} échoue
    );
    expect(res.pouvoirs).toEqual([]);
  });

  it('T-KFAIL-PARTIAL : échec d’un jeton présent dans un seul gabarit ⇒ l’autre pouvoir subsiste', () => {
    const res = derivePowersFromTraits(
      active('e1', 'aj1', 'et1'),
      catStar(),
      P,
      fakeRng({ chances: [false, true] }), // {Ka} échoue (gabarit 1 seul), {Kp} ok
    );
    expect(res.pouvoirs).toHaveLength(1);
    expect(res.pouvoirs[0].label).toBe('griffes gelé sur bras');
    // L'action {Ka} ayant échoué, elle n'est PAS inscrite dans l'ADN.
    expect(res.adn.traits.find((t) => t.traitId === 'a1')).toBeUndefined();
  });

  it('T-KORDER : un seul tirage par jeton distinct (2 tirages pour {Ka} puis {Kp})', () => {
    // 3 valeurs fournies : si plus de 2 chances étaient consommées, la file « chances » serait épuisée
    // (erreur) ; le test vérifie donc qu'exactement 2 tirages ont lieu (un par jeton distinct).
    const res = derivePowersFromTraits(
      active('e1', 'aj1', 'et1'),
      catStar(),
      P,
      fakeRng({ chances: [true, true, true] }),
    );
    expect(res.pouvoirs).toHaveLength(2);
  });
});
