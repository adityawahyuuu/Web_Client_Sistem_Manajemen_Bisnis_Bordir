<script>
  import { confirmState } from '../stores/notifications.js';

  function answer(yes) {
    $confirmState?.resolve(yes);
    confirmState.set(null);
  }

  function handleKeydown(e) {
    if (!$confirmState) return;
    if (e.key === 'Escape') answer(false);
    if (e.key === 'Enter') answer(true);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $confirmState}
  <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
      <div class="flex flex-col items-center px-6 pt-6 pb-4 text-center">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
          <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <p class="text-sm text-gray-600 leading-relaxed">{$confirmState.message}</p>
      </div>
      <div class="flex border-t border-gray-100">
        <button type="button"
          on:click={() => answer(false)}
          class="flex-1 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100">
          Batal
        </button>
        <button type="button"
          on:click={() => answer(true)}
          class="flex-1 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
          Ya, Hapus
        </button>
      </div>
    </div>
  </div>
{/if}
