<script>
  export let config = {};
  export let document = {};

  $: fields = (config?.fields || []).filter(f => f.enabled !== false);
  $: layout = config?.layout || 'horizontal';

  function formatValue(field, value) {
    if (!value) return '-';
    if (field.format === 'currency') {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
    }
    return value;
  }
</script>

<div class="document-info-section my-6">
  {#if layout === 'horizontal'}
    <div class="flex flex-wrap gap-6">
      {#each fields as field}
        <div class="flex-shrink-0">
          <div class="text-xs text-gray-500 uppercase tracking-wide">{field.label}</div>
          <div class="font-medium text-gray-900">{formatValue(field, document[field.key])}</div>
        </div>
      {/each}
    </div>
  {:else if layout === 'vertical'}
    <div class="space-y-2">
      {#each fields as field}
        <div class="flex">
          <div class="w-32 text-sm text-gray-500">{field.label}:</div>
          <div class="font-medium text-gray-900">{formatValue(field, document[field.key])}</div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Grid layout -->
    <div class="grid grid-cols-2 gap-4">
      {#each fields as field}
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">{field.label}</div>
          <div class="font-medium text-gray-900">{formatValue(field, document[field.key])}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>
