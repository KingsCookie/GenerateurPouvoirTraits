<script lang="ts">
  // Enveloppe modale de l'éditeur de catalogues de traits (Feature 012).
  // Réutilise le patron d'accessibilité de SandboxPersonForm (overlay + backdrop cliquable,
  // fermeture Échap, bouton « Fermer »). Le contenu (TraitCatalogEditor) est rendu INCHANGÉ :
  // toutes ses fonctions restent disponibles (FR-010 / INV-7).
  import TraitCatalogEditor from './TraitCatalogEditor.svelte';

  export let onClose: () => void = () => {};

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onClose();
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
    aria-label="Catalogues de traits"
    on:click|stopPropagation
  >
    <div class="head">
      <h3>Catalogues de traits</h3>
      <button type="button" class="close" on:click={onClose} aria-label="Fermer">✕ Fermer</button>
    </div>
    <TraitCatalogEditor />
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
  /* Plein écran sous 760 px (Feature 013). */
  @media (max-width: 760px) {
    .overlay {
      align-items: stretch;
      padding: 0;
    }
    .modal {
      max-width: none;
      max-height: 100dvh;
      height: 100dvh;
      border: none;
      border-radius: 0;
      padding: 12px;
    }
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
</style>
