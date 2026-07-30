<script lang="ts">
  import {
    treeRootId,
    treeDepth,
    setTreeDepth,
    recenterTree,
    arbreToFiche,
    population,
    currentYear,
    catalog,
  } from '../stores/appState.js';
  import { buildGenealogyTree } from '../../core/index.js';
  import GenealogyTree from '../components/GenealogyTree.svelte';
  import TreeLegend from '../components/TreeLegend.svelte';

  $: byId = new Map($population.map((p) => [p.id, p]));
  // Page dédiée : profondeur N réglable (≥ 1, sans plafond) ; cases nom + âge + pouvoirs (FR-003b).
  $: tree =
    $treeRootId != null
      ? buildGenealogyTree($treeRootId, byId, $treeDepth, {
          currentYear: $currentYear,
          catalog: $catalog,
        })
      : null;
  $: centre = $treeRootId != null ? (byId.get($treeRootId) ?? null) : null;

  // Référence au composant arbre pour piloter zoom/recentrage ; échelle liée pour l'affichage du %.
  let treeComp: GenealogyTree;
  let scale = 1;

  const QUICK_DEPTHS = [1, 2, 3, 4];
</script>

<section>
  <div class="controls">
    <button type="button" class="back contour" on:click={arbreToFiche}>← Retour à la fiche</button>

    <div class="ctrl-group" role="group" aria-label="Profondeur de l'arbre">
      <span class="field-label">Profondeur</span>
      <div class="segments">
        {#each QUICK_DEPTHS as d (d)}
          <button
            type="button"
            class="seg nav-item"
            class:is-active={$treeDepth === d}
            on:click={() => setTreeDepth(d)}>{d}</button
          >
        {/each}
        <input
          class="depth-n"
          type="number"
          min="1"
          step="1"
          aria-label="Profondeur personnalisée"
          value={$treeDepth}
          on:input={(e) => setTreeDepth(Number((e.target as HTMLInputElement).value))}
        />
      </div>
    </div>

    {#if tree}
      <div class="ctrl-group" role="group" aria-label="Zoom">
        <span class="field-label">Zoom</span>
        <div class="segments">
          <button
            type="button"
            class="seg"
            aria-label="Dézoomer"
            on:click={() => treeComp?.zoomOut()}>−</button
          >
          <span class="zoom-pct">{Math.round(scale * 100)} %</span>
          <button type="button" class="seg" aria-label="Zoomer" on:click={() => treeComp?.zoomIn()}
            >+</button
          >
          <button type="button" class="seg" on:click={() => treeComp?.recenter()}>Recentrer</button>
        </div>
      </div>
    {/if}
  </div>

  {#if !tree}
    <p class="muted">Aucun individu sélectionné pour l'arbre.</p>
  {:else}
    <div class="title-row">
      <h2>Arbre généalogique</h2>
      <span class="sub">centré sur {centre?.nom ?? tree.nom}</span>
    </div>
    <p class="muted hint">
      Cliquez une case pour recentrer l'arbre. Molette / pincement = zoom ; glisser = déplacement.
    </p>
    {#key $treeRootId}
      <GenealogyTree
        bind:this={treeComp}
        bind:scale
        node={tree}
        showAge={true}
        onSelect={recenterTree}
      />
    {/key}
    <TreeLegend />
  {/if}
</section>

<style>
  .controls {
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    gap: 1.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }
  .ctrl-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .segments {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }
  .seg {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--fg-muted);
    border-radius: var(--chip-radius);
    padding: 5px 11px;
    font-size: 13px;
    min-width: 32px;
  }
  /* .is-active fourni par app.css. */
  .depth-n {
    width: 4rem;
  }
  .zoom-pct {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--fg-muted);
    min-width: 3.2rem;
    text-align: center;
  }
  .title-row {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .title-row h2 {
    margin: 0;
    font-size: 17px;
  }
  .sub {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--fg-faint);
  }
  .hint {
    font-size: 0.78rem;
    margin: 0.2rem 0 0.5rem;
  }
  .muted {
    color: var(--fg-muted);
  }

  /* ===== Arbre mobile (Feature 013) : contrôles en 2 rangées de segments ===== */
  @media (max-width: 760px) {
    .controls {
      gap: 10px;
      padding: 10px 12px 0;
    }
    .ctrl-group {
      width: 100%;
    }
    .ctrl-group .segments {
      display: flex;
      width: 100%;
    }
    .ctrl-group .seg {
      flex: 1;
      min-height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .back {
      min-height: 40px;
    }
    .depth-n {
      flex: 1;
      min-height: 40px;
      width: auto;
    }
  }
</style>
