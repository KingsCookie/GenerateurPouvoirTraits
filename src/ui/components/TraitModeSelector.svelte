<script lang="ts">
  import { traitMode, setTraitMode, isMobile, type TraitMode } from '../stores/ui.js';

  const MODES: { value: TraitMode; label: string; title: string }[] = [
    { value: 1, label: 'Mode 1', title: 'Pouvoirs seuls' },
    { value: 2, label: 'Mode 2', title: 'Pouvoirs + traits actifs' },
    { value: 3, label: 'Mode 3', title: 'Pouvoirs + traits actifs + inactifs + résilience' },
  ];
</script>

<div class="modes" class:mobile={$isMobile} role="group" aria-label="Mode d'affichage des traits">
  {#each MODES as m (m.value)}
    <button
      type="button"
      class="nav-item"
      class:is-active={$traitMode === m.value}
      title={m.title}
      aria-label={m.label}
      on:click={() => setTraitMode(m.value)}
    >
      {$isMobile ? m.value : m.label}
    </button>
  {/each}
</div>

<style>
  .modes {
    display: inline-flex;
    gap: 0.3rem;
  }
  .nav-item {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--fg-muted);
    border-radius: var(--chip-radius);
    padding: 5px 12px;
    font-size: 13px;
  }
  /* .is-active fourni par app.css (chip en A, aplat en B). */
  .modes.mobile .nav-item {
    min-height: 32px;
    padding: 0 12px;
    font-size: 12px;
  }
</style>
