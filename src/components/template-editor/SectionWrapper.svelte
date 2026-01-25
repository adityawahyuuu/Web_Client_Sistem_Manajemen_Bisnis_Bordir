<script>
  import { createEventDispatcher } from 'svelte';
  import { selectSection } from '../../stores/templateEditor.js';

  export let sectionId = '';
  export let editable = false;
  export let selected = false;

  const dispatch = createEventDispatcher();

  function handleClick(e) {
    if (!editable) return;
    e.stopPropagation();
    selectSection(sectionId);
    dispatch('click');
  }

  function handleKeydown(e) {
    if (!editable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  class="section-wrapper relative"
  class:editable
  class:selected
  role={editable ? 'button' : undefined}
  tabindex={editable ? 0 : -1}
  on:click={handleClick}
  on:keydown={handleKeydown}
>
  <slot />

  {#if editable}
    <div class="section-label">
      {sectionId}
    </div>
  {/if}
</div>

<style>
  .section-wrapper {
    transition: all 0.15s ease;
  }

  .section-wrapper.editable {
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 4px;
    margin: -2px;
    padding: 2px;
  }

  .section-wrapper.editable:hover {
    border-color: #93c5fd;
    background-color: rgba(59, 130, 246, 0.02);
  }

  .section-wrapper.editable.selected {
    border-color: #2563eb;
    background-color: rgba(59, 130, 246, 0.05);
  }

  .section-label {
    position: absolute;
    top: -12px;
    left: 8px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background-color: #2563eb;
    color: white;
    border-radius: 3px;
    opacity: 0;
    transform: translateY(4px);
    transition: all 0.15s ease;
    pointer-events: none;
  }

  .section-wrapper.editable:hover .section-label,
  .section-wrapper.editable.selected .section-label {
    opacity: 1;
    transform: translateY(0);
  }
</style>
