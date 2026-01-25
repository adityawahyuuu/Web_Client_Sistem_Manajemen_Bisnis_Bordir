<script>
  export let config = {};

  $: title = config?.title || 'Informasi Pembayaran';
  $: accounts = (config?.accounts || []).filter(a => a.enabled !== false);
</script>

<div class="bank-info-section my-6">
  <h3 class="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
  {#if accounts.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each accounts as account}
        <div class="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div class="text-xs text-gray-500 mb-1">{account.bankName || 'Bank'}</div>
          <div class="font-mono text-sm font-medium text-gray-900">{account.accountNumber || '-'}</div>
          <div class="text-sm text-gray-600">{account.accountName || '-'}</div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-sm text-gray-400 italic">Tidak ada informasi bank</div>
  {/if}
</div>
