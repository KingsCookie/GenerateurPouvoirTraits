# Quickstart — validation Feature 015

Prérequis : `npm run test` (Vitest) et `npm run lint` **verts**, puis `npm run dev` pour la
validation manuelle. Cible **v0.14.0**.

## 1. Tests automatisés du cœur (Principe V)

```bash
npm run test      # tous verts, dont les nouveaux tests seed-fixe
npm run lint      # eslint + prettier verts
npm run build     # tsc --noEmit + build statique OK
```

Nouveaux tests attendus (seed fixe, `_fakeRng`) :

- `tick.test.ts` : mort naturelle déterministe (INV-D1→D6), vieillissement +1/an (INV-A1→A2), gel
  d'âge après mort (INV-A3), génération invariante (INV-A4).
- `death.test.ts` : résurrection (INV-R1→R3), immortalité (INV-R4→R5).
- `genealogy-sort.test.ts` : tris puissance/maîtrise, pouvoir extrême, sans-pouvoir en fin
  (INV-S1→S4).
- `genealogy-filter.test.ts` : bornes année inclusives + exclusivité génération (INV-F1→F5).
- `state.test.ts` : migration v4→v5 (INV-PE1→PE3).
- `edit-especes.test.ts` : validation `esperanceVie` / `mortNaturellePct`.

## 2. Validation manuelle — US1 mort naturelle

1. Paramètres → espèce humain : vérifier **espérance de vie = 60**, **% mort naturelle = 10**.
2. Générer une population ; avancer suffisamment d'années pour dépasser 60 ans.
3. Vérifier que des individus meurent avec la cause **« mort naturelle »** ; que leur **âge se fige**
   (n'augmente plus aux ticks suivants) ; que leur **tranche de génération** reste inchangée.
4. Mettre `% mort = 0` → aucune mort naturelle ; `= 100` → tout éligible meurt au tick suivant.

## 3. Validation manuelle — US2 cycle de vie (fiche, mobile + desktop)

1. Ouvrir la fiche d'un décédé : cliquer **Ressusciter** → il redevient vivant à son âge figé, la
   raison de décès disparaît.
2. Sur un vivant : le bouton **Ressusciter** est indisponible.
3. Cocher **Immortel** → avancer longtemps au-delà de l'espérance → il ne meurt jamais naturellement.
4. **Tuer** un immortel (cause obligatoire) → il meurt quand même.
5. Refaire l'ensemble en **mobile (≤760px)** et **desktop (≥760px)**.

## 4. Validation manuelle — US3 tris puissance/maîtrise (liste, mobile + desktop)

1. Cliquer le tri **puissance** : 1ᵉʳ clic = croissant, 2ᵉ = décroissant, 3ᵉ = défaut.
2. Sur un individu multi-pouvoirs : vérifier classement sur la valeur **la plus basse** (croissant)
   et **la plus haute** (décroissant).
3. Vérifier que les individus **sans pouvoir** sont **en fin de liste** dans les deux sens.
4. Idem pour le tri **maîtrise**. Activer un tri en désactive un autre.

## 5. Validation manuelle — US4 filtres année (liste, mobile + desktop)

1. Saisir **né après 2000** → seuls les individus nés en 2000 ou après ; le filtre **génération est
   désactivé** (grisé).
2. Ajouter **né avant 2010** → intervalle [2000, 2010] inclus.
3. Vider les deux champs → le filtre **génération redevient actif**.
4. Saisir X > Y → liste vide, sans erreur.

## 6. Validation manuelle — US5 indicateur de chargement

1. Sur une grosse population, cliquer **avancer** de nombreuses années : la **flèche circulaire en
   rotation** apparaît **pendant** le calcul.
2. Elle **disparaît** dès l'affichage de la nouvelle population.
3. Activer `prefers-reduced-motion` (OS) → l'indicateur ne tourne pas mais reste présent/absent selon
   l'état de calcul.
4. Vérifier en mobile ET desktop.

## 7. Persistance (rétro-compat)

1. Importer un fichier exporté avant v0.14.0 → aucun message d'erreur ; les individus valent
   **non immortels**, l'âge est cohérent, les espèces ont espérance/`% mort` par défaut.
2. Exporter puis réimporter (`full`) → round-trip identique (déterminisme préservé).
