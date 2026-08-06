<script lang="ts">
  import { gaugeState } from '../lib/gauge.js';

  // Jauge de mesure Puissance / Maîtrise (Feature 014). Composant PARTAGÉ mobile + desktop :
  // même rendu partout (rsrc/jauges-etats-extremes.md §9). L'état vient de la fonction pure
  // `gaugeState` et est porté par une CLASSE (testable), jamais par du style inline conditionnel.
  export let label: string;
  export let value: number;
  export let max = 10;

  $: state = gaugeState(value, max);
  // Remplissage borné visuellement à [0,100] % ; la valeur réelle reste affichée sans clamp.
  $: pct = Math.max(0, Math.min(100, (value / max) * 100));
</script>

<div class="gauge gauge--{state}">
  <span class="mlabel">{label}</span>

  {#if state === 'broken'}
    <span
      class="body break"
      role="meter"
      aria-valuenow={value}
      aria-valuemin={-max}
      aria-valuemax={max * 2}
      aria-label={`${label} ${value}, jauge rompue`}
    >
      <span class="piece piece--left"></span>
      <span class="piece piece--right"></span>
    </span>
  {:else}
    <span
      class="body track"
      role="meter"
      aria-valuenow={value}
      aria-valuemin={-max}
      aria-valuemax={max * 2}
      aria-label={`${label} ${value}${state === 'overloaded' ? ' (surcharge)' : ` sur ${max}`}`}
    >
      <span class="fill" style="width:{pct}%"></span>
      {#if state === 'overloaded'}
        <span class="bands" aria-hidden="true"></span>
        <span class="wave" aria-hidden="true"></span>
      {/if}
    </span>
  {/if}

  <span class="mval" class:broken={state === 'broken'} class:over={state === 'overloaded'}
    >{value}<span class="slash">/{max}</span></span
  >
</div>

<style>
  /* Variables locales (timings/hauteur — pas des tokens de thème). */
  .gauge {
    --g-h: 10px;
    --g-band-speed: 0.44s;
    --g-wave-speed: 3.4s;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    /* Hauteur de ligne stable dans les 3 états (aucun saut de mise en page). */
    min-height: 18px;
  }
  .mlabel {
    flex: none;
    width: 74px;
    font-family: var(--mono);
    font-size: 10px;
    color: var(--fg-faint);
  }
  .body {
    position: relative;
    flex: 1;
    height: var(--g-h);
    display: block;
  }

  /* ===== normal : rendu conservé (barre fine accent) ===== */
  .track {
    border-radius: var(--chip-radius);
    background: var(--row-border);
    overflow: hidden;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    height: 100%;
    border-radius: var(--chip-radius);
    background: var(--accent);
  }

  /* ===== overloaded (v > max) : remplissage plein + bandes + onde, rien ne sort du rail ===== */
  .gauge--overloaded .fill {
    width: 100% !important;
    background: linear-gradient(90deg, var(--accent), var(--accent-text));
    box-shadow: var(--year-shadow);
  }
  .bands {
    position: absolute;
    inset: 0;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 80%, transparent 100%);
    mask-image: linear-gradient(90deg, #000 0%, #000 80%, transparent 100%);
  }
  .bands::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -40px;
    right: -40px;
    background: repeating-linear-gradient(
      115deg,
      color-mix(in srgb, #fff 30%, transparent) 0 10px,
      transparent 10px 30px
    );
    animation: gauge-bands var(--g-band-speed) linear infinite;
  }
  .wave {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 45%;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, #fff 55%, transparent),
      transparent
    );
    animation: gauge-wave var(--g-wave-speed) ease-in-out infinite;
  }
  @keyframes gauge-bands {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(30px);
    }
  }
  @keyframes gauge-wave {
    0% {
      transform: translateX(-60%);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    100% {
      transform: translateX(120%);
      opacity: 0;
    }
  }

  /* ===== broken (v < 0) : rail rompu en deux tronçons, aucun remplissage, statique ===== */
  .break {
    /* même hauteur de « body » que le rail : pas de saut de ligne. */
    overflow: visible;
  }
  .piece {
    position: absolute;
    height: var(--g-h);
    background: var(--bg);
    border: 1px solid var(--border);
  }
  .piece--left {
    left: 0;
    top: -1px;
    width: 46%;
    border-right: none;
    border-radius: 999px 2px 2px 999px;
    transform: rotate(-1.4deg);
    clip-path: polygon(0 0, 96% 0, 100% 22%, 93% 46%, 100% 70%, 95% 100%, 0 100%);
  }
  .piece--right {
    right: 0;
    top: 2px;
    width: 50%;
    border-left: none;
    border-radius: 2px 999px 999px 2px;
    transform: rotate(1.1deg);
    clip-path: polygon(5% 0, 100% 0, 100% 100%, 4% 100%, 8% 72%, 2% 48%, 7% 24%);
  }

  /* ===== valeur numérique (toujours affichée, jamais clampée) ===== */
  .mval {
    flex: none;
    width: 58px;
    text-align: right;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--accent-text);
  }
  .mval.over {
    color: var(--accent-text);
    font-weight: 600;
  }
  .mval.broken {
    color: var(--danger);
    font-weight: 600;
  }
  .mval .slash {
    font-size: 11px;
    color: var(--fg-faint);
  }

  /* Accessibilité — mouvement réduit : l'overloaded reste distinguable (bandes statiques + couleur). */
  @media (prefers-reduced-motion: reduce) {
    .bands::before,
    .wave {
      animation: none;
    }
  }
</style>
