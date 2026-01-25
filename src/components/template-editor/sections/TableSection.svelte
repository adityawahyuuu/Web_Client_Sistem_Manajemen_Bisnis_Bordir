<script>
  export let config = {};
  export let items = [];
  export let styles = {};

  $: columns = (config?.columns || []).filter(c => c.enabled !== false);
  $: showHeader = config?.showHeader !== false;
  $: showBorders = config?.showBorders !== false;
  $: stripedRows = config?.stripedRows !== false;

  function formatValue(column, value) {
    if (value === null || value === undefined) return '-';

    if (column.format === 'currency') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(value);
    }

    if (column.format === 'number') {
      return new Intl.NumberFormat('id-ID').format(value);
    }

    return value;
  }

  function getAlignClass(align) {
    return {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    }[align] || 'text-left';
  }
</script>

<div class="table-section my-6 overflow-x-auto">
  <table class="w-full" class:bordered={showBorders}>
    {#if showHeader}
      <thead>
        <tr class="primary-bg text-white">
          {#each columns as column}
            <th
              class="px-3 py-2 text-sm font-semibold {getAlignClass(column.align)}"
              style="width: {column.width || 'auto'}"
            >
              {column.label}
            </th>
          {/each}
        </tr>
      </thead>
    {/if}
    <tbody>
      {#each items as item, i}
        <tr class:striped={stripedRows && i % 2 === 1}>
          {#each columns as column}
            <td class="px-3 py-2 text-sm {getAlignClass(column.align)}">
              {formatValue(column, item[column.key])}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  table {
    border-collapse: collapse;
  }

  table.bordered {
    border: 1px solid #e5e7eb;
  }

  table.bordered th,
  table.bordered td {
    border: 1px solid #e5e7eb;
  }

  tbody tr {
    border-bottom: 1px solid #f3f4f6;
  }

  tbody tr:last-child {
    border-bottom: none;
  }

  tbody tr.striped {
    background-color: #f9fafb;
  }

  tbody tr:hover {
    background-color: #f3f4f6;
  }
</style>
