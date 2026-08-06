# Research & Décisions — Feature 015

Décisions techniques résolvant le contexte du plan. Aucune `NEEDS CLARIFICATION` restante (les 5
clarifications de spec sont intégrées). Format : Décision / Rationale / Alternatives rejetées.

## R1 — Âge : compteur stocké plutôt que dérivé

- **Décision** : Ajouter un champ `age: number` à `Personne`. Le tick incrémente `age` de +1 pour
  chaque individu **vivant** ; les morts ne sont pas incrémentés. À la naissance, `age = 0`. À la
  résurrection, `age` reste tel quel (âge figé). Tous les points de lecture d'âge lisent `person.age`
  — **y compris la reproduction** (âge max de reproduction dans `repro/candidates.ts` et âge moyen de
  couple dans `time/tick.ts`) : l'éligibilité à la reproduction se fonde sur l'**âge vécu** (suivi),
  pas sur `currentYear − annéeDeNaissance` (F1 de l'analyse). La génération reste **dérivée** de
  l'année de naissance.
- **Rationale** : l'âge est aujourd'hui `currentYear − yearOf(dateNaissance)` (`genesis/derived.ts`),
  impossible à geler à la mort ni à reprendre à l'âge figé (FR-005, clarification Q1). Un compteur
  suivi est la seule façon de dissocier « âge vécu » et « temps écoulé » tout en gardant la date de
  naissance immuable (donc la tranche de génération invariante, FR-006 gratuitement satisfait).
- **Alternatives rejetées** :
  - *Décaler la date de naissance à la résurrection* : casserait la tranche de génération (interdit
    par la clarification, option C rejetée).
  - *Stocker « années mortes » et garder l'âge dérivé* : logique de dérivation plus complexe et
    fragile qu'un simple compteur ; multiplie les cas particuliers dans chaque lecteur d'âge.

## R2 — Paramètres d'espèce `esperanceVie` + `mortNaturellePct`

- **Décision** : Ajouter `esperanceVie: number` (âge entier ≥ 0) et `mortNaturellePct: number`
  (pourcentage [0..100]) à l'interface `Espece` (`model/espece.ts`). Défauts humain **60 / 10** dans
  `defaultEspece()` (`catalog/defaultCatalog.ts`) et défauts neutres dans `defaultReproParams()`
  (`species/editEspeces.ts`). Validation dans `validateEspece()` (entier ≥ 0 ; % clampé [0..100]).
- **Rationale** : cohérent avec l'emplacement des autres paramètres d'espèce (gaussienne, portée,
  divorce) ; respecte le Principe VII (paramétrable + exporté) et §9.4 de la source de vérité.
- **Alternatives rejetées** : *paramètre global* (non — la spec exige par espèce) ; *table séparée*
  (sur-ingénierie, Principe VIII).

## R3 — Placement de l'étape « mort naturelle » dans le tick

- **Décision** : Ordre du tick : **(0) vieillissement** (age+1 des vivants) → (1) divorces →
  (2) candidats/appariement → (3) reproduction → **(4) mort naturelle**. La mort naturelle est testée
  en **dernier**, sur la population dans l'ordre stable, pour chaque individu `vivant && !immortel &&
  age >= espece.esperanceVie`, via `rng.chance(espece.mortNaturellePct)`. `currentYear += 1` clôt le
  tick. Un individu peut donc s'être reproduit l'année de sa mort (cohérent avec §6.6 : mort =
  étape 3 après reproduction). Un nouveau-né de l'année (age 0) n'est éligible que si
  `esperanceVie <= 0`.
- **Rationale** : la source de vérité §6.6 place la mort naturelle en dernière étape (« 3. Mort
  naturelle »), après reproduction. Le vieillissement explicite en tête matérialise « l'avancée de
  la date fait vieillir les vivants » (§6.5). Ordre fixe ⇒ déterminisme reproductible.
- **Alternatives rejetées** : *mort avant reproduction* (contredit §6.6, empêcherait un mourant de
  procréer son année de décès) ; *mort pendant l'appariement* (couplage arbitraire).

## R4 — Déterminisme du tirage de mort naturelle (Principe I)

- **Décision** : Ne consommer `rng.chance(mortNaturellePct)` **que** pour les individus éligibles
  (vivant, non immortel, age ≥ espérance), en itérant la population dans **l'ordre stable** de
  `byId.values()` (ordre d'insertion, identique à l'usage existant du tick). Les immortels et les
  trop jeunes ne consomment **aucun** tirage. `rng.chance` respecte déjà les bords (`pct<=0 → false`,
  `pct>=100 → true`) donc 0 % et 100 % ne consomment pas d'entropie superflue au-delà du contrat
  existant.
- **Rationale** : garantit SC-001 (rejouabilité stricte) et évite toute dérive de flux RNG entre
  versions. Cohérent avec la façon dont divorces/reproduction consomment le RNG.
- **Alternatives rejetées** : *tirer pour toute la population puis filtrer* (gaspille l'entropie et
  rendrait l'ordre/inclusion des immortels observable dans le flux — non déterministe vis-à-vis des
  changements de paramètres).

## R5 — Persistance : `FORMAT_VERSION` 4 → 5 & migrations

- **Décision** : Passer `FORMAT_VERSION` de 4 à **5** (`state/serialize.ts`). Migrations à défaut à
  l'import :
  - Personne : `p.immortel ??= false` ; `p.age ??= computeAge(yearOf(p.dateNaissance), currentYear)`
    (dans `validateDataInto` **et** la branche `data` de `parseImport`).
  - Espèce : `e.esperanceVie ??= 60` ; `e.mortNaturellePct ??= 10` (dans `validateConfigInto`).
- **Rationale** : rétro-compat des fichiers v≤4 (FR-024, FR-025, SC-008) sans perte ; l'âge d'un
  fichier ancien (jamais mort) se recompose exactement par la formule dérivée historique.
- **Alternatives rejetées** : *refuser les vieux fichiers* (casse la portabilité, Principe VI) ;
  *défaut age = 0* (fausserait l'âge des populations importées).

## R6 — Tris puissance & maîtrise (règle du pouvoir extrême, sans-pouvoir en fin)

- **Décision** : Étendre `SortKey` (`genealogy/filter.ts`) avec `'puissance' | 'maitrise'`. Dans
  `sortPopulation`, pour ces clés : (a) **partitionner** les individus sans pouvoir à part ; (b) pour
  les autres, calculer une valeur clé = `dir==='asc' ? min(valeurs) : max(valeurs)` sur les pouvoirs
  (puissance ou maîtrise), comparer avec le `sign` habituel, départage `byBirthThenId` ; (c)
  **concaténer les sans-pouvoir à la fin** (ordre `byBirthThenId`), quel que soit le sens (FR-017b).
  Le cycle défaut→asc→desc et l'unicité du tri actif restent gérés par `cycleSort` existant.
- **Rationale** : implémente exactement FR-016/FR-017b et la clarification Q3. Le partitionnement
  évite que le `sign` global ne remonte les sans-pouvoir en tête en tri croissant.
- **Alternatives rejetées** : *traiter sans-pouvoir comme valeur 0* (option B rejetée en Q3 :
  remonterait en tête en croissant) ; *exclure les sans-pouvoir* (option C rejetée : masque des
  individus).

## R7 — Filtres « né après X » / « né avant Y » (inclusifs, exclusifs de la génération)

- **Décision** : Ajouter `bornNafter: number | null` et `bornBefore: number | null` à
  `FilterCriteria`. Dans `filterPopulation`, appliquer sur `yearOf(p.dateNaissance)` des bornes
  **inclusives** (`>= bornNafter` et `<= bornBefore`). Exclusivité avec la génération : dès qu'une
  borne d'année est non-nulle, **ignorer** `criteria.generations` (dans `filterPopulation` pour la
  correction domaine) **et** désactiver visuellement le fieldset Génération dans `FilterBar`
  (mobile + desktop). Un champ vide ⇒ borne `null` (inactive, FR-021).
- **Rationale** : implémente FR-018/019/020/021 et la clarification Q2 (bornes inclusives). Mettre
  l'exclusivité aussi dans `filterPopulation` garantit la correction même si l'UI oublie de vider les
  générations (source unique de vérité de filtrage).
- **Alternatives rejetées** : *bornes exclusives / demi-ouvertes* (options B/C rejetées en Q2) ;
  *exclusivité purement UI* (risque d'incohérence si l'état de génération subsiste).

## R8 — Indicateur de chargement : yield d'une frame avant calcul synchrone

- **Décision** : Introduire un writable `advancing` (store UI). Le handler « avancer » :
  `advancing=true` → **céder une frame** (`await new Promise(r => requestAnimationFrame(r))`, ou
  `await tick()` de Svelte suivi d'un rAF) → exécuter le calcul synchrone `advanceYears` → publier la
  nouvelle population → `advancing=false`. Le spinner est monté tant que `advancing` est vrai, en
  mobile ET desktop.
- **Rationale** : le calcul cœur est synchrone et bloque le thread ; sans yield explicite le spinner
  ne serait jamais peint (FR-022b, clarification Q4). `requestAnimationFrame` garantit qu'une frame
  est rendue avant de bloquer. Aucune dépendance, cœur inchangé (reste synchrone et pur).
- **Alternatives rejetées** : *best-effort sans yield* (option B rejetée : spinner invisible) ;
  *découpage du calcul en tranches asynchrones* (option C rejetée : complexité, Principe VIII ;
  toucherait au cœur ou à son ordonnancement).

## R9 — Composant `Spinner.svelte` + keyframe `spin`

- **Décision** : Créer `src/ui/components/Spinner.svelte` : une flèche circulaire (SVG/CSS) en
  rotation via `@keyframes spin { to { transform: rotate(360deg) } }` défini dans `app.css` (ou
  scoped au composant), couleur `--accent`. `@media (prefers-reduced-motion: reduce)` fige la
  rotation. Réutilisable mobile + desktop.
- **Rationale** : aucun spinner n'existe (seuls des keyframes de jauge/feuille) ; un composant isolé
  respecte la réutilisation et les tokens (Principe VII/VIII) et la contrainte
  `prefers-reduced-motion` du plan.
- **Alternatives rejetées** : *GIF/asset image* (contraire au style tokenisé, poids inutile) ;
  *librairie de spinners* (dépendance injustifiée, Principe VIII).
