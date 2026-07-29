# Quickstart — Validation de la réorganisation de la page Paramètres

Feature purement UI : validation par **checklist manuelle** dans le navigateur (`npm run dev`), plus
le test unitaire pur du store d'onglet. Cible **v0.12.0**.

## Portes automatiques (avant fusion)

```bash
npm run test    # Vitest — inclut tests/unit/params-tab-store.test.ts ; cœur inchangé
npm run build   # tsc --noEmit && vite build (le build échoue si les tests TS ne compilent pas)
npm run lint    # eslint + prettier
```

## Checklist manuelle (US1 — onglets)

1. Charger l'app (stockage vidé) → page Paramètres : l'onglet **« Principaux »** est actif ; on voit
   apparence + graine + nombre d'individus + année + chance de pouvoir + boutons d'éditeurs +
   bouton « Générer ». (AS1, AS4)
2. Cliquer sur l'onglet **« Avancés »** → le panneau bascule et affiche : résilience initiale, D, K,
   tout « Hérédité & naissance » (dont statA en lecture seule + case malus génome), pondérations de
   gabarits, résilience (overrides). Tous éditables. (AS2)
3. Modifier un réglage avancé (ex. `bonusPoints`), revenir sur « Principaux », cliquer « Générer » →
   la valeur modifiée est prise en compte. (AS3)
4. Vérifier que le bouton **« Générer la population »** est visible sur les **deux** onglets. (AS5)

## Checklist manuelle (US2 — modales)

5. Cliquer « Modifier les catalogues de traits… » → une modale s'ouvre avec l'éditeur **complet**
   (ajout/suppression/édition de traits, types, poids type & trait, résilience par trait). (AS1)
6. Modifier un trait, fermer par **Échap**, rouvrir → la modification est conservée. Refermer par
   clic sur l'arrière-plan, puis par le bouton « Fermer » → les trois moyens fonctionnent. (AS3)
7. Cliquer « Gérer les espèces… » → modale avec l'éditeur d'espèces complet **et** la case
   « Autoriser la consanguinité » en tête. Cocher/décocher, ajouter une espèce, vérifier la courbe.
   (AS2)
8. Après modification dans une modale puis fermeture, cliquer « Générer » → la simulation reflète les
   catalogues/espèces modifiés. (AS4)
9. Ouvrir puis fermer une modale ne déclenche **aucune** génération. (Edge case)

## Checklist manuelle (US3 — navigation & mémorisation)

10. Sélectionner « Avancés », **recharger** la page → l'onglet « Avancés » est actif. (AS2)
11. La navigation se réduit à la barre d'onglets (plus de sommaire latéral à 8 entrées). (AS1)
12. Vider `localStorage`, recharger → retour au défaut « Principaux » sans erreur. (Edge case)

## Recensement de préservation (SC-002 — impératif « rien de supprimé »)

Cocher que **chacun** de ces réglages est présent et éditable (onglet ou modale) :

- [ ] graine (+ régénérer) · [ ] nombre d'individus · [ ] année de naissance · [ ] chance de pouvoir
- [ ] apparence : style · palette · mode
- [ ] résilience initiale · [ ] constante D · [ ] constante K
- [ ] résilience max · [ ] bonus · [ ] malus · [ ] seuil de disparition
- [ ] taux mutation forte · [ ] taux sans pouvoir · [ ] mutation faible gain · [ ] mutation faible perte
- [ ] statB · [ ] statC · [ ] statA (lecture seule) · [ ] case « malus génome »
- [ ] pondérations gabarits AE · PE · PA · PR
- [ ] overrides de résilience (global → type → trait)
- [ ] éditeur de catalogues de traits (poids type/trait + résilience par trait)
- [ ] éditeur d'espèces & reproduction · [ ] case « autoriser la consanguinité »

## Déterminisme (SC-004)

13. Avec une graine fixe et la même suite d'actions, la population générée après la refonte est
    identique à celle d'avant (comparer un export `full` ou l'ordre/contenu de la liste). Aucune
    logique de cœur n'ayant changé, l'identité doit être exacte.
