import { describe, it, expect } from 'vitest';
import { defaultCatalog, defaultEspece, defaultEspeces } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters } from '../../src/core/params/parameters.js';
// Fichier de config de référence : source de vérité du test (les défauts DOIVENT en dériver).
import config from '../../rsrc/PowerGenerator_config_20260807-153421.json';

describe('017 — les défauts proviennent du fichier de config (source unique)', () => {
  it('INV-C1 : defaultCatalog() est deep-equal au bloc catalog du fichier', () => {
    expect(defaultCatalog()).toEqual(config.catalog);
  });

  it('INV-C2 : defaultEspeces() = bloc especes ; defaultEspece() = premier élément', () => {
    expect(defaultEspeces()).toEqual(config.especes);
    expect(defaultEspece()).toEqual(config.especes[0]);
  });

  it('INV-C3 : defaultParameters() = bloc parameters (seed ignorée ; batchSize = défaut local)', () => {
    // `batchSize` est un défaut **local** volontairement fixé dans defaultConfig.json,
    // indépendant du fichier d'origine ; le reste des paramètres reste verbatim.
    const { seed: _defSeed, batchSize: _defBatch, ...restDefault } = defaultParameters();
    const { seed: _cfgSeed, batchSize: _cfgBatch, ...restConfig } = config.parameters;
    expect(restDefault).toEqual(restConfig);
  });

  it('INV-C4 : la seed est exclue des défauts (forcée à "0", jamais celle du fichier)', () => {
    expect(defaultParameters().seed).toBe('0');
    expect(defaultParameters().seed).not.toBe(config.parameters.seed);
  });

  it('INV-C5 : chaque fabrique retourne un clone frais (pas d’aliasing)', () => {
    const cat = defaultCatalog();
    cat.byType.Action.push({ id: 'Action:mut-test', type: 'Action', label: 'mut', weight: null });
    expect(defaultCatalog().byType.Action).toHaveLength(config.catalog.byType.Action.length);

    const params = defaultParameters();
    params.batchSize = -999;
    params.templateWeights.AE = -999;
    expect(defaultParameters().batchSize).toBe(100); // défaut local, inchangé par la mutation
    expect(defaultParameters().templateWeights.AE).toBe(config.parameters.templateWeights.AE);

    const esp = defaultEspeces();
    esp[0].reproPeakPct = -999;
    expect(defaultEspece().reproPeakPct).toBe(config.especes[0].reproPeakPct);
  });

  it('INV-DM2 : surcharges de poids ciblées présentes dans le catalogue par défaut', () => {
    const cat = defaultCatalog();
    expect(cat.byType.Action.find((t) => t.id === 'Action:controle-1')?.weight).toBe(6);
    expect(cat.byType.Ajout.find((t) => t.id === 'Ajout:bras-6')?.weight).toBe(0.5);
    expect(cat.byType.Remplacement.find((t) => t.id === 'Remplacement:main-3')?.weight).toBe(0.5);
  });

  it('INV-DM3 : paramètres phares (batch 100 défaut local, D 1.5, malus génome activé)', () => {
    const p = defaultParameters();
    expect(p.batchSize).toBe(100);
    expect(p.birthYear).toBe(1880);
    expect(p.duplicationD).toBe(1.5);
    expect(p.disappearThreshold).toBe(20);
    expect(p.genomeMalusEnabled).toBe(true);
    expect(p.statB).toBe(25);
    expect(p.statC).toBe(25);
  });
});
