<script lang="ts">
  import { currentYear, advanceYears, advancing } from '../stores/appState.js';
  import { isMobile } from '../stores/ui.js';
  import Spinner from './Spinner.svelte';

  let years = 1;

  function onAdvance() {
    // Le store monte l'indicateur `advancing`, cède une frame (spinner peint), puis calcule (§R8).
    void advanceYears(years);
  }
  function dec() {
    if (years > 1) years -= 1;
  }
  function inc() {
    years += 1;
  }

  // Largeur extensible de la bulle « Avancer » (Feature 014) : grandit avec le nombre de caractères,
  // avec **une marge d'un caractère** pour que le chiffre qu'on vient de taper tienne immédiatement
  // (sinon la bulle a « un caractère de retard » et provoque un scroll horizontal). Min ~2, max borné :
  // le débordement (donc le scroll) n'arrive qu'une fois le maximum atteint.
  $: advChars = Math.min(6, Math.max(2, String(years ?? '').length)) + 1;
  // Mobile : stepper sans flèches natives, texte centré en mono → marge caret un peu plus large
  // pour ne pas rogner la fin du dernier chiffre.
  $: stepW = `calc(${advChars}ch + 16px)`;
  // Desktop : input numérique avec flèches natives → marge supplémentaire pour ne pas rogner.
  $: advW = `calc(${advChars}ch + 30px)`;
</script>

<div class="time-bar" class:mobile={$isMobile} role="region" aria-label="Avancement du temps">
  <div class="year-block">
    <span class="field-label">{$isMobile ? 'an' : 'Année courante'}</span>
    <span class="year-num">{$currentYear}</span>
  </div>
  {#if $isMobile}
    <div class="controls">
      <span class="spin-slot" aria-hidden={!$advancing}
        >{#if $advancing}<Spinner size={18} />{/if}</span
      >
      <div class="stepper">
        <button type="button" on:click={dec} disabled={years <= 1} aria-label="Diminuer">−</button>
        <input
          type="number"
          min="1"
          bind:value={years}
          style="width: {stepW}"
          aria-label="Nombre d'années à avancer"
        />
        <button type="button" on:click={inc} aria-label="Augmenter">+</button>
      </div>
      <button class="primary" type="button" on:click={onAdvance} disabled={years < 1 || $advancing}
        >Avancer</button
      >
    </div>
  {:else}
    <div class="controls">
      <span class="spin-slot" aria-hidden={!$advancing}
        >{#if $advancing}<Spinner size={20} />{/if}</span
      >
      <label class="field-label" for="years">Avancer de</label>
      <input id="years" type="number" min="1" bind:value={years} style="width: {advW}" />
      <span class="unit">an(s)</span>
      <button class="primary" type="button" on:click={onAdvance} disabled={years < 1 || $advancing}>
        Avancer
      </button>
    </div>
  {/if}
</div>

<style>
  .time-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 16px 20px;
    margin-bottom: 0.8rem;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .year-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .year-num {
    font-family: var(--mono);
    font-size: 32px;
    font-weight: 600;
    line-height: 1;
    color: var(--accent-text);
    text-shadow: var(--year-shadow);
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .controls input {
    width: 5rem;
  }
  /* Emplacement de largeur FIXE réservé au spinner (à gauche) : présent en permanence pour que le
     reste des contrôles (dont le bouton « Avancer ») ne se déplace jamais selon la visibilité. */
  .spin-slot {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
  }
  .unit {
    color: var(--fg-muted);
    font-size: 0.85rem;
  }

  /* ===== Barre de temps compacte (mobile, Feature 013) ===== */
  .time-bar.mobile {
    padding: 8px 12px;
    margin-bottom: 0;
    background: var(--tint-bg);
    border: none;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    gap: 10px;
    flex-wrap: nowrap;
  }
  .time-bar.mobile .year-block {
    flex-direction: row;
    align-items: baseline;
    gap: 6px;
  }
  .time-bar.mobile .year-num {
    font-size: 22px;
  }
  .time-bar.mobile .controls {
    flex-wrap: nowrap;
    gap: 8px;
  }
  .stepper {
    display: flex;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    overflow: hidden;
  }
  .stepper button {
    width: 34px;
    height: 34px;
    padding: 0;
    border: none;
    background: transparent;
    font-size: 18px;
    line-height: 1;
  }
  .stepper input {
    width: 36px;
    text-align: center;
    border: none;
    background: transparent;
    font-family: var(--mono);
    font-size: 14px;
    /* masque les flèches natives pour laisser le stepper piloter */
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .stepper input::-webkit-outer-spin-button,
  .stepper input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .time-bar.mobile .primary {
    min-height: 34px;
    padding: 6px 14px;
    font-size: 14px;
  }
</style>
