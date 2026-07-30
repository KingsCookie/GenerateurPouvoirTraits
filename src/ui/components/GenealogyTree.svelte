<script lang="ts">
  import { onMount } from 'svelte';
  import type { TreeNode } from '../../core/index.js';
  import { layoutTree, CARD_W, CARD_H } from '../lib/treeLayout.js';

  export let node: TreeNode;
  /** Affiche l'âge dans les cases (page dédiée) ; masqué sur la fiche (FR-003b). */
  export let showAge = false;
  /** Clic (sans glisser) sur une case : ouverture de fiche (fiche) ou recentrage (page dédiée). */
  export let onSelect: (id: string) => void = () => {};
  /** Échelle courante (bindable) — permet à la page dédiée d'afficher le % (FR-002d). */
  export let scale = 1;

  // Disposition calculée (cartes, ⚭, liens) — déterministe, connecteurs SVG alignés (BUG-004).
  $: layout = layoutTree(node, showAge);

  // --- Viewport pan/zoom (FR-002b/FR-002d) ---
  const THRESHOLD = 5; // px : en deçà = clic ; au-delà = pan
  const MIN_SCALE = 0.2;
  const MAX_SCALE = 4;
  let tx = 0;
  let ty = 0;
  let viewportEl: HTMLDivElement;
  const pointers = new Map<number, { x: number; y: number }>();
  let panId: number | null = null;
  let startX = 0;
  let startY = 0;
  let baseTx = 0;
  let baseTy = 0;
  let panActive = false;
  let didPan = false;
  let pinching = false;
  let pinchDist0 = 0;
  let scale0 = 1;

  const clamp = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

  // Recentre la case racine au centre du viewport (⟳ et ouverture — FR-002d).
  function centerOnRoot() {
    if (!viewportEl) return;
    scale = 1;
    tx = viewportEl.clientWidth / 2 - layout.rootCenter.x;
    ty = viewportEl.clientHeight / 2 - layout.rootCenter.y;
  }
  onMount(centerOnRoot);

  function pinchDistance(): number {
    const pts = [...pointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  /** Zoom borné centré sur (cx, cy) exprimés dans le repère du viewport. */
  function zoomAt(factor: number, cx: number, cy: number) {
    const ns = clamp(scale * factor);
    if (ns === scale) return;
    tx = cx - (cx - tx) * (ns / scale);
    ty = cy - (cy - ty) * (ns / scale);
    scale = ns;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    // Zoom centré sur le CURSEUR (le point sous la souris reste stable — FR-002b).
    const rect = viewportEl.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - rect.left, e.clientY - rect.top);
  }

  // --- API exposée (page dédiée : boutons − / % / + / recentrer) ---
  export function zoomIn() {
    if (viewportEl) zoomAt(1.2, viewportEl.clientWidth / 2, viewportEl.clientHeight / 2);
  }
  export function zoomOut() {
    if (viewportEl) zoomAt(1 / 1.2, viewportEl.clientWidth / 2, viewportEl.clientHeight / 2);
  }
  export function recenter() {
    centerOnRoot();
  }

  function onPointerDown(e: PointerEvent) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      pinching = true;
      panActive = false;
      panId = null;
      pinchDist0 = pinchDistance();
      scale0 = scale;
    } else if (pointers.size === 1 && (e.pointerType !== 'mouse' || e.button === 0)) {
      panId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      baseTx = tx;
      baseTy = ty;
      panActive = false;
      didPan = false;
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinching && pointers.size >= 2) {
      const d = pinchDistance();
      if (pinchDist0 > 0) scale = clamp(scale0 * (d / pinchDist0));
      return;
    }
    if (panId === e.pointerId) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!panActive && Math.hypot(dx, dy) > THRESHOLD) {
        panActive = true;
        try {
          viewportEl.setPointerCapture(e.pointerId);
        } catch {
          /* capture indisponible */
        }
      }
      if (panActive) {
        tx = baseTx + dx;
        ty = baseTy + dy;
        didPan = true;
      }
    }
  }

  function onPointerUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (panId === e.pointerId) {
      if (panActive) {
        try {
          viewportEl.releasePointerCapture(e.pointerId);
        } catch {
          /* rien */
        }
      }
      panId = null;
      panActive = false;
    }
    if (pointers.size < 2) {
      pinching = false;
      pinchDist0 = 0;
    }
  }

  // Après un glisser, neutralise le clic synthétique (pas de navigation involontaire).
  function onClickCapture(e: MouseEvent) {
    if (didPan) {
      e.preventDefault();
      e.stopPropagation();
      didPan = false;
    }
  }
