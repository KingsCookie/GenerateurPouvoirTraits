<script lang="ts">
  // Feuille plein écran mobile réutilisable (Feature 013). Patron d'accessibilité repris de
  // SandboxPersonForm : overlay + backdrop cliquable, fermeture Échap, bouton ✕, focus piégé et
  // rendu au déclencheur. Entrée par translation ~200 ms (neutralisée par prefers-reduced-motion,
  // règle globale app.css). Purement présentationnel ; aucun état persisté.
  import { onMount, onDestroy } from 'svelte';

  export let title = '';
  export let onClose: () => void = () => {};

  let panel: HTMLDivElement;
  let previouslyFocused: HTMLElement | null = null;

  function focusables(): HTMLElement[] {
    if (!panel) return [];
    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  onMount(() => {
    previouslyFocused = document.activeElement as HTMLElement | null;
    // Focus initial sur la feuille (le premier focusable, sinon le panneau).
    queueMicrotask(() => {
      const items = focusables();
      (items[0] ?? panel)?.focus();
    });
  });
  onDestroy(() => {
    previouslyFocused?.focus?.();
  });
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="sheet-overlay" on:click={onClose} role="presentation">
  <div
    class="sheet"
    bind:this={panel}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label={title}
    on:click|stopPropagation
  >
    <div class="sheet-head">
      <h2>{title}</h2>
      <slot name="head-actions" />
      <button type="button" class="sheet-close" on:click={onClose} aria-label="Fermer">✕</button>
    </div>
    <div class="sheet-body">
      <slot />
    </div>
    {#if $$slots.footer}
      <div class="sheet-footer">
        <slot name="footer" />
      </div>
    {/if}
  </div>
</div>

<style>
  .sheet-overlay {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: stretch;
    justify-content: center;
  }
  .sheet {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 640px;
    background: var(--bg);
    animation: sheet-in 200ms ease-out;
    max-height: 100dvh;
  }
  /* Plein écran sous 760 px (mobile) ; centrée en carte au-dessus. */
  @media (min-width: 761px) {
    .sheet-overlay {
      align-items: flex-start;
      padding: 5vh 1rem;
    }
    .sheet {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      max-height: 86vh;
    }
  }
  @keyframes sheet-in {
    from {
      transform: translateY(16px);
      opacity: 0.6;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  .sheet-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-bottom: 1px solid var(--border);
  }
  .sheet-head h2 {
    flex: 1;
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sheet-close {
    flex: none;
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elev);
    color: var(--accent-text);
  }
  .sheet-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .sheet-footer {
    padding: 12px;
    border-top: 1px solid var(--border);
    background: var(--bg);
  }
</style>
