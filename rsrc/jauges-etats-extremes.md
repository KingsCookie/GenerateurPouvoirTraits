# Spécification — États extrêmes des jauges Puissance & Maîtrise (mobile)

Statut : prêt à implémenter · Portée : UI uniquement (`src/ui`), aucun impact sur `src/core` ni sur le déterminisme.

## 1. Contexte

Les jauges **Puissance** et **Maîtrise** affichent aujourd'hui une valeur attendue dans `[0, 10]`.
L'hérédité des traits peut produire des valeurs hors de cette plage. Deux états visuels
supplémentaires sont requis, visibles en priorité sur mobile.

## 2. Règles d'état

| Condition sur la valeur `v` | État        | Rendu                                        |
| --------------------------- | ----------- | -------------------------------------------- |
| `v < 0`                     | `broken`    | Rail rompu, **barre entièrement vide**        |
| `0 <= v <= 10`              | `normal`    | Rendu actuel, inchangé                        |
| `v > 10`                    | `overloaded`| Barre pleine + bandes qui s'enroulent + onde  |

Règles complémentaires :

- En `overloaded`, la barre de remplissage est **toujours à 100 %** ; le dépassement est porté par
  l'animation et par la valeur numérique affichée, jamais par une largeur > 100 %.
- En `broken`, **aucun remplissage n'est rendu** : le rail seul est visible, cassé en deux tronçons.
- La valeur numérique reste toujours affichée telle quelle (`17`, `-3`), sans clamp.
- Les deux états ne se cumulent jamais.

## 3. État `overloaded` (v > 10)

Composition, de l'arrière vers l'avant, à l'intérieur d'un rail `overflow: hidden` :

1. **Remplissage** — dégradé horizontal de l'accent sombre vers l'accent clair, 100 % de largeur.
2. **Bandes** — `repeating-linear-gradient` blanc à 115°, motif 10 px pleins / 20 px vides,
   translation de 30 px (une période) en `0.44s linear infinite`.
   Le calque est plus large que le rail (`left: -40px; right: -40px`) pour que la boucle soit sans couture.
3. **Masque de disparition** — le calque des bandes porte
   `mask-image: linear-gradient(90deg, #000 0%, #000 80%, transparent 100%)` :
   les bandes s'effacent dans les 20 % finaux. **Rien ne sort jamais de la jauge.**
4. **Onde blanche** — bande lumineuse de 45 % de large qui traverse en `3.4s ease-in-out infinite`.

Deux effets ont été explicitement écartés après revue et **ne doivent pas être implémentés** :
le glitch / décalage chromatique, et le flash lumineux sur l'extrémité droite (il donnait
l'impression que le bout de la barre était un élément séparé). L'extrémité droite du rail reste
d'un seul tenant.

### CSS de référence

```css
/* Variables à mapper sur les tokens existants du projet */
.gauge {
  --gauge-h: 22px;
  --gauge-track: #23262f;
  --gauge-fill-from: #8a6a12;
  --gauge-fill-to: #c9a227;
  --gauge-band: rgba(255, 255, 255, 0.3);
  --gauge-band-speed: 0.44s;   /* vitesse des bandes */
  --gauge-wave-speed: 3.4s;    /* onde blanche */
}

.gauge__track {
  position: relative;
  height: var(--gauge-h);
  border-radius: 999px;
  background: var(--gauge-track);
  overflow: hidden;
}

.gauge__fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--gauge-value, 100%);
  background: linear-gradient(90deg, var(--gauge-fill-from), var(--gauge-fill-to));
}

/* --- overloaded --- */
.gauge--overloaded .gauge__fill { width: 100%; }

.gauge--overloaded .gauge__bands {
  position: absolute;
  inset: 0;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 80%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 0%, #000 80%, transparent 100%);
}

.gauge--overloaded .gauge__bands::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40px;
  right: -40px;
  background: repeating-linear-gradient(
    115deg,
    var(--gauge-band) 0 10px,
    transparent 10px 30px
  );
  animation: gauge-bands var(--gauge-band-speed) linear infinite;
}

.gauge--overloaded .gauge__wave {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 45%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  animation: gauge-wave var(--gauge-wave-speed) ease-in-out infinite;
}

@keyframes gauge-bands {
  from { transform: translateX(0); }
  to   { transform: translateX(30px); }
}

@keyframes gauge-wave {
  0%   { transform: translateX(-60%); opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateX(120%); opacity: 0; }
}

```

## 4. État `broken` (v < 0)

Le rail est **vide** et rompu en deux tronçons :

- **Tronçon gauche** — 46 % de large, aligné à gauche, coin gauche arrondi (`999px`),
  coin droit quasi droit (`2px`), bordure sauf à droite, `rotate(-1.4deg)`,
  arête de rupture dentelée via `clip-path`.
- **Tronçon droit** — 50 % de large, aligné à droite, décalé de 6 px vers le bas,
  symétrique, `rotate(1.1deg)`.
