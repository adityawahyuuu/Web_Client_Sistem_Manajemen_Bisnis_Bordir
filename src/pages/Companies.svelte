<script>
  import { onMount } from 'svelte';
  import * as XLSX from 'xlsx';
  import {
    companies,
    selectedCompany,
    companiesLoading,
    createCompany,
    updateCompany,
    deleteCompany,
    selectCompany,
    loadCompanies,
  } from '../stores/company.js';
  import { success, error as showError } from '../stores/notifications.js';
  import Modal from '../components/Modal.svelte';
  import DataTable from '../components/DataTable.svelte';

  let searchTerm = '';
  let selectedIds = [];
  let showModal = false;
  let shakeModal = false;
  let editingCompany = null;

  let form = {
    name: '',
    domain: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    phone: '',
    email: ''
  };

  let touched = { name: false };
  $: nameValid = form.name.trim().length > 0;

  // Filter
  let showFilterPanel = false;
  let filters = { hasPhone: false, hasEmail: false, isSelected: false };
  $: activeFilterCount = Object.values(filters).filter(Boolean).length;

  $: tableData = $companies.map(c => ({
    ...c,
    _location: [c.city, c.province].filter(Boolean).join(', ') || '-',
  }));

  $: filteredData = tableData.filter(item => {
    if (filters.hasPhone && !item.phone) return false;
    if (filters.hasEmail && !item.email) return false;
    if (filters.isSelected && $selectedCompany?.id !== item.id) return false;
    return true;
  });

  function clearFilters() { filters = { hasPhone: false, hasEmail: false, isSelected: false }; }

  const tableColumns = [
    { key: 'name', label: 'Nama' },
    { key: '_location', label: 'Kota' },
    { key: 'phone', label: 'Telepon' },
    { key: 'email', label: 'Email' },
    { key: '_status', label: 'Status', sortable: false },
  ];

  onMount(() => { loadCompanies(); });

  function openModal(company = null) {
    editingCompany = company;
    touched = { name: false };
    if (company) {
      form = {
        name: company.name || '',
        domain: company.domain || '',
        address: company.address || '',
        city: company.city || '',
        province: company.province || '',
        postal_code: company.postal_code || '',
        phone: company.phone || '',
        email: company.email || ''
      };
    } else {
      form = { name: '', domain: '', address: '', city: '', province: '', postal_code: '', phone: '', email: '' };
    }
    showModal = true;
  }

  function closeModal() {
    if (touched.name && !nameValid) { shakeModal = true; return; }
    forceCloseModal();
  }

  function forceCloseModal() {
    showModal = false;
    editingCompany = null;
  }

  async function handleSubmit() {
    touched = { name: true };
    if (!nameValid) { shakeModal = true; return; }

    try {
      const payload = {
        name: form.name.trim(),
        domain: form.domain || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        province: form.province || undefined,
        postal_code: form.postal_code || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, payload);
        success('Perusahaan berhasil diperbarui');
      } else {
        await createCompany(payload);
        success('Perusahaan berhasil ditambahkan');
      }
      forceCloseModal();
    } catch (err) {
      showError('Gagal menyimpan perusahaan');
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedIds.length} perusahaan terpilih?`)) return;
    for (const id of [...selectedIds]) {
      try { await deleteCompany(id); } catch {}
    }
    selectedIds = [];
    success('Perusahaan terpilih berhasil dihapus');
  }

  function handleSelect(company) {
    selectCompany(company);
    success(`${company.name} dipilih sebagai perusahaan aktif`);
  }

  function handleExport() {
    if (!filteredData.length) { showError('Tidak ada data untuk diekspor'); return; }
    const rows = filteredData.map(c => ({
      'Nama': c.name || '',
      'Domain': c.domain || '',
      'Alamat': c.address || '',
      'Kota': c.city || '',
      'Provinsi': c.province || '',
      'Kode Pos': c.postal_code || '',
      'Telepon': c.phone || '',
      'Email': c.email || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Perusahaan');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Perusahaan_${date}.xlsx`);
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<div>
  <!-- Sticky top bar -->
  <div class="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
    <div class="relative flex-1 max-w-sm">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
      </svg>
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Cari perusahaan..."
        class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
      />
    </div>
  </div>

  <!-- Content -->
  <div class="p-6">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Perusahaan</h1>
        <p class="text-sm text-gray-500 mt-0.5">Kelola daftar perusahaan Anda</p>
      </div>
      <div class="flex items-center gap-2">
        {#if selectedIds.length > 0}
          <button on:click={handleBulkDelete}
            class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Hapus ({selectedIds.length})
          </button>
        {/if}

        <!-- Filter -->
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
            <div class="absolute right-0 top-full mt-1 z-20 w-60 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Filter Perusahaan</span>
                {#if activeFilterCount > 0}
                  <button on:click={clearFilters} class="text-xs text-blue-600 hover:underline">Reset</button>
                {/if}
              </div>
              <div class="py-2">
                {#each [
                  { key: 'hasPhone', label: 'Ada Telepon', desc: 'Hanya tampilkan yang punya no. telepon' },
                  { key: 'hasEmail', label: 'Ada Email', desc: 'Hanya tampilkan yang punya email' },
                  { key: 'isSelected', label: 'Perusahaan Aktif', desc: 'Hanya tampilkan perusahaan yang sedang aktif' },
                ] as f}
                  <label class="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" bind:checked={filters[f.key]}
                      class="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer accent-blue-600" />
                    <div>
                      <p class="text-sm text-gray-700">{f.label}</p>
                      {#if f.desc}<p class="text-xs text-gray-400">{f.desc}</p>{/if}
                    </div>
                  </label>
                {/each}
              </div>
              {#if activeFilterCount > 0}
                <div class="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                  Menampilkan {filteredData.length} dari {$companies.length} data
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Export -->
        <button on:click={handleExport}
          disabled={!filteredData.length}
          class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Ekspor
        </button>

        <button on:click={() => openModal()}
          class="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          + Tambah Perusahaan
        </button>
      </div>
    </div>

    <DataTable
      data={filteredData}
      columns={tableColumns}
      loading={$companiesLoading}
      globalFilter={searchTerm}
      {selectedIds}
      on:selectionChange={(e) => { selectedIds = e.detail; }}
      emptyText="Belum ada data perusahaan"
    >
      <svelte:fragment slot="row" let:row>
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-blue-600">{getInitials(row.original.name)}</span>
            </div>
            <div>
              <button on:click={() => openModal(row.original)}
                class="text-sm font-semibold text-blue-600 hover:underline text-left">
                {row.original.name}
              </button>
              {#if row.original.domain}
                <p class="text-xs text-gray-400 mt-0.5">{row.original.domain}</p>
              {/if}
            </div>
          </div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original._location}</td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original.phone || '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original.email || '-'}</td>
        <td class="px-4 py-3">
          {#if $selectedCompany?.id === row.original.id}
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Aktif
            </span>
          {:else}
            <button on:click={() => handleSelect(row.original)}
              class="text-xs text-blue-600 hover:underline font-medium">
              Pilih
            </button>
          {/if}
        </td>
      </svelte:fragment>
    </DataTable>
  </div>
</div>

<Modal
  bind:show={showModal}
  bind:shake={shakeModal}
  on:close={closeModal}
  title={editingCompany ? 'Edit Perusahaan' : 'Tambah Perusahaan'}
  size="lg"
>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">

    <!-- Nama (mandatory, floating label) -->
    <div class="relative">
      <input
        type="text"
        id="company-name"
        bind:value={form.name}
        on:blur={() => (touched.name = true)}
        placeholder=" "
        class="peer w-full px-3 pt-5 pb-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors
          {touched.name
            ? nameValid
              ? 'border-green-400 bg-green-50 focus:ring-green-400'
              : 'border-red-400 bg-red-50 focus:ring-red-400'
            : 'border-gray-200 bg-gray-50 focus:ring-blue-500'}"
      />
      <label for="company-name"
        class="absolute left-3 top-1 text-xs font-medium transition-colors
          {touched.name ? (nameValid ? 'text-green-600' : 'text-red-500') : 'text-gray-500'}">
        Nama Perusahaan *
      </label>
      {#if touched.name && nameValid}
        <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
        </svg>
      {/if}
      {#if touched.name && !nameValid}
        <p class="text-xs text-red-500 mt-1">Nama perusahaan wajib diisi</p>
      {/if}
    </div>

    <!-- Domain -->
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Domain</label>
      <input type="text" bind:value={form.domain}
        class="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="contoh.com" />
    </div>

    <!-- Alamat -->
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Alamat</label>
      <textarea bind:value={form.address} rows="2"
        class="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        placeholder="Jl. Contoh No. 123"></textarea>
    </div>

    <!-- Kota / Provinsi / Kode Pos -->
    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Kota</label>
        <input type="text" bind:value={form.city}
          class="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Jakarta" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Provinsi</label>
        <input type="text" bind:value={form.province}
          class="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="DKI Jakarta" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Kode Pos</label>
        <input type="text" bind:value={form.postal_code}
          class="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="10110" />
      </div>
    </div>

    <!-- Telepon / Email -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Telepon</label>
        <input type="text" bind:value={form.phone}
          class="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="021-1234567" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Email</label>
        <input type="email" bind:value={form.email}
          class="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="info@perusahaan.com" />
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex items-center justify-between pt-4 border-t border-gray-100">
      <button type="button" on:click={forceCloseModal}
        class="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        BATAL
      </button>
      <button type="submit" disabled={$companiesLoading}
        class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
        </svg>
        {editingCompany ? 'SIMPAN' : 'BUAT PERUSAHAAN'}
      </button>
    </div>

  </form>
</Modal>
