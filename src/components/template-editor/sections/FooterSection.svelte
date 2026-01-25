<script>
  export let config = {};

  $: content = config?.content || '';
  $: showPageNumber = config?.showPageNumber !== false;
  $: pageNumberFormat = config?.pageNumberFormat || 'Halaman {page} dari {total}';

  // Mock page numbers for preview
  $: pageDisplay = pageNumberFormat.replace('{page}', '1').replace('{total}', '1');
</script>

<div class="footer-section mt-8 pt-4 border-t border-gray-200">
  <div class="flex justify-between items-center text-xs text-gray-400">
    <div>
      {#if content}
        {content}
      {/if}
    </div>
    {#if showPageNumber}
      <div>{pageDisplay}</div>
    {/if}
  </div>
</div>
