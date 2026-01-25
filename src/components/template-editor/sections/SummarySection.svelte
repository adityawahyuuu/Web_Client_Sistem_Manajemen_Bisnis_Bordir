<script>
  export let config = {};
  export let summary = {};
  // eslint-disable-next-line no-unused-vars
  export let styles = {}; // Reserved for future styling options

  $: fields = (config?.fields || []).filter(f => f.enabled !== false);
  $: position = config?.position || 'right';

  function formatValue(field, value) {
    if (value === null || value === undefined) return '-';

    if (field.format === 'currency') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(value);
    }

    if (field.format === 'percentage') {
      return `${value}%`;
    }

    return value;
  }
</script>

<div class="summary-section my-6" class:justify-end={position === 'right'} class:justify-start={position === 'left'}>
  <div class="summary-table w-72">
    {#each fields as field, i}
      <div
        class="flex justify-between py-2 px-3"
        class:highlight={field.highlight}
        class:border-t={i > 0}
      >
        <span class="text-sm" class:font-semibold={field.highlight}>{field.label}</span>
        <span class="text-sm font-medium" class:text-lg={field.highlight} class:primary-text={field.highlight}>
          {formatValue(field, summary[field.key])}
        </span>
      </div>
    {/each}
  </div>
</div>

<style>
  .summary-section {
    display: flex;
  }

  .summary-table {
    background-color: #f9fafb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .border-t {
    border-top: 1px solid #e5e7eb;
  }

  .highlight {
    background-color: var(--primary-color, #2563eb);
    color: white;
  }

  .highlight span {
    color: white !important;
  }
</style>
