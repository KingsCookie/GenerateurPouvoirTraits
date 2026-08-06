# Quickstart — Validation Feature 014 (corrections UI)

Validation par **checklist manuelle** (responsive + thèmes) en plus des portes automatiques. Cadre
mobile de référence : **390 × 844 px** ; point de bascule **760 px**.

## Portes automatiques

1. `npm run test` — vert, **dont** `tests/unit/gauge.test.ts` (bornes `-1, 0, 10, 11` + `5, 17`).
2. `npm run build` — `tsc --noEmit && vite build` OK.
3. `npm run lint` — eslint + prettier OK.
4. Pied de page = **v0.13.2** (INV-J4).

## US1 — Jauges P/M (mobile ET desktop)

5. Ouvrir une fiche avec un pouvoir P/M = `5` → jauge **normale**, aucune animation (SC-001).
6. Valeur `11` puis `17` → barre **pleine**, bandes animées + onde, **aucune** bande au-delà du bord
   droit à aucune frame (SC-002) ; seule la valeur affichée diffère.
7. Valeur `-1` → rail **rompu** en 2 tronçons, **aucun** remplissage, **aucune** animation.
8. Valeur `0` → **normale** (barre vide, rail intact, pas `broken`) ; valeur `10` → **normale**
   (pleine, pas `overloaded`).
9. La **hauteur de ligne** est identique dans les 3 états (aucun décalage voisin) (SC-003).
10. `prefers-reduced-motion: reduce` → aucune animation ; l'état surchargé reste distinguable
    (SC-004).
11. **Desktop ≥ 760 px** : les jauges apparaissent dans les cartes de pouvoir de la fiche, avec les
    **mêmes** effets que mobile (FR-009).
12. La valeur numérique réelle est toujours lisible (`17`, `-3`), couleur d'alerte en `broken`,
    accent clair en `overloaded` (FR-004).

## US2 — Date de naissance complète (Population mobile)

13. À 390 × 844 px, onglet Population : chaque ligne montre la **date complète** (pas l'année seule),
    identique à la date de la fiche de l'individu (SC-005).
14. Desktop ≥ 760 px : liste Population **inchangée**.

## US3 — Liste Sandbox alignée + « ⋯ »

15. À 390 × 844 px, Sandbox hors reproduction : une ligne présente les **mêmes champs** qu'une ligne
    Population (dont **date complète** et **puces P/M**) **plus** « ⋯ » (SC-006).
16. « ⋯ » ouvre la feuille Éditer / Cloner / Régénérer / Supprimer (inchangée).
17. Tap sur le **corps** de la ligne (hors « ⋯ ») → **rien** (aucune navigation) (INV-J16).
18. Mode reproduction : cases à cocher + marquage de sélection **inchangés**.
19. Desktop ≥ 760 px : Sandbox **inchangée**.

## US4 — Bulle « Avancer » extensible

20. Mobile, bulle « Avancer » : 1 chiffre → taille min (≥ 2 caractères visibles).
21. 3–4 chiffres → le champ **s'élargit** et montre tout ; « an XXX », `−`, champ, `+`, « Avancer »
    restent **sur une ligne**, sans débordement horizontal (SC-007).
22. Saisie très longue → le champ **cesse de grandir** à la largeur max (pas de casse de mise en
    page).
23. Desktop ≥ 760 px : comportement **inchangé**.

## Parité & thèmes

24. **Desktop ≥ 760 px** : comparer avant/après → seuls changements = jauges dans la fiche ; tous les
    autres écrans **identiques** (SC-008).
25. **Matrice thèmes** sur les jauges : contrôler A et E, en clair et sombre, sur ≥ 2 palettes — le
    dégradé de remplissage suit l'accent, aucune valeur en dur (INV-J2).

*(Validation navigateur à confirmer par l'auteur avant prod.)*
