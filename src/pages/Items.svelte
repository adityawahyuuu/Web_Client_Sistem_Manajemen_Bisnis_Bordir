<script>
  import { onMount } from 'svelte';
  import { items, itemsLoading, loadItems, createItem, updateItem, deleteItem } from '../stores/items.js';
  import { selectedCompany } from '../stores/company.js';
  import { success, error as showError } from '../stores/notifications.js';
  import Modal from '../components/Modal.svelte';

  onMount(() => {
    if ($selectedCompany?.id) {
      loadItems();
    }
  });

  // Reload when company changes
  $: if ($selectedCompany?.id) {
    loadItems();
  }

  let showModal = false;
  let editingItem = null;
  let searchTerm = '';

  let form = {
    name: '',
    description: '',
    unit: 'pcs',
    unit_price: 0,
    sku: '',
    category: ''
  };

  const unitOptions = [
    { value: 'pcs', label: 'Pcs (Pieces)' },
    { value: 'unit', label: 'Unit' },
    { value: 'box', label: 'Box' },
    { value: 'dozen', label: 'Lusin' },
    { value: 'kg', label: 'Kilogram' },
    { value: 'm', label: 'Meter' },
    { value: 'roll', label: 'Roll' },
    { value: 'pack', label: 'Pack' },
    { value: 'set', label: 'Set' }
  ];

  $: filteredItems = $items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openModal(item = null) {
    editingItem = item;
    if (item) {
      form = {
        name: item.name,
        description: item.description || '',
        unit: item.unit || 'pcs',
        unit_price: item.unit_price || 0,
        sku: item.sku || '',
        category: item.category || ''
      };
    } else {
      form = {
        name: '',
        description: '',
        unit: 'pcs',
        unit_price: 0,
        sku: '',
        category: ''
      };
    }
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingItem = null;
  }

  function buildItemPayload(form) {
    return {
      item_code: form.sku,        // WAJIB
      item_name: form.name,       // WAJIB
      description: form.description || '',
      unit: form.unit || 'pcs',
      unit_price: Number(form.unit_price) || 0,
      category: form.category || ''
    };
  }

  async function handleSubmit() {
    if (!$selectedCompany?.id) return;

    if (!form.name || !form.sku) {
      alert('Nama Item dan SKU wajib diisi');
      return;
    }

    const mappingPayload = buildItemPayload(form);
    const payload = mappingPayload;
    
    try {
      if (editingItem) {
        await updateItem(editingItem.id, payload);
      } else {
        await createItem(payload);
      }

      closeModal();
      await loadItems();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id) {
    if (confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      try {
        await deleteItem(id);
      } catch (err) {
        // Error notification already handled by service
      }
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }
</script>

<div>
  <div class="flex justify-between items-center mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Daftar Item</h1>
      <p class="text-sm text-gray-500 mt-1">
        {#if $selectedCompany}
          Perusahaan: {$selectedCompany.name}
        {:else}
          Pilih perusahaan terlebih dahulu
        {/if}
      </p>
    </div>
    <button
      class="btn-primary"
      on:click={() => openModal()}
      disabled={!$selectedCompany?.id}
    >
      + Tambah Item
    </button>
  </div>

  {#if !$selectedCompany?.id}
    <div class="card text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Pilih Perusahaan</h3>
      <p class="text-gray-500">Silakan pilih perusahaan dari dropdown di sidebar untuk melihat daftar item.</p>
    </div>
  {:else}
    <div class="card mb-6">
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Cari item berdasarkan nama, SKU, atau kategori..."
        class="input-field"
      />
    </div>

    <div class="card">
      {#if $itemsLoading}
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p class="text-gray-500 mt-2">Memuat data...</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 table-header">Nama Item</th>
                <th class="px-6 py-3 table-header">SKU</th>
                <th class="px-6 py-3 table-header">Kategori</th>
                <th class="px-6 py-3 table-header">Satuan</th>
                <th class="px-6 py-3 table-header text-right">Harga</th>
                <th class="px-6 py-3 table-header">Aksi</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#if filteredItems.length === 0}
                <tr>
                  <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'Tidak ada item yang cocok dengan pencarian' : 'Belum ada data item'}
                  </td>
                </tr>
              {:else}
                {#each filteredItems as item}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{item.name}</div>
                        {#if item.description}
                          <div class="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                        {/if}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sku || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {#if item.category}
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.category}
                        </span>
                      {:else}
                        <span class="text-gray-400">-</span>
                      {/if}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.unit || 'pcs'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        on:click={() => openModal(item)}
                        class="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        on:click={() => handleDelete(item.id)}
                        class="text-red-600 hover:text-red-800"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<Modal bind:show={showModal} title={editingItem ? 'Edit Item' : 'Tambah Item'} size="lg">
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">Nama Item *</label>
        <input type="text" bind:value={form.name} class="input-field" placeholder="Contoh: Bordir Logo A" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">SKU</label>
        <input type="text" bind:value={form.sku} class="input-field" placeholder="Contoh: BRD-001" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
        <input type="text" bind:value={form.category} class="input-field" placeholder="Contoh: Bordir, Jahit, dll" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
        <select bind:value={form.unit} class="input-field">
          {#each unitOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Harga Satuan (Rp)</label>
        <input
          type="number"
          bind:value={form.unit_price}
          class="input-field"
          min="0"
          step="100"
          placeholder="0"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
      <textarea
        bind:value={form.description}
        class="input-field"
        rows="3"
        placeholder="Deskripsi tambahan untuk item ini..."
      ></textarea>
    </div>

    <div class="flex justify-end gap-3 pt-4">
      <button type="button" class="btn-secondary" on:click={closeModal}>Batal</button>
      <button type="submit" class="btn-primary" disabled={$itemsLoading}>
        {#if $itemsLoading}
          <span class="inline-block animate-spin mr-2">⏳</span>
        {/if}
        Simpan
      </button>
    </div>
  </form>
</Modal>
