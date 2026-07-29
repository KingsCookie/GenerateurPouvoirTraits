<script lang="ts">
  // Enveloppe modale de l'éditeur d'espèces & reproduction (Feature 012).
  // Même patron que CatalogueModal / SandboxPersonForm (overlay + backdrop, Échap, bouton Fermer).
  // La case « Autoriser la consanguinité » figure EN TÊTE de la modale (clarification 2026-07-29),
  // liée à `consanguinityAllowed` comme auparavant. SpeciesEditor est rendu INCHANGÉ (FR-010 / INV-7).
  import SpeciesEditor from './SpeciesEditor.svelte';
  import { parameters, setParam } from '../stores/appState.js';

  export let onClose: () => void = () => {};

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onClose();
  }
  function onConsang(e: Event): void {
    setParam('consanguinityAllowed', (e.target as HTMLInputElement).checked);
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- Fermeture par clic sur le fond ; le clavier ferme via Échap (svelte:window on:keydown). -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" on:click={onClose} role="presentation">
  <div
    class="modal"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Espèces & reproduction"
    on:click|stopPropagation
  >
    <div class="head">
      <h3>Espèces &amp; reproduction</h3>
      <button type="button" class="close" on:click={onClose} aria-label="Fermer">✕ Fermer</button>
    </div>

    <label class="check">
      <input type="checkbox" checked={$parameters.consanguinityAllowed} on:change={onConsang} />
      <span>
        Autoriser la consanguinité
        <span class="desc inline">
          (si décochée — défaut — l'appariement entre proches est interdit, §6.6.1)
        </span>
      </span>
    </label>

    <SpeciesEditor />
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 5vh 1rem;
    overflow-y: auto;
  }
  .modal {
    padding: 22px 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elev);
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    width: 100%;
    max-width: 860px;
    max-height: 86vh;
    overflow-y: auto;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  h3 {
    margin: 0;
    font-size: 16px;
  }
  .close {
    flex: none;
  }
  .check {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    color: var(--fg);
    font-size: 0.9rem;
    font-weight: 600;
  }
  .check input {
    margin-top: 0.15rem;
  }
  .desc {
    margin: 0;
    color: var(--fg-muted);
    font-size: 0.78rem;
    line-height: 1.3;
  }
  .desc.inline {
    display: block;
    font-weight: 400;
  }
</style>
