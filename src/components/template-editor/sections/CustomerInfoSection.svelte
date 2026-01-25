<script>
  export let config = {};
  export let customer = {};

  $: title = config?.title || 'Kepada:';
  $: fields = (config?.fields || []).filter(f => f.enabled !== false);
</script>

<div class="customer-info-section my-6 p-4 bg-gray-50 rounded-lg">
  <div class="text-sm font-medium text-gray-500 mb-2">{title}</div>
  <div class="space-y-1">
    {#each fields as field}
      {#if customer[field.key]}
        {#if field.key === 'name'}
          <div class="font-semibold text-gray-900 text-lg">{customer[field.key]}</div>
        {:else}
          <div class="text-sm text-gray-600">{customer[field.key]}</div>
        {/if}
      {/if}
    {/each}
  </div>
</div>
