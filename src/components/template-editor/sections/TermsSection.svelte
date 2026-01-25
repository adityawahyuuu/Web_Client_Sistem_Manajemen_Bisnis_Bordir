<script>
  export let config = {};

  $: title = config?.title || 'Syarat & Ketentuan';
  $: content = config?.content || '';
</script>

<div class="terms-section my-6">
  <h3 class="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
  <div class="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">
    {#if content}
      {content}
    {:else}
      <span class="text-gray-400 italic">Tidak ada syarat & ketentuan</span>
    {/if}
  </div>
</div>
