<script>
  export let config = {};

  $: title = config?.title || 'Catatan';
  $: content = config?.content || '';
</script>

<div class="notes-section my-6">
  <h3 class="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
  <div class="p-3 bg-yellow-50 border border-yellow-100 rounded text-sm text-gray-600 whitespace-pre-wrap">
    {#if content}
      {content}
    {:else}
      <span class="text-gray-400 italic">Tidak ada catatan</span>
    {/if}
  </div>
</div>
