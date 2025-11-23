<script>
  export let columns = [];
  export let data = [];
  export let emptyMessage = 'Tidak ada data';
</script>

<div class="overflow-x-auto">
  <table class="min-w-full divide-y divide-gray-200">
    <thead>
      <tr>
        {#each columns as column}
          <th class="px-6 py-3 table-header">
            {column.label}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      {#if data.length === 0}
        <tr>
          <td colspan={columns.length} class="px-6 py-8 text-center text-gray-500">
            {emptyMessage}
          </td>
        </tr>
      {:else}
        {#each data as row}
          <tr class="hover:bg-gray-50">
            {#each columns as column}
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {#if column.render}
                  {@html column.render(row)}
                {:else}
                  {row[column.key] || '-'}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
