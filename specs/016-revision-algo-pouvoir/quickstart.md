# Quickstart — Révision de l'algorithme de transformation d'une sous-liste en pouvoir

## Développement

```bash
npm run dev      # dev server
npm run test     # tests Vitest (seed fixe)
npm run lint     # eslint + prettier
npm run build    # tsc + vite build (+ PWA)
```

## Tests automatisés (cœur, seed fixe)

### `tests/unit/power-label-tree.test.ts` (étendu)

- **T-LEAVES-2P** : pour chacune des 23 feuilles « deux pouvoirs », `powerLabelFromSublist` renvoie deux
  gabarits égaux (verbatim) à ceux du §6.4.2 après substitution des types présents. (INV-C2)
- **T-LEAF-1P** : feuille `aj/et/r` ⇒ un seul gabarit `"{aj} {et} sur {r} à la place de {Kp}"` (sans `{Ka}`).
- **T-LEAF-AET** : feuille `a/et` ⇒ 2ᵉ gabarit `"rends {Ke} {et}"` (jeton `{et}`, pas le mot « et »).
- **T-NR** : échantillon de feuilles **non listées** (p. ex. `a/e/p`, `a/e`, `p/r`) ⇒ libellé **inchangé**. (INV-C3)
- **T-NULL** : feuille terminale ⇒ `[]`. (INV-C1)

### `tests/unit/traits-to-powers.test.ts` (étendu / nouveau)

- **T-2POWERS** : une sous-liste tombant sur `a/e/p/r/aj/et` ⇒ **deux** `Pouvoir`, libellés attendus, ordre X→Y. (INV-2P)
- **T-KSHARED** : feuille à `{Kp}` partagé, tirage réussi (seed choisie) ⇒ le libellé résolu de `{Kp}` est
  **identique** dans les deux pouvoirs ; le trait généré est inscrit **une seule fois** dans l'ADN. (INV-C4)
- **T-KFAIL-SHARED** : `{Kp}` partagé échoue ⇒ **aucun** des deux pouvoirs référençant `{Kp}` n'est produit. (INV-C5)
- **T-KFAIL-PARTIAL** : jeton présent dans **un seul** gabarit qui échoue ⇒ seul ce pouvoir tombe ; l'autre
  (sans jeton `K` échoué) est **produit**. (INV-C5)
- **T-KORDER** : à seed fixe, le nombre de tirages `K` et leurs résultats sont reproductibles ; un `Kx`
  partagé ne consomme qu'**un** tirage. (INV-C6, INV-K1)
- **T-ID** : deux pouvoirs d'une même sous-liste ont des `id` distincts (`#0`/`#1`). (INV-C7, INV-IDP)
- **T-TRAITIDS** : le pouvoir sans `{Ka}` ne contient pas le trait action généré du pouvoir voisin ; le
  trait `{Kp}` partagé figure dans les deux. (INV-C8)
- **T-DET** : deux exécutions à seed identique ⇒ pouvoirs (libellés + traits) identiques. (INV-C11)

### `tests/unit/regenerate-powers.test.ts` (étendu)

- **T-PM-INDEP** : pour une feuille à deux pouvoirs, chaque pouvoir reçoit ses **propres** P/M (§7.2),
  cohérentes avec le mapping par index. (INV-C12, FR-003)

## Checklist manuelle (mobile + desktop)

- [ ] Génère une genèse (seed fixe), repère un individu dont une sous-liste tombe sur une feuille « deux
      pouvoirs » : la fiche affiche **deux** pouvoirs avec libellés distincts et P/M propres.
- [ ] Les libellés révisés (p. ex. `a/e/p/r/aj/et`, `aj/et/r`, `a/et`) s'affichent conformément au §6.4.2.
- [ ] Un individu dont les feuilles sont **non listées** affiche des libellés inchangés (pas de régression visible).
- [ ] Liste et Sandbox affichent correctement les individus à deux pouvoirs (chips/étiquettes, tri P/M OK).
- [ ] Export puis import d'un `full` : les pouvoirs restent identiques (pas de recalcul ; `FORMAT_VERSION` inchangé).
- [ ] Parité mobile (≤ 760 px) / desktop.

## Notes de version

- Cible **v0.15.0** (`package.json` 0.14.1 → 0.15.0 à l'implémentation).
- Les valeurs de sortie à seed fixe **changent** par rapport à v0.14.x (ordre/nombre de tirages `K` + P/M) :
  les tests de régression figent les **nouvelles** valeurs. C'est attendu et documenté.
