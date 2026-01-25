<script>
  import { createEventDispatcher } from 'svelte';

  export let canUndo = false;
  export let canRedo = false;
  export let isDirty = false;
  export let isSaving = false;

  const dispatch = createEventDispatcher();
</script>

<div class="template-toolbar flex items-center gap-2 p-2 bg-white border-b border-gray-200">
  <div class="flex items-center gap-1">
    <button
      class="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={!canUndo}
      on:click={() => dispatch('undo')}
      title="Undo (Ctrl+Z)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    </button>

    <button
      class="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={!canRedo}
      on:click={() => dispatch('redo')}
      title="Redo (Ctrl+Shift+Z)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
      </svg>
    </button>
  </div>

  <div class="w-px h-6 bg-gray-200"></div>

  <div class="flex items-center gap-2 ml-auto">
    {#if isSaving}
      <span class="text-xs text-gray-400 flex items-center gap-1">
        <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Menyimpan...
      </span>
    {:else if isDirty}
      <span class="text-xs text-orange-500">Belum disimpan</span>
    {:else}
      <span class="text-xs text-green-500">Tersimpan</span>
    {/if}
  </div>
</div>