- L'espace entre les deux tronçons laisse voir le fond de la carte : c'est la cassure.
- Le conteneur fait 30 px de haut (22 px de rail + 8 px de débattement vertical) pour absorber
  le décalage sans décaler les lignes voisines.
- Aucune animation : l'état est statique, donc lisible dans une liste longue et sans coût CPU.

### CSS de référence

```css
.gauge--broken .gauge__track { display: none; }

.gauge--broken .gauge__break {
  position: relative;
  height: 30px;
}

.gauge--broken .gauge__break-piece {
  position: absolute;
  height: var(--gauge-h);
  background: #1b1d24;
  border: 1px solid #2f333d;
}

.gauge--broken .gauge__break-piece--left {
  left: 0;
  top: 2px;
  width: 46%;
  border-right: none;
  border-radius: 999px 2px 2px 999px;
  transform: rotate(-1.4deg);
  clip-path: polygon(0 0, 96% 0, 100% 22%, 93% 46%, 100% 70%, 95% 100%, 0 100%);
}

.gauge--broken .gauge__break-piece--right {
  right: 0;
  top: 8px;
  width: 50%;
  border-left: none;
  border-radius: 2px 999px 999px 2px;
  transform: rotate(1.1deg);
  clip-path: polygon(5% 0, 100% 0, 100% 100%, 4% 100%, 8% 72%, 2% 48%, 7% 24%);
}
```

## 5. Marquage sémantique

- La valeur numérique passe à la couleur d'alerte (`#e0533f`) en `broken`,
  à la couleur d'accent clair (`#e8c14f`) en `overloaded`.
- Le conteneur porte `role="meter"` avec `aria-valuenow`, `aria-valuemin="-10"`, `aria-valuemax="20"`
  et un `aria-label` explicite (`Puissance −3, jauge rompue` / `Puissance 17, surcharge`).
- Les états sont exprimés par une classe (`gauge--broken`, `gauge--overloaded`) et non par du style
  inline, pour rester testables.

## 6. Accessibilité — mouvement réduit

```css
@media (prefers-reduced-motion: reduce) {
  .gauge--overloaded .gauge__bands::before,
  .gauge--overloaded .gauge__wave {
    animation: none;
  }
}
```

En mouvement réduit, `overloaded` reste distinguable par les bandes statiques et par la valeur
numérique. `broken` est déjà statique.

## 7. Squelette Svelte

```svelte
<script lang="ts">
  export let label: string;
  export let value: number;
  export let max = 10;

  $: state = value < 0 ? 'broken' : value > max ? 'overloaded' : 'normal';
  $: pct = Math.min(100, Math.max(0, (value / max) * 100));
</script>

<div class="gauge gauge--{state}">
  <div class="gauge__head">
    <span class="gauge__label">{label}</span>
    <span class="gauge__value">{value}</span>
  </div>

  {#if state === 'broken'}
    <div class="gauge__break" role="meter"
         aria-valuenow={value} aria-valuemin={-max} aria-valuemax={max * 2}
         aria-label="{label} {value}, jauge rompue">
      <div class="gauge__break-piece gauge__break-piece--left"></div>
      <div class="gauge__break-piece gauge__break-piece--right"></div>
    </div>
  {:else}
    <div class="gauge__track" role="meter"
         aria-valuenow={value} aria-valuemin={-max} aria-valuemax={max * 2}
         aria-label="{label} {value}">
      <div class="gauge__fill" style="--gauge-value: {pct}%"></div>
      {#if state === 'overloaded'}
        <div class="gauge__bands"></div>
        <div class="gauge__wave"></div>
      {/if}
    </div>
  {/if}
</div>
```

## 8. Critères d'acceptation

1. `v = 5` → rendu actuel, aucune animation ajoutée.
2. `v = 11` → barre pleine, bandes animées, aucune bande visible au-delà du bord droit du rail
   à n'importe quelle frame.
3. `v = 17` → identique à `v = 11` ; seule la valeur affichée change (l'animation ne dépend pas de
   l'amplitude du dépassement).
4. `v = -1` → deux tronçons décalés, aucun pixel de remplissage, aucune animation.
5. `v = 0` → état `normal`, barre vide mais rail intact (ne doit pas basculer en `broken`).
6. La hauteur de ligne du composant est identique dans les trois états (pas de saut de mise en page
   au changement d'état).
7. Avec `prefers-reduced-motion: reduce`, aucune animation ne tourne.
7 bis. L'extrémité droite du rail est visuellement continue : aucun segment terminal distinct,
   aucun clignotement à cet endroit.
8. Tests unitaires : la fonction de dérivation d'état (`value → 'broken' | 'normal' | 'overloaded'`)
   est pure et couverte aux bornes `-1, 0, 10, 11`.

## 9. Hors périmètre

- Aucune modification du modèle de données ni du PRNG.
- Aucun nouveau token de couleur global : les valeurs ci-dessus sont des repères à remapper sur la
  palette existante du projet.
- Le rendu desktop hérite du même composant ; aucune variante spécifique n'est demandée.
