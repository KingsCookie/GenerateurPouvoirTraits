# Quickstart — Validation de la refonte UI mobile

Feature responsive : validation par **checklist manuelle** en navigateur (`npm run dev`, DevTools
mobile à **390 × 844 px**, plus points de bascule 760 px), en plus des portes automatiques. Cible
**v0.13.0**.

## Portes automatiques (avant fusion)

```bash
npm run test    # Vitest — cœur INCHANGÉ, doit rester vert (SC-008)
npm run build   # tsc --noEmit && vite build
npm run lint    # eslint + prettier
```

## US1 — Population (390 × 844 px)

1. Générer une population, aller sur Population : **≥ 8 individus visibles sans défiler** (SC-001).
2. Le bloc `.filters` n'est pas rendu ; « ⚙ Filtrer » est présent.
3. Poser un filtre → « ⚙ Filtrer » passe en actif + compteur ; une puce par filtre actif (croix) +
   puce de tri apparaissent dans la rangée défilante.
4. Retirer une puce (croix) → le critère est retiré, la liste se recalcule.
5. Tap sur une ligne → la fiche s'ouvre. **Aucun bouton « ⋯ »** sur les lignes Population.
6. Plusieurs pages → seules les flèches ‹ › (≥ 44 px) en bas ; le sélecteur de taille est dans le
   panneau de filtres.

## US2 — Panneau Filtres & tri

7. « ⚙ Filtrer » ouvre un panneau plein écran (recherche, tri 3 segments avec direction, génération,
   espèce·statut, pouvoir, 3 lignes de traits Présence/Portée/Sélection `n / 64`).
8. Modifier un filtre → le bouton bas « Voir les N individus » se met à jour en direct.
9. « Réinitialiser » remet filtres **et** tri à zéro ; « Voir les N » / ✕ / backdrop / Échap ferment
   le panneau ; le focus revient au déclencheur.
10. Le catalogue de 64 traits ne s'affiche jamais en ligne (seulement via sous-écrans).
11. Depuis la **Sandbox**, « ⚙ Filtrer » ouvre le même panneau (prop `list`).

## US3 — Fiche

12. Ouvrir une fiche : identité d'abord (titre ←/nom/⋯, statut, tuiles, cartes pouvoir), puis entrée
    « Arbre généalogique », mode ADN, liste d'infos. Ni `GenealogyTree` ni `TreeLegend` montés.
13. Un pouvoir P ou M **> 10** → barre pleine hachurée + halo + butoir, valeur `var(--fg)` gras,
    `/10` conservé ; la **même** valeur en liste Population reste « 12/6 » sans effet (SC-006).
14. « Explorer l'arbre » ouvre `ArbreView` ; « Tuer… » ouvre une feuille avec cause obligatoire +
    message `role="alert"` si vide.

## US4 — Paramètres

15. Onglets Principaux/Avancés présents (onglet mémorisé) ; `fieldset` en cartes à lignes (champ à
    droite ~96 px) ; bouton « Générer la population » visible en bas sur les deux onglets.
16. Ligne « Apparence » → sous-page plein écran `ThemeControls variant="full"` ; changer mode/palette/
    style s'applique et persiste.
17. « Catalogues & espèces » → éditeurs en **plein écran** ; champ « A » en lecture seule.

## US5 — Sandbox

18. Aucune table à défilement horizontal ; individus en lignes.
19. Lentille : curseur pleine largeur synchronisé au champ, borné `[minYear, maxYear]`.
20. « ⋯ » d'une ligne → feuille (Éditer / Cloner / Régénérer / Supprimer).
21. Mode reproduction : cases 20 px, rôles parent 1/2, barre basse compte + enfants + Valider/Annuler ;
    ligne sélectionnée = rendu actuel (mix accent 24 % + liseré interne).
22. Onglet Couples en pile (selects pleine largeur).

## US6 — Thèmes & desktop (contraintes absolues)

23. **Desktop** : à ≥ 760 px, comparer avant/après sur les 5 vues → rendu **identique** (SC-004),
    y compris `.filters`, `Paginator` complet, arbre dans la fiche, tableaux.
24. **Thèmes** : sur mobile, parcourir A→F × 6 palettes × clair/sombre ; contrôler A (chip doux) et
    E (bordures 2 px, coins droits) en clair et sombre (SC-005). Aucune couleur codée en dur.

## Transverse

25. Cibles tactiles ≥ 44 px (actions principales) ; `:focus-visible` visible ; navigation clavier et
    lecteur d'écran opérantes (SC-007).
26. Liste vide → message « Aucun individu ne correspond aux filtres. » + « Réinitialiser les filtres ».
27. `prefers-reduced-motion` → feuilles sans transition.
28. Pied de page affiche **v0.13.0** (SC-008).
