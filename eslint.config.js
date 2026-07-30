import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'node_modules/',
      'dev-dist/',
      '*.config.js',
      '*.config.ts',
      // Dossier de handoff design (prototypes HTML + runtime d'outil) : hors périmètre lint.
      'design_handoff_refonte_mobile_1a/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    // Convention : un argument/variable préfixé par « _ » est volontairement inutilisé
    // (ex. paramètre imposé par un contrat d'API mais non requis par l'implémentation).
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Couche UI (Svelte + stores) : environnement navigateur.
    files: ['**/*.svelte', 'src/ui/**/*.ts'],
    languageOptions: {
      // __APP_VERSION__ : constante injectée au build par Vite (define) — pied de page (FR-009).
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    // Cœur pur (Principe IV) : interdire l'aléatoire/horloge non seedés.
    // Exception : createSeed (seul point d'entropie, isolé) — voir tests/unit/core-purity.test.ts.
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/rng/createSeed.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'Date interdit dans le cœur (Principe I).' },
        { name: 'window', message: 'API navigateur interdite dans le cœur (Principe IV).' },
        { name: 'crypto', message: 'crypto interdit hors de createSeed (Principe I).' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Math.random interdit (Principe I).' },
      ],
    },
  },
);
