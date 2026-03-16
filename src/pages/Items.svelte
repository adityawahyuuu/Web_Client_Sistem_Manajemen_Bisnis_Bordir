<script>
  import { items, itemsLoading, loadItems, createItem, updateItem, deleteItem } from '../stores/items.js';
  import { selectedCompany } from '../stores/company.js';
  import { success, error as showError, confirmDialog } from '../stores/notifications.js';
  import * as XLSX from 'xlsx';
  import Modal from '../components/Modal.svelte';
  import CompanySelector from '../components/CompanySelector.svelte';
  import DataTable from '../components/DataTable.svelte';
  import SearchableSelect from '../components/SearchableSelect.svelte';
  import { sidebarOpen } from '../stores/ui.js';

  // ── Page state ─────────────────────────────────────────────────
  let searchTerm = '';
  let selectedIds = [];
  let showModal = false;
  let shakeModal = false;
  let editingItem = null;

  // ── Filter panel ───────────────────────────────────────────────
  let showFilterPanel = false;
  let filters = {
    hasCategory: false,
  };

  $: activeFilterCount = Object.values(filters).filter(Boolean).length;

  $: filteredItems = $items.filter(item => {
    if (filters.hasCategory && !item.category) return false;
    return true;
  });

  function clearFilters() {
    filters = { hasCategory: false };
  }

  // ── Form state ─────────────────────────────────────────────────
  let form = {
    name:        '',
    description: '',
    unit:        'pcs',
    unit_price:  0,
    category:    '',
    is_active:   true,
  };
  let priceDisplay = '';

  function formatPriceDisplay(val) {
    const num = Number(String(val).replace(/\D/g, '')) || 0;
    return num > 0 ? num.toLocaleString('id-ID') : '';
  }

  function handlePriceInput(e) {
    const raw = e.target.value.replace(/\D/g, '');
    form.unit_price = Number(raw) || 0;
    priceDisplay = raw ? Number(raw).toLocaleString('id-ID') : '';
    e.target.value = priceDisplay;
  }

  // ── Validation ─────────────────────────────────────────────────
  let touched = { name: false };
  $: nameValid = form.name.trim().length > 0;

  const unitOptions = [
    { value: 'pcs',   label: 'Pcs' },
    { value: 'unit',  label: 'Unit' },
    { value: 'box',   label: 'Box' },
    { value: 'dozen', label: 'Lusin' },
    { value: 'kg',    label: 'Kg' },
    { value: 'm',     label: 'Meter' },
    { value: 'roll',  label: 'Roll' },
    { value: 'pack',  label: 'Pack' },
    { value: 'set',   label: 'Set' },
  ];

  const tableColumns = [
    { key: 'name',        label: 'Nama' },
    { key: 'description', label: 'Deskripsi' },
    { key: 'unit_price',  label: 'Tarif' },
    { key: 'unit',        label: 'Satuan' },
  ];

  $: emptyText = !$selectedCompany?.id
    ? 'Pilih perusahaan terlebih dahulu'
    : 'Belum ada data item';

  // ── Company guard ──────────────────────────────────────────────
  let _loadedCompanyId = null;
  $: {
    const cid = $selectedCompany?.id || null;
    if (cid !== _loadedCompanyId) {
      _loadedCompanyId = cid;
      selectedIds = [];
      if (cid) { loadItems(); }
    }
  }

  // ── Modal open/close ───────────────────────────────────────────
  function openModal(item = null) {
    editingItem = item;
    touched = { name: false };
    form = item ? {
      name:        item.name        || '',
      description: item.description || '',
      unit:        item.unit        || 'pcs',
      unit_price:  item.unit_price  || 0,
      category:    item.category    || '',
      is_active:   item.is_active !== false,
    } : {
      name: '', description: '', unit: 'pcs', unit_price: 0, category: '', is_active: true,
    };
    priceDisplay = formatPriceDisplay(form.unit_price);
    showModal = true;
  }

  function closeModal() {
    if (touched.name && !nameValid) { shakeModal = true; return; }
    forceCloseModal();
  }

  function forceCloseModal() {
    showModal = false;
    editingItem = null;
  }

  // ── Submit ─────────────────────────────────────────────────────
  async function handleSubmit() {
    touched = { name: true };
    if (!nameValid) { shakeModal = true; return; }

    const base = {
      item_name:   form.name.trim(),
      description: form.description || undefined,
      unit:        form.unit || 'pcs',
      unit_price:  Number(form.unit_price) || 0,
      category:    form.category || undefined,
    };

    try {
      if (editingItem) {
        await updateItem(editingItem.id, { ...base, is_active: form.is_active });
      } else {
        await createItem(base);
      }
      forceCloseModal();
    } catch (err) {
      showError(err.message || 'Terjadi kesalahan');
    }
  }

  // ── Bulk delete ────────────────────────────────────────────────
  async function handleBulkDelete() {
    if (!await confirmDialog(`Hapus ${selectedIds.length} item terpilih?`)) return;
    const toDelete = $items.filter(i => selectedIds.includes(i.id));
    const succeededIds = [], failedNames = [];
    for (const item of toDelete) {
      try { await deleteItem(item.id); succeededIds.push(item.id); }
      catch { failedNames.push(item.name || `#${item.id}`); }
    }
    selectedIds = selectedIds.filter(id => !succeededIds.includes(id));
    const succeededNames = toDelete.filter(i => succeededIds.includes(i.id)).map(i => i.name || `#${i.id}`);
    if (succeededNames.length) success(`Berhasil dihapus: ${succeededNames.join(', ')}`);
    if (failedNames.length) showError(`Gagal dihapus: ${failedNames.join(', ')}`);
  }

  // ── Export ─────────────────────────────────────────────────────
  function handleExport() {
    if (!filteredItems.length) { showError('Tidak ada data untuk diekspor'); return; }

    const rows = filteredItems.map(item => ({
      'Nama':       item.name        || '',
      'Deskripsi':  item.description || '',
      'SKU':        item.sku         || '',
      'Kategori':   item.category    || '',
      'Satuan':     item.unit        || '',
      'Harga (Rp)': Number(item.unit_price) || 0,
      'Status':     item.is_active !== false ? 'Aktif' : 'Tidak Aktif',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Item');

    const companyName = ($selectedCompany?.name || 'Perusahaan').replace(/[/\\?%*:|"<>]/g, '-');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Item_${companyName}_${date}.xlsx`);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function getUnitLabel(value) {
    return unitOptions.find(o => o.value === value)?.label || value || '-';
  }
</script>

<div>
  <!-- Bilah atas -->
  <div class="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-4">
    <button
      class="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-700 flex-shrink-0"
      on:click={() => sidebarOpen.update(v => !v)}
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>
    <div class="relative flex-1 max-w-sm">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
      </svg>
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Cari Item"
        class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
      />
    </div>
    <div class="ml-auto flex-shrink-0">
      <CompanySelector />
    </div>
  </div>

  <!-- Konten -->
  <div class="p-4 sm:p-6">
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Item</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          Menampilkan data item{$selectedCompany ? ` ${$selectedCompany.name}` : ''}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        {#if selectedIds.length > 0}
          <button
            on:click={handleBulkDelete}
            class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Hapus ({selectedIds.length})
          </button>
        {/if}

        <!-- Filter button + panel -->
        <div class="relative">
          <button
            on:click={() => showFilterPanel = !showFilterPanel}
            class="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors
              {activeFilterCount > 0
                ? 'border-blue-400 bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {#if activeFilterCount > 0}
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">
                {activeFilterCount}
              </span>
            {/if}
          </button>

          {#if showFilterPanel}
            <div class="fixed inset-0 z-10" on:click={() => showFilterPanel = false}></div>
            <div class="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 z-20 w-56 sm:w-60 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Filter Item</span>
                {#if activeFilterCount > 0}
                  <button on:click={clearFilters} class="text-xs text-blue-600 hover:underline">Reset</button>
                {/if}
              </div>
              <div class="py-2">
                {#each [
                  { key: 'hasCategory', label: 'Memiliki kategori', desc: '' },
                ] as f}
                  <label class="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      bind:checked={filters[f.key]}
                      class="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer accent-blue-600"
                    />
                    <div>
                      <p class="text-sm text-gray-700">{f.label}</p>
                      {#if f.desc}<p class="text-xs text-gray-400">{f.desc}</p>{/if}
                    </div>
                  </label>
                {/each}
              </div>
              {#if activeFilterCount > 0}
                <div class="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                  Menampilkan {filteredItems.length} dari {$items.length} item
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <button
          on:click={handleExport}
          disabled={!$selectedCompany?.id || !filteredItems.length}
          class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Ekspor"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span class="hidden sm:inline">Ekspor</span>
        </button>

        <button
          on:click={() => openModal()}
          disabled={!$selectedCompany?.id}
          class="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          + Tambah Item
        </button>
      </div>
    </div>

    <!-- Tabel -->
    <DataTable
      data={filteredItems}
      columns={tableColumns}
      loading={$itemsLoading}
      globalFilter={searchTerm}
      {selectedIds}
      on:selectionChange={(e) => { selectedIds = e.detail; }}
      emptyText={emptyText}
      getRowClass={(item) => item.is_active === false ? 'opacity-60' : ''}
    >
      <svelte:fragment slot="row" let:row>
        <td class="px-4 py-3">
          <button
            on:click={() => openModal(row.original)}
            class="text-sm font-semibold text-blue-600 hover:underline text-left"
          >
            {row.original.name}
          </button>
          {#if row.original.sku}
            <p class="text-xs text-gray-400 mt-0.5">{row.original.sku}</p>
          {/if}
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">
          <span class="truncate max-w-xs block">{row.original.description || '-'}</span>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">{formatCurrency(row.original.unit_price)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">{getUnitLabel(row.original.unit)}</td>
      </svelte:fragment>
    </DataTable>
  </div>
</div>

<!-- Modal -->
<Modal bind:show={showModal} bind:shake={shakeModal}
  title={editingItem ? 'Edit Item' : 'Tambah Item'} size="lg"
  on:close={closeModal}>
  <form on:submit|preventDefault={handleSubmit}>
    <div class="space-y-4">

      <!-- NAMA (required) -->
      <div>
        <div class="relative rounded-lg border px-3 pt-2 pb-2 transition-colors
          {touched.name
            ? (nameValid ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
            : 'border-gray-200 bg-gray-50'}">
          <label class="block text-xs font-semibold uppercase tracking-wide
            {touched.name
              ? (nameValid ? 'text-green-600' : 'text-red-500')
              : 'text-gray-400'}">
            NAMA <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            bind:value={form.name}
            on:blur={() => touched.name = true}
            placeholder="NAMA ITEM"
            maxlength="255"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 pr-7"
          />
          {#if touched.name && nameValid}
            <div class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          {/if}
        </div>
        {#if touched.name && !nameValid}
          <p class="text-red-500 text-xs mt-1 font-medium">NAMA ITEM HARUS DIISI</p>
        {/if}
      </div>

      <!-- KATEGORI & SATUAN -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">KATEGORI</label>
          <input
            type="text"
            bind:value={form.category}
            placeholder="CONTOH: BORDIR"
            maxlength="100"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300"
          />
        </div>
        <SearchableSelect
          label="SATUAN"
          bind:value={form.unit}
          options={unitOptions}
          placeholder="PILIH SATUAN"
        />
      </div>

      <!-- HARGA SATUAN -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">HARGA SATUAN (Rp)</label>
        <input
          type="text"
          inputmode="numeric"
          value={priceDisplay}
          on:input={handlePriceInput}
          placeholder="0"
          class="w-full bg-transparent text-sm text-gray-800 focus:outline-none"
        />
      </div>

      <!-- DESKRIPSI -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">DESKRIPSI</label>
        <textarea
          bind:value={form.description}
          rows="2"
          placeholder="DESKRIPSI TAMBAHAN..."
          class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 resize-none"
        ></textarea>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center justify-between pt-4">
        <button
          type="button"
          on:click={forceCloseModal}
          class="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          BATAL
        </button>
        <button
          type="submit"
          disabled={$itemsLoading}
          class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
          </svg>
          {editingItem ? 'SIMPAN' : 'TAMBAH'}
        </button>
      </div>
    </div>
  </form>
</Modal>
