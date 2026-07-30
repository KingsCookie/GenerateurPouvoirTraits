# Contrat UI — Refonte de l'UI mobile (direction 1a)

Toutes les surfaces ci-dessous sont **exclusivement** actives sous `@media (max-width: 760px)` (ou en
variantes de rendu conditionnées par la largeur). Aucune API de cœur n'est touchée. Aucune valeur
codée en dur : uniquement les variables de `src/app.css`.

## Invariants transverses

- **INV-M1** — Desktop intact : à largeur ≥ 760 px, le rendu est identique à l'actuel sur les 5 vues
  (aucune règle de base modifiée).
- **INV-M2** — Thèmes : le rendu reste correct pour les 6 styles × 6 palettes × 2 modes ; le
  changement de thème reste possible et persistant (aucune logique de thème modifiée).
- **INV-M3** — Cœur intact : aucune modification de `src/core`, aucune RNG/horloge/id aléatoire, aucun
  changement de persistance ; déterminisme et seed préservés.
- **INV-M4** — Cibles tactiles : actions principales ≥ 44 px ; icônes secondaires 36–40 px ; jamais
  < 32 px. `:focus-visible` (outline accent) visible partout ; `:hover`/`disabled` conservés.
- **INV-M5** — Feuilles : ouverture par translation ~200 ms (neutralisée par
  `prefers-reduced-motion`), fond `rgba(0,0,0,.5)`, fermeture Échap / ✕ / backdrop, focus piégé puis
  rendu au déclencheur.

## 1. Chrome commun (`App.svelte`, `StateIO.svelte`)

- En-tête 2 rangées fixes : (a) logo 28 px + titre tronqué à l'ellipse + 3 boutons icône 36 px
  (Exporter → feuille des 3 exports existants ; Importer → `<input type="file">` existant ; toggle
  clair/sombre `ThemeControls variant="toggle"`), chacun avec `aria-label` ; (b) nav segmentée
  `flex:1` (séparateur `.sep` supprimé), état actif = rendu `app.css` selon le style.
- `StateIO` : libellés masqués, `.io-bar` pleine largeur supprimée (pas de bandeau teinté).
- En-tête `sticky; top:0` ; `AppFooter` / `ScrollToTop` inchangés.

## 2. Population (`ListeView.svelte`, `TimeBar.svelte`, `FilterBar.svelte`, `Paginator.svelte`)

- Barre de temps compacte (année une ligne + stepper −/valeur/+ + « Avancer »), champ numérique
  accessible, borné `min=1`.
- Barre de filtres collante : « ⚙ Filtrer » (rendu actif + compteur si ≥ 1 filtre) + rangée de puces
  défilante (une par filtre actif avec croix + puce de tri courant).
- **INV-M6** — le bloc `.filters` n'est **pas** rendu sous 760 px ; tous ses critères restent
  atteignables via le panneau « Filtres & tri ».
- Lignes `flex` : nom + `†` si décédé ; méta `an … · … ans · espèce · gN` ; puces pouvoirs `P/M` ;
  chevron `›`. **Pas de bouton « ⋯ »** ; tap → `selectPerson(id)`. Objectif : ≥ 8 lignes visibles à
  390 × 844 px.
- Ligne de résultats compacte ; `Paginator` complet déplacé dans le panneau ; flèches ‹ › (≥ 44 px)
  en bas quand `nbPages > 1`.

## 3. Panneau « Filtres & tri » (`FilterBar.svelte`, plein écran, mobile seulement)

- Ouvert par « ⚙ Filtrer » ; réutilisé par Population et Sandbox via la prop `list: ListName`.
- Contenu : recherche par nom ; tri (3 segments Nom/Naissance/Âge avec direction via `cycleSort`) ;
  génération (défaut dynamique si `generationTouched` faux — **INV-M7** conservé) ; espèce·statut ;
  pouvoir (mono-sélection, re-clic = null) ; 3 lignes de navigation vers sous-écrans de traits
  (Présence / Portée / Traits sélectionnés `n / 64`).
- **INV-M8** — le catalogue de traits ne s'affiche jamais en ligne ; uniquement via sous-écrans.
- Application **en direct** ; bouton bas « Voir les N individus » (compte à jour) ; « Réinitialiser »
  = `resetFilters()` + `resetSort(list)`.

## 4. Fiche (`FicheView.svelte`, `TraitModeSelector.svelte`)

- Ordre : titre (← 36 px / nom tronqué / ⋯) → ligne statut → 2 tuiles (pouvoirs / traits actifs) →
  cartes pouvoir → entrée « Arbre généalogique » → `TraitModeSelector` (puces 1/2/3) → liste d'infos →
  barre d'action basse (« Explorer l'arbre », « Tuer… »).
- **INV-M9** — ni `GenealogyTree` ni `TreeLegend` montés dans la fiche sous 760 px ; l'entrée arbre
  ouvre `ArbreView` (inchangée) ; remise à zéro du défilement conservée.
- Barres de mesure P/M : cas normal = remplissage `valeur/10`. **INV-M10** — cas > 10 : barre pleine
  hachurée d'accent + halo + liseré interne + butoir, valeur `var(--fg)` gras, `/10` conservé, sans
  déborder la piste, `role="meter"` (valeur réelle) ; **aucun** effet équivalent dans la liste.
- « Tuer… » ouvre une feuille de confirmation avec champ cause obligatoire + `role="alert"` (règle
  métier inchangée).

## 5. Paramètres (`ParametresView.svelte`, `ThemeControls.svelte`, `CatalogueModal`, `EspecesModal`)

- Onglets Principaux/Avancés conservés (`paramsTab` mémorisé) ; `fieldset` en cartes à lignes (libellé
  gauche, champ droite ~96 px `text-align:right`) ; descriptions repliées sauf règle métier.
- **INV-M11** — paramètres graphiques : ligne « Apparence » → sous-page plein écran
  `ThemeControls variant="full"` (logique de thème **inchangée**), pas de 12 puces en ligne.
- « Catalogues & espèces » → `CatalogueModal`/`EspecesModal` **plein écran** ; champ « A » en lecture
  seule ; bouton « Générer la population » en barre basse persistante (tous onglets).

## 6. Sandbox (`SandboxView.svelte`)

- **INV-M12** — aucun `<table>` à défilement horizontal ; individus en lignes `flex`.
- Bandeau : badge « Bac à sable », ↺/✕ icônes 36 px, « ✔ Make it real » ; actions destructrices
  confirmées.
- Lentille : `range` pleine largeur synchronisé au champ, borné `[minYear, maxYear]`.
- Onglets internes Population/Couples en segments ; barre de filtres identique à Population.
- Actions de ligne (Éditer / Cloner / Régénérer / Supprimer) via « ⋯ » → feuille.
- Mode reproduction : cases 20 px, rôles (parent 1/2) en accent, barre basse compte + enfants +
  « Valider ⚭ » + « Annuler ». **INV-M13** — ligne sélectionnée : rendu actuel conservé (mix accent
  24 % + liseré interne 3 px).
- Onglet Couples en pile (selects pleine largeur, actions sur leur ligne).

## 7. Arbre (`ArbreView.svelte`)

- Page dédiée conservée ; sous 760 px : contrôles (Profondeur, Zoom) en 2 rangées de segments
  (`min-height:40px`), viewport `height: clamp(20rem, 62vh, 34rem)` ; pan/zoom tactile conservé.

## 8. Version

- **INV-M14** — le pied de page affiche **v0.13.0** après build (`package.json` 0.12.1 → 0.13.0).