</script>

<!-- Zone à interaction personnalisée (pan/zoom) ; navigation clavier via les boutons internes. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events -->
<div
  class="viewport"
  role="application"
  aria-label="Arbre généalogique interactif (zoom molette/pincement, déplacement par glisser)"
  bind:this={viewportEl}
  on:wheel={onWheel}
  on:pointerdown={onPointerDown}
  on:pointermove={onPointerMove}
  on:pointerup={onPointerUp}
  on:pointercancel={onPointerUp}
  on:click|capture={onClickCapture}
>
  <button type="button" class="reset" on:click={centerOnRoot} title="Recentrer sur la personne"
    >⟳</button
  >
  <div
    class="canvas"
    style="width:{layout.width}px;height:{layout.height}px;transform:translate({tx}px,{ty}px) scale({scale});"
  >
    <svg
      class="links"
      width={layout.width}
      height={layout.height}
      viewBox="0 0 {layout.width} {layout.height}"
    >
      {#each layout.links as lk (lk.key)}
        <polyline
          points={lk.points.map((p) => `${p.x},${p.y}`).join(' ')}
          class="link"
          class:ex={lk.ex}
        />
      {/each}
      {#each layout.marks as mk (mk.key)}
        <text x={mk.x} y={mk.y} class="mark" text-anchor="middle" dominant-baseline="central">
          {mk.ex ? '⚮' : '⚭'}
        </text>
      {/each}
    </svg>

    {#each layout.boxes as b (b.key)}
      <button
        type="button"
        class="card"
        class:root={b.isRoot}
        class:dashed={b.dashed}
        class:marriedin={b.marriedIn}
        class:dead={!b.vivant}
        style="left:{b.x}px;top:{b.y}px;width:{CARD_W}px;height:{CARD_H}px;"
        on:click={() => onSelect(b.refId)}
      >
        <strong class="nom">{b.vivant ? '' : '† '}{b.nom}</strong>
        {#each b.lines as line}
          <span class="line">{line}</span>
        {/each}
      </button>
    {/each}
  </div>
</div>

<style>
  .viewport {
    position: relative;
    width: 100%;
    height: clamp(18rem, 50vh, 34rem);
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elev);
    touch-action: none;
    cursor: grab;
    user-select: none;
  }
  /* Mobile (Feature 013) : viewport un peu plus haut (l'arbre n'apparaît qu'en page dédiée). */
  @media (max-width: 760px) {
    .viewport {
      height: clamp(20rem, 62vh, 34rem);
    }
  }
  .canvas {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    will-change: transform;
  }
  .links {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
    pointer-events: none;
  }
  .link {
    fill: none;
    stroke: var(--fg-muted);
    stroke-width: 2;
  }
  .link.ex {
    stroke-dasharray: 5 4;
  }
  .mark {
    fill: var(--fg-muted);
    font-size: 16px;
  }
  .reset {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    z-index: 2;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    line-height: 1;
    cursor: pointer;
  }
  .card {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    text-align: center;
    overflow: hidden;
    cursor: pointer;
  }
  .card:hover {
    border-color: var(--accent);
  }
  /* Racine (individu observé) : bordure accent 1.5px + fond chip (FR-003c, handoff). */
  .card.root {
    border-width: 1.5px;
    border-color: var(--accent);
    background: var(--chip-bg);
  }
  /* Conjoint « ex » / enfant d'ex / parent d'un couple « ex » : pointillés (FR-003c). */
  .card.dashed {
    border-style: dashed;
  }
  /* Conjoint « pièce rapportée » : fond grisé (BUG-005) — dimension « background ». */
  .card.marriedin {
    background: color-mix(in srgb, var(--fg-muted) 26%, var(--bg));
  }
  /* Décédé : couleur de bordure distincte + marqueur « † » (BUG-005) — dimension « border-color ».
     Cumulable avec ex (border-style), pièce rapportée (background) et racine. */
  .card.dead {
    border-style: dashed;
    opacity: 0.78;
    color: var(--fg-muted);
  }
  .card .nom {
    font-size: 0.85rem;
    line-height: 1.1;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .card .line {
    font-size: 0.7rem;
    color: var(--fg-muted);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
