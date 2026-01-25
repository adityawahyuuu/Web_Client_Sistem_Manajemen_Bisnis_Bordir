<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from '../Modal.svelte';

  export let show = false;
  export let presets = [];

  const dispatch = createEventDispatcher();

  function selectPreset(preset) {
    dispatch('select', preset);
  }
</script>

<Modal bind:show title="Pilih Template Preset" size="lg">
  <div class="preset-modal">
    {#if presets.length > 0}
      <div class="grid grid-cols-2 gap-4">
        {#each presets as preset}
          <button
            class="preset-card p-4 border-2 border-gray-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-all"
            on:click={() => selectPreset(preset)}
          >
            <!-- Preview thumbnail -->
            <div class="aspect-[3/4] bg-gray-100 rounded mb-3 flex items-center justify-center overflow-hidden">
              {#if preset.thumbnail}
                <img src={preset.thumbnail} alt={preset.name} class="w-full h-full object-cover" />
              {:else}
                <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              {/if}
            </div>

            <h3 class="font-semibold text-gray-900">{preset.name}</h3>
            {#if preset.description}
              <p class="text-sm text-gray-500 mt-1 line-clamp-2">{preset.description}</p>
            {/if}

            {#if preset.tags?.length}
              <div class="flex flex-wrap gap-1 mt-2">
                {#each preset.tags as tag}
                  <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">{tag}</span>
                {/each}
              </div>
            {/if}
          </button>
        {/each}
      </div>
    {:else}
      <div class="text-center py-8 text-gray-500">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>Tidak ada preset template tersedia</p>
      </div>
    {/if}
  </div>

  <div class="flex justify-end mt-4 pt-4 border-t border-gray-200">
    <button
      class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
      on:click={() => show = false}
    >
      Batal
    </button>
  </div>
</Modal>

<style>
  .preset-card:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
