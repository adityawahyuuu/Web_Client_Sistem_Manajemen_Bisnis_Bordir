<script>
  export let config = {};

  $: layout = config?.layout || 'double';
  $: fields = (config?.fields || []).filter(f => f.enabled !== false);

  function getGridCols() {
    if (layout === 'single') return 'grid-cols-1 max-w-xs mx-auto';
    if (layout === 'triple') return 'grid-cols-3';
    return 'grid-cols-2';
  }
</script>

<div class="signature-section my-8">
  <div class="grid gap-8 {getGridCols()}">
    {#each fields as field}
      <div class="text-center">
        <div class="text-sm text-gray-600 mb-16">{field.label}</div>
        {#if field.showLine !== false}
          <div class="border-b border-gray-400 mb-2"></div>
        {/if}
        {#if field.showDate}
          <div class="text-xs text-gray-400">Tanggal: ____________</div>
        {/if}
      </div>
    {/each}
  </div>
</div>
