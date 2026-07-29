<!-- SPECKIT START -->
## Feature active : 012-reorganisation-parametres-ui

- **Plan** : `specs/012-reorganisation-parametres-ui/plan.md` (contexte technique, Constitution Check, structure)
- **Spec** : `specs/012-reorganisation-parametres-ui/spec.md` (3 user stories, clarifications 2026-07-29)
- **Recherche / décisions** : `specs/012-reorganisation-parametres-ui/research.md` (R1→R10 : onglets, modales, store)
- **Modèle de données** : `specs/012-reorganisation-parametres-ui/data-model.md` (état UI `paramsTab` ; aucune entité métier)
- **Contrats** : `specs/012-reorganisation-parametres-ui/contracts/ui-contract.md` (onglets, modales, invariants INV-1→11)
- **Périmètre** : refonte **purement UI** de la page Paramètres, **cible v0.12.0**. Page réorganisée en
  **2 onglets** « Principaux » (thème + graine + `batchSize` + `birthYear` + `powerChancePct`) / « Avancés »
  (résilience initiale, `D`, `K`, tout « Hérédité & naissance », pondérations gabarits, overrides résilience),
  onglet Principaux actif par défaut, sur le patron d'onglets de `SandboxView`. `TraitCatalogEditor` et
  `SpeciesEditor` (+ case **consanguinité** en tête) déplacés en **modales** (patron `SandboxPersonForm` :
  Échap/backdrop/bouton). Bouton **« Générer »** persistant hors panneaux. Store UI `paramsTab` persisté
  `localStorage` (patron thème). **IMPÉRATIF : aucun paramètre supprimé/désactivé** (FR-001/FR-002/SC-002).
- **Actions Constitution** : Principe IX → **aucune** maj doc (l'agencement de la page n'est pas prescrit ;
  §8.4/§9 restent exacts). Principe IV → **zéro modif `src/core`** (tout en `src/ui`). Principe VI → `paramsTab`
  hors export/import ; **pas de bump `FORMAT_VERSION`**. **Aucune dépendance ajoutée** ; déterminisme préservé
  (SC-004) ; validation par checklist manuelle + 1 test unitaire pur du store d'onglet.
- Features livrées : 11 (`specs/011-corrections-bugs-ui/`) lot de 10 corrections (consanguinité lignée directe,
  date partagée de portée, génération 0 relative à la genèse + `genesisYear` + `FORMAT_VERSION` 3→4, étiquettes
  P/M sans « : », filtres à la ligne, export `PowerGenerator_`, aperçu pouvoir temps réel, duplication
  `min(100, résilience·D)` D défaut 0.25, bouton « Régénérer » sandbox, P/M non bornées en saisie) + fix
  libellé « Ajout seul » → « {aj} sur {Kp} » (v0.11.1) ;
  10 (`specs/010-tri-filtres-etiquettes/`) filtres de présence de trait (4 options
  mono-sélection) + tri par clic sur en-tête (Nom/Date/Âge) + étiquettes P/M enrichies ;
  9 (`specs/009-ajout-4-styles/`) +4 styles (Éditorial/Terminal/Néo-brutaliste/Organique)
  + 3 palettes (ambre/rose/bleu), 72 combinaisons, 6 polices OFL précachées ;
  8 (`specs/008-refonte-ui/`) refonte UI 5 vues + chrome, système de thème 3 axes
  (`data-mode`/`data-palette`/`data-style` en `localStorage`), polices auto-hébergées woff2 précachées,
  pied de page version, bouton remonter, pagination (défaut 50), onglets sandbox, lentille, Fiche enrichie
  (enfants + type de trait), correctif BUG-001 (état actif visible en style A) ;
  7 (`specs/007-sandbox-make-it-real/`) sandbox isolée & make it real (transfert RNG),
  reproduction manuelle déplacée en sandbox, création/clonage/édition directe + cycle de vie conjugal,
  suppression avec propagation, reconstruction historique via journal d'événements daté (`FORMAT_VERSION` 3) ;
  6 (`specs/006-persistance-compl-partage/`) persistance 3 types (config/data/full),
  détection auto à l'import, fusion pure non destructive, versionnage + rétro-compat ;
  1 (`specs/001-fondations-genese/`) seed/RNG, modèle, genèse, liste/fiche, export/import ;
  2 (`specs/002-reproduction-heredite/`) moteur génétique (hérédité §4, traits→pouvoirs §6.4, P/M §7.2, reproduction) ;
  3 (`specs/003-avancement-temps-population/`) tick annuel §6.6, vieillissement, mort, conjoints, état RNG sérialisé ;
  4 (`specs/004-genealogie-exploration/`) arbre généalogique (fiche prof. 2 + page dédiée N réglable), filtres/recherche,
  3 modes d'affichage des traits, rendu SVG des liens (BUG-001→007) ;
  5 (`specs/005-parametrage-catalogues/`) catalogues éditables, reproduction/courbe SVG, pondérations (héritage
  type→trait), résilience 3 niveaux (global→type→trait), tirage tolérant `pickWeightedOrNull` (type à 0 ⇒ pouvoir null).
  Défauts humain : gaussienne 18/25/50 pic 40 %, groupe 2, portée M1/N4/X15 %, consanguinité interdite.

### Stack
TypeScript 5.x · Vite · Svelte · Vitest · vite-plugin-pwa. App **100 % statique** (PWA), déployée sur
**GitHub Pages**. Aucun backend.

### Règles non négociables (constitution `.specify/memory/constitution.md`)
- Déterminisme : **une seule seed** ; aucun `Math.random`/horloge/UUID aléatoire dans `src/core`.
- Cœur **pur** `src/core` (sans Svelte/DOM/navigateur) ↔ UI `src/ui` ; l'UI consomme le cœur.
- Tests **Vitest à seed fixe** sur le cœur.
- Persistance **uniquement** par export/import de fichier (pas d'auto-save).
- **Anonymat** : identité `KingsCookie`, aucun nom/email perso dans le code, `package.json` ou les commits.

### Commandes
`npm run dev` · `npm run test` · `npm run build` · `npm run preview`
<!-- SPECKIT END -->
