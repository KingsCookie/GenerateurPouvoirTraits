# Contrats & invariants — Feature 015

Invariants vérifiables (tests Vitest seed-fixe pour le cœur ; checklist manuelle pour l'UI). `INV-*`
préfixés par domaine.

## Mort naturelle & tick (US1)

- **INV-D1** : À `age < esperanceVie`, un individu n'est **jamais** soumis au tirage de mort
  naturelle (aucun `rng.chance` consommé pour lui).
- **INV-D2** : À `age >= esperanceVie`, un individu **vivant** et **non immortel** est soumis à
  `rng.chance(mortNaturellePct)` **une fois par tick**, en dernière étape.
- **INV-D3** : Un individu `immortel` n'est **jamais** tué par la mort naturelle (aucun tirage
  consommé), mais reste tuable par `kill`.
- **INV-D4** : Un individu mort de mort naturelle a `vivant = false` et `raisonDeces = "mort
  naturelle"`, et son couple éventuel est dissous (conjoints actuels → « ex »), comme pour `kill`.
- **INV-D5** : Déterminisme — même seed + mêmes paramètres + même nombre d'années ⇒ **exactement** la
  même population (mêmes morts, mêmes âges). (SC-001)
- **INV-D6** : `mortNaturellePct = 0` ⇒ aucune mort naturelle ; `= 100` ⇒ tout éligible meurt au tick.

## Âge suivi & génération (US1)

- **INV-A1** : Chaque tick incrémente `age` de +1 pour **tout individu vivant** ; les morts ne sont
  pas incrémentés.
- **INV-A2** : Un nouveau-né a `age = 0` l'année de sa naissance.
- **INV-A3** : Après la mort, `age` reste **constant** sur toute avancée ultérieure du temps.
- **INV-A4** : `computeGeneration` d'un individu est **constant** avant/après mort et après
  résurrection (dérivé de `dateNaissance`). (SC-003)
- **INV-A5** : Toute lecture d'âge (fiche, liste, tri âge, arbre) reflète `person.age` (pas un
  recalcul dérivé divergent après mort).

## Résurrection & immortalité (US2)

- **INV-R1** : `resurrect` sur un décédé ⇒ `vivant = true`, `raisonDeces = null`, `age` **inchangé**
  (= âge figé). (SC-004)
- **INV-R2** : Un ressuscité non immortel d'âge ≥ espérance est de nouveau soumis au tirage dès le
  **prochain** tick.
- **INV-R3** : `resurrect` sur un individu déjà vivant est **sans effet** (ou refusé) ; le bouton
  « Ressusciter » est **indisponible** en fiche pour un vivant (FR-013).
- **INV-R4** : `setImmortal(id, true/false)` bascule le champ ; l'effet est immédiat au tick suivant.
- **INV-R5** : `kill` fonctionne même sur un immortel (l'immortalité ne bloque que la mort
  naturelle).

## Tris puissance & maîtrise (US3)

- **INV-S1** : Le clic sur le tri puissance (resp. maîtrise) **cycle** défaut → croissant →
  décroissant → défaut ; activer un tri **désactive** tout autre tri (un seul actif).
- **INV-S2** : En croissant, un individu multi-pouvoirs est classé selon sa valeur **la plus basse** ;
  en décroissant, selon sa valeur **la plus haute**. (SC-005)
- **INV-S3** : Les individus **sans pouvoir** sont **toujours en fin de liste**, quel que soit le
  sens ; entre eux, ordre par défaut stable (`byBirthThenId`). (FR-017b)
- **INV-S4** : Le tri « par défaut » (3ᵉ clic) restaure l'ordre par défaut habituel.

## Filtres par année de naissance (US4)

- **INV-F1** : « né après X » retient `yearOf(dateNaissance) >= X` ; « né avant Y » retient
  `<= Y` (bornes **inclusives**). (SC-006)
- **INV-F2** : Dès qu'au moins une borne d'année est active, le filtre **génération est ignoré**
  (domaine) et son contrôle **désactivé** (UI), mobile ET desktop.
- **INV-F3** : Champ d'année vide ⇒ borne inactive (aucune restriction pour ce champ).
- **INV-F4** : Retirer toutes les bornes d'année **réactive** le filtre génération.
- **INV-F5** : Intervalle vide (X > Y) ⇒ liste vide, sans erreur.

## Indicateur de chargement (US5)

- **INV-L1** : Au clic « avancer », le spinner (flèche circulaire) est **effectivement peint** avant
  le début du calcul synchrone (yield d'une frame). (FR-022b)
- **INV-L2** : Le spinner **disparaît** dès l'affichage de la nouvelle population. (SC-007)
- **INV-L3** : `prefers-reduced-motion: reduce` ⇒ le spinner ne tourne pas (état statique), mais
  reste présent/absent selon INV-L1/L2.

## Parité & style (transversal)

- **INV-P1** : Les 4 nouveautés UI (tris, filtres année, boutons cycle de vie, spinner) sont
  présentes et fonctionnelles **en dessous ET au-dessus de 760px**. (FR-026, SC-009)
- **INV-P2** : Aucune valeur de style en dur : couleurs/rayons via tokens (`--accent`, `--danger`,
  `--radius`, …).
- **INV-P3** : Le desktop ≥ 760px n'est pas régressé hors ajouts volontaires (tris P/M, filtres
  année, boutons cycle de vie, spinner).

## Persistance (transversal)

- **INV-PE1** : `FORMAT_VERSION = 5`. Un fichier v≤4 se réimporte sans erreur. (SC-008)
- **INV-PE2** : À l'import d'un fichier ancien, `immortel` vaut `false`, `age` est recomposé par
  `computeAge(yearOf(dateNaissance), currentYear)`, et les espèces sans les nouveaux champs prennent
  60 / 10 (ou défauts définis).
- **INV-PE3** : Les nouveaux champs (espèce + personne) sont inclus dans l'export `full`/`config`/
  `data` selon leur appartenance.
