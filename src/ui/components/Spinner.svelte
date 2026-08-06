<script lang="ts">
  // Indicateur de chargement réutilisable (Feature 015, US5) : une flèche circulaire qui tourne.
  // Couleur via token `--accent`. La rotation est coupée par `prefers-reduced-motion` (INV-L3).
  export let size = 20; // diamètre en px
  export let label = 'Calcul en cours…';
</script>

<span
  class="spinner"
  role="status"
  aria-live="polite"
  aria-label={label}
  style={`--spinner-size:${size}px`}
>
  <!-- La rotation est portée par ce **span HTML** (et non le <svg>) : Chrome ne composite pas les
       animations `transform` sur un élément SVG, mais le fait sur un élément HTML. L'animation
       tourne alors sur le thread du compositeur et continue même quand le thread principal est
       bloqué par le calcul synchrone d'« avancer » (§R8). -->
  <span class="rot">
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <!-- Arc ouvert (≈ 300°) + pointe de flèche pour évoquer une flèche circulaire. -->
      <path
        d="M12 3 a9 9 0 1 1 -6.36 2.64"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
      />
      <path d="M12 0.5 L12 5.5 L15.5 3 Z" fill="currentColor" />
    </svg>
  </span>
</span>

<style>
  .spinner {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    width: var(--spinner-size, 20px);
    height: var(--spinner-size, 20px);
  }
  .rot {
    display: inline-flex;
    transform-origin: 50% 50%;
    animation: spin 0.9s linear infinite;
    /* Promotion sur une couche GPU dédiée ⇒ animation composited (thread du compositeur). */
    will-change: transform;
    backface-visibility: hidden;
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .rot {
      animation: none;
    }
  }
</style>
