<script lang="ts">
  import { TRAIT_TYPES, type TraitType } from '../../core/index.js';
  import {
    catalog,
    parameters,
    catAddTrait,
    catRenameTrait,
    catRemoveTrait,
    catSetTraitWeight,
    catPropagateTypeWeight,
    setParam,
  } from '../stores/appState.js';

  // Libellés lisibles des 6 types fixes.
  const TYPE_LABELS: Record<TraitType, string> = {
    Remplacement: 'Remplacement',
    PartieCorps: 'Partie du corps',
    Etat: 'État',
    Element: 'Élément',
    Ajout: 'Ajout',
    Action: 'Action',
  };

  // Sélecteur de type (BUG-001) : on n'affiche que le type sélectionné (défaut « Action »).
  // Options triées alphabétiquement par libellé. L'ordre `TRAIT_TYPES` du cœur (sérialisation
  // déterministe) reste INCHANGÉ : ce tri est purement un ordre d'affichage de l'UI.
  const sortedTypes: TraitType[] = [...TRAIT_TYPES].sort((a, b) =>
    TYPE_LABELS[a].localeCompare(TYPE_LABELS[b], 'fr'),
  );
  let selectedType: TraitType = 'Action';

  // Saisie d'ajout par type (réinitialisée après ajout).
  const draft: Record<string, string> = {};

  function addTrait(type: TraitType) {
    const label = (draft[type] ?? '').trim();
    if (!label) return;
    catAddTrait(type, label);
    draft[type] = '';
  }

  function onRename(traitId: string, e: Event) {
    catRenameTrait(traitId, (e.target as HTMLInputElement).value);
  }

  function onTraitWeight(traitId: string, e: Event) {
    const raw = (e.target as HTMLInputElement).value.trim();
    if (raw === '') {
      catSetTraitWeight(traitId, null); // vide ⇒ hérite du poids du type
      return;
    }
    const v = Number(raw);
    catSetTraitWeight(traitId, Number.isFinite(v) ? Math.max(0, v) : 0);
  }

  function onTypeWeight(type: TraitType, e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    setParam('traitTypeWeights', {
      ...$parameters.traitTypeWeights,
      [type]: Number.isFinite(v) ? Math.max(0, v) : 0,
    });
  }
</script>

<div class="catalog-editor">
  <p class="hint">
    Le <strong>poids d'un type</strong> est le poids par défaut de tous ses traits. Un trait peut le
    <strong>surcharger</strong>
    (champ « poids » ; laissez vide pour hériter du type). «&nbsp;Propager&nbsp;» efface les surcharges
    du type. Un type à <strong>poids 0</strong> n'est jamais tiré : un pouvoir qui en aurait besoin n'est
    pas produit (les traits déjà tirés restent actifs).
  </p>

  <label class="type-picker">
    Type de trait
    <select bind:value={selectedType}>
      {#each sortedTypes as type (type)}
        <option value={type}>{TYPE_LABELS[type]} ({$catalog.byType[type].length})</option>
      {/each}
    </select>
  </label>

  <div class="type">
    <div class="type-head">
      <label class="type-weight">
        Poids du type
        <input
          type="number"
          min="0"
          step="0.1"
          value={$parameters.traitTypeWeights[selectedType]}
          on:input={(e) => onTypeWeight(selectedType, e)}
        />
      </label>
      <button
        type="button"
        class="propagate"
        title="Réinitialiser les poids surchargés des traits de ce type"
        on:click={() => catPropagateTypeWeight(selectedType)}
      >
        Propager
      </button>
    </div>

    <ul class="traits">
      {#each $catalog.byType[selectedType] as trait (trait.id)}
        <li>
          <input
            class="label"
            type="text"
            value={trait.label}
            on:change={(e) => onRename(trait.id, e)}
          />
          <input
            class="weight"
            type="number"
            min="0"
            step="0.1"
            placeholder={`${$parameters.traitTypeWeights[selectedType]}`}
            value={trait.weight ?? ''}
            on:input={(e) => onTraitWeight(trait.id, e)}
            title="Poids (surcharge). Vide = hérite du poids du type."
          />
          <button
            type="button"
            class="del"
            title="Supprimer (n'affecte que les tirages futurs)"
            on:click={() => catRemoveTrait(trait.id)}>✕</button
          >
        </li>
      {/each}
    </ul>

    <div class="add">
      <input
        type="text"
        placeholder="Nouveau trait…"
        bind:value={draft[selectedType]}
        on:keydown={(e) => e.key === 'Enter' && addTrait(selectedType)}
      />
      <button type="button" on:click={() => addTrait(selectedType)}>+ Ajouter</button>
    </div>
  </div>
</div>

<style>
  .catalog-editor {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .hint {
    margin: 0;
    color: var(--fg-muted);
    font-size: 0.8rem;
    line-height: 1.4;
  }
  .type-picker {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--fg);
  }
  .type-picker select {
    font-size: 0.9rem;
    padding: 0.3rem 0.4rem;
  }
  .type {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.4rem 0.7rem 0.7rem;
  }
  .type-head {
    display: flex;
    align-items: end;
    gap: 0.6rem;
    margin: 0.5rem 0;
  }
  .type-weight {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.78rem;
    color: var(--fg-muted);
  }
  .type-weight input {
    width: 6rem;
  }
  .propagate {
    font-size: 0.8rem;
  }
  .traits {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .traits li {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
  .label {
    flex: 1;
    min-width: 6rem;
  }
  .weight {
    width: 5rem;
  }
  .del {
    color: var(--danger, #c0392b);
    border-color: var(--border);
    padding: 0 0.5rem;
  }
  .add {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.5rem;
  }
  .add input {
    flex: 1;
  }
</style>
