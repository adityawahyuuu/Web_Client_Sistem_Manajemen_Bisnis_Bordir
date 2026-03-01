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
  import { success, error as showError, confirmDialog } from '../stores/notifications.js';
  import api from '../services/api.js';
  import companyService from '../services/company.service.js';
  import Modal from '../components/Modal.svelte';
  import DataTable from '../components/DataTable.svelte';
  import SearchableSelect from '../components/SearchableSelect.svelte';

  // ── Country codes ──────────────────────────────────────────────
  const countryCodes = [
    { code: '62', flag: '🇮🇩', name: 'Indonesia' },
    { code: '60', flag: '🇲🇾', name: 'Malaysia' },
    { code: '65', flag: '🇸🇬', name: 'Singapura' },
    { code: '61', flag: '🇦🇺', name: 'Australia' },
    { code: '1',  flag: '🇺🇸', name: 'Amerika' },
  ];

  let searchTerm = '';
  let selectedIds = [];
  let showModal = false;
  let shakeModal = false;
  let editingCompany = null;
  let activeTab = 'info';

  // ── Company settings ────────────────────────────────────────────
  let settingsLoading = false;
  let savingSettings = false;
  let settings = {
    invoice_prefix: '',
    invoice_number_format: '',
    header_text: '',
    footer_text: '',
    terms_conditions: '',
    show_company_logo: true,
    show_company_address: true,
    show_tax_column: true,
    show_discount_column: true,
  };

  async function loadSettings(companyId) {
    settingsLoading = true;
    try {
      const res = await companyService.getSettings(companyId);
      if (res) {
        settings = {
          invoice_prefix:       res.invoice_prefix       ?? '',
          invoice_number_format: res.invoice_number_format ?? '',
          header_text:          res.header_text          ?? '',
          footer_text:          res.footer_text          ?? '',
          terms_conditions:     res.terms_conditions     ?? '',
          show_company_logo:    res.show_company_logo    ?? true,
          show_company_address: res.show_company_address ?? true,
          show_tax_column:      res.show_tax_column      ?? true,
          show_discount_column: res.show_discount_column ?? true,
        };
      }
    } catch { /* error handled by service */ }
    finally { settingsLoading = false; }
  }

  async function handleSaveSettings() {
    savingSettings = true;
    try {
      await companyService.updateSettings(editingCompany.id, settings);
      success('Pengaturan perusahaan berhasil disimpan');
      forceCloseModal();
    } catch { /* error handled by service */ }
    finally { savingSettings = false; }
  }

  let form = {
    name: '',
    domain: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    phone_raw: '',
    phone_code: '62',
    email: ''
  };

  let touched = { name: false, email: false, phone: false };
  $: nameValid  = form.name.trim().length > 0;
  $: emailValid = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  $: phoneFlag  = countryCodes.find(c => c.code === form.phone_code)?.flag ?? '🇮🇩';
  $: phoneNormalized = form.phone_raw.trim() ? (parsePhoneForSubmit(form.phone_raw, form.phone_code) ?? '') : '';
  $: phoneDigits     = phoneNormalized ? (phoneNormalized.length - form.phone_code.length + 1) : 0;
  $: phoneValid      = !form.phone_raw.trim() || (phoneDigits >= 11 && phoneDigits <= 15);

  function stripCountryCode(phone, code) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith(code)) return digits.slice(code.length);
    if (digits.startsWith('0'))  return digits.slice(1);
    return digits;
  }

  function parsePhoneForSubmit(raw, code) {
    const digits = (raw || '').replace(/\D/g, '');
    if (!digits) return undefined;
    if (digits.startsWith(code)) return digits;
    if (digits.startsWith('0'))  return code + digits.slice(1);
    return code + digits;
  }

  function displayPhone(phone) {
    if (!phone) return '-';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('62')) return '0' + digits.slice(2);
    return digits;
  }

  // ── Location (province → city cascade) ────────────────────────
  let provinces = [];
  let cities = [];
  let provincesLoading = false;
  let citiesLoading = false;

  async function loadProvinces() {
    if (provinces.length > 0) return;
    provincesLoading = true;
    try {
      const res = await api.get('/master/provinces');
      provinces = res.data ?? res ?? [];
    } catch { provinces = []; } finally { provincesLoading = false; }
  }

  async function onProvinceChange() {
    form.city = '';
    cities = [];
    if (!form.province) return;
    const province = provinces.find(p => p.name === form.province);
    if (!province) return;
    citiesLoading = true;
    try {
      const res = await api.get(`/master/cities?province_code=${province.code ?? province.id}`);
      cities = res.data ?? res ?? [];
    } catch { cities = []; } finally { citiesLoading = false; }
  }

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

  async function openModal(company = null) {
    editingCompany = company;
    activeTab = 'info';
    touched = { name: false, email: false, phone: false };
    cities = [];
    await loadProvinces();

    if (company) {
      form = {
        name: company.name || '',
        domain: company.domain || '',
        address: company.address || '',
        city: company.city || '',
        province: company.province || '',
        postal_code: company.postal_code || '',
        phone_raw:  stripCountryCode(company.phone, '62'),
        phone_code: '62',
        email: company.email || ''
      };
      // Re-hydrate city dropdown dari province name
      if (company.province) {
        const province = provinces.find(p => p.name === company.province);
        if (province) {
          citiesLoading = true;
          try {
            const res = await api.get(`/master/cities?province_code=${province.code ?? province.id}`);
            cities = res.data ?? res ?? [];
          } catch { cities = []; } finally { citiesLoading = false; }
        }
      }
      loadSettings(company.id);
    } else {
      form = { name: '', domain: '', address: '', city: '', province: '', postal_code: '', phone_raw: '', phone_code: '62', email: '' };
    }
    showModal = true;
  }

  function closeModal() {
    const hasInvalidTouched =
      (touched.name  && !nameValid) ||
      (touched.email && !emailValid) ||
      (touched.phone && !phoneValid);
    if (hasInvalidTouched) { shakeModal = true; return; }
    forceCloseModal();
  }

  function forceCloseModal() {
    showModal = false;
    editingCompany = null;
    activeTab = 'info';
    cities = [];
  }

  async function handleSubmit() {
    touched = { name: true, email: true, phone: true };
    if (!nameValid || !emailValid || !phoneValid) { shakeModal = true; return; }

    try {
      const payload = {
        name: form.name.trim(),
        domain: form.domain || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        province: form.province || undefined,
        postal_code: form.postal_code || undefined,
        phone: parsePhoneForSubmit(form.phone_raw, form.phone_code),
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
    if (!await confirmDialog(`Hapus ${selectedIds.length} perusahaan terpilih?`)) return;
    const toDelete = $companies.filter(c => selectedIds.includes(c.id));
    const succeededIds = [], failedNames = [];
    for (const c of toDelete) {
      try { await deleteCompany(c.id); succeededIds.push(c.id); }
      catch { failedNames.push(c.name || `#${c.id}`); }
    }
    selectedIds = selectedIds.filter(id => !succeededIds.includes(id));
    const succeededNames = toDelete.filter(c => succeededIds.includes(c.id)).map(c => c.name || `#${c.id}`);
    if (succeededNames.length) success(`Berhasil dihapus: ${succeededNames.join(', ')}`);
    if (failedNames.length) showError(`Gagal dihapus: ${failedNames.join(', ')}`);
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
        <td class="px-4 py-3 text-sm text-gray-600">{row.original.phone ? displayPhone(row.original.phone) : '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original.email || '-'}</td>
        <td class="px-4 py-3">
          {#if $selectedCompany?.id === row.original.id}
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
              Aktif
            </span>
          {:else}
            <button
              on:click={() => handleSelect(row.original)}
              class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-full text-gray-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
              </svg>
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
  <!-- Tab bar (hanya saat edit) -->
  {#if editingCompany}
    <div class="flex border-b border-gray-200 mb-5 -mt-1">
      <button type="button"
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
          {activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        on:click={() => activeTab = 'info'}>
        Info Perusahaan
      </button>
      <button type="button"
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
          {activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        on:click={() => activeTab = 'settings'}>
        Pengaturan
      </button>
    </div>
  {/if}

  <!-- Tab: Info Perusahaan -->
  {#if activeTab === 'info'}
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">

    <!-- Nama (required) -->
    <div>
      <div class="relative rounded-lg border px-3 pt-2 pb-2 transition-colors
        {touched.name
          ? (nameValid ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
          : 'border-gray-200 bg-gray-50'}">
        <label class="block text-xs font-semibold uppercase tracking-wide
          {touched.name ? (nameValid ? 'text-green-600' : 'text-red-500') : 'text-gray-400'}">
          NAMA PERUSAHAAN <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          bind:value={form.name}
          on:blur={() => touched.name = true}
          placeholder="PT. CONTOH JAYA"
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
        <p class="text-red-500 text-xs mt-1 font-medium">NAMA PERUSAHAAN HARUS DIISI</p>
      {/if}
    </div>

    <!-- Domain -->
    <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
      <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">DOMAIN</label>
      <input type="text" bind:value={form.domain} placeholder="CONTOH.COM" maxlength="255"
        class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
    </div>

    <!-- Alamat -->
    <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
      <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">ALAMAT</label>
      <textarea bind:value={form.address} rows="2" placeholder="JL. CONTOH NO. 123"
        class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 resize-none"></textarea>
    </div>

    <!-- Provinsi / Kota / Kode Pos -->
    <div class="grid grid-cols-3 gap-3">
      <SearchableSelect
        label="PROVINSI"
        bind:value={form.province}
        options={provinces.map(p => ({ value: p.name, label: p.name }))}
        placeholder="PILIH PROVINSI"
        loading={provincesLoading}
        on:change={onProvinceChange}
      />
      <SearchableSelect
        label="KOTA/KABUPATEN"
        bind:value={form.city}
        options={cities.map(c => ({ value: c.name, label: c.name }))}
        placeholder="PILIH KOTA"
        disabled={!form.province}
        loading={citiesLoading}
      />
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">KODE POS</label>
        <input type="text" bind:value={form.postal_code} placeholder="10110" maxlength="10"
          class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
      </div>
    </div>

    <!-- Telepon / Email -->
    <div class="grid grid-cols-2 gap-4">
      <!-- TELEPON dengan country code picker -->
      <div>
        <div class="flex gap-2">
          <div class="flex items-center gap-1.5 px-3 border border-gray-200 bg-gray-50 rounded-lg shrink-0">
            <span class="text-lg leading-none">{phoneFlag}</span>
            <select bind:value={form.phone_code}
              class="bg-transparent text-sm text-gray-600 focus:outline-none cursor-pointer">
              {#each countryCodes as cc}
                <option value={cc.code}>+{cc.code}</option>
              {/each}
            </select>
          </div>
          <div class="relative flex-1 rounded-lg border px-3 pt-2 pb-2 transition-colors
            {touched.phone && form.phone_raw.trim()
              ? (phoneValid ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
              : 'border-gray-200 bg-gray-50'}">
            <label class="block text-xs font-semibold uppercase tracking-wide
              {touched.phone && form.phone_raw.trim()
                ? (phoneValid ? 'text-green-600' : 'text-red-500')
                : 'text-gray-400'}">TELEPON</label>
            <input
              type="tel"
              bind:value={form.phone_raw}
              on:blur={() => touched.phone = true}
              on:keypress={(e) => { if (!/\d/.test(e.key)) e.preventDefault(); }}
              on:paste={(e) => { e.preventDefault(); const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, ''); document.execCommand('insertText', false, digits); }}
              placeholder="8023456789"
              maxlength="15"
              class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 pr-7"
            />
            {#if touched.phone && form.phone_raw.trim() && phoneValid}
              <div class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            {/if}
          </div>
        </div>
        {#if touched.phone && form.phone_raw.trim() && !phoneValid}
          <p class="text-red-500 text-xs mt-1 font-medium">NOMOR TELEPON {phoneDigits} DIGIT (MIN 11, MAKS 15)</p>
        {/if}
      </div>
      <div>
        <div class="relative rounded-lg border px-3 pt-2 pb-2 transition-colors
          {touched.email && form.email.trim()
            ? (emailValid ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
            : 'border-gray-200 bg-gray-50'}">
          <label class="block text-xs font-semibold uppercase tracking-wide
            {touched.email && form.email.trim()
              ? (emailValid ? 'text-green-600' : 'text-red-500')
              : 'text-gray-400'}">EMAIL</label>
          <input
            type="email"
            bind:value={form.email}
            on:blur={() => touched.email = true}
            placeholder="INFO@PERUSAHAAN.COM"
            maxlength="255"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 pr-7"
          />
          {#if touched.email && form.email.trim() && emailValid}
            <div class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          {/if}
        </div>
        {#if touched.email && form.email.trim() && !emailValid}
          <p class="text-red-500 text-xs mt-1 font-medium">FORMAT EMAIL SALAH (contoh: email@gmail.com)</p>
        {/if}
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex items-center justify-between pt-4">
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
  {/if}

  <!-- Tab: Pengaturan (hanya saat edit) -->
  {#if activeTab === 'settings'}
    <div class="space-y-4">
      {#if settingsLoading}
        <div class="flex items-center justify-center py-10">
          <div class="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
      {:else}
        <!-- Prefix & Format Nomor Invoice -->
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">PREFIX INVOICE</label>
            <input type="text" bind:value={settings.invoice_prefix} placeholder="contoh: AAJ"
              maxlength="20"
              class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 uppercase" />
          </div>
          <div class="rounded-lg border border-gray-200 bg-gray-100 px-3 pt-2 pb-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">FORMAT NOMOR</label>
            <input type="text" bind:value={settings.invoice_number_format} placeholder="contoh: &#123;prefix&#125;/&#123;year&#125;/&#123;seq&#125;"
              disabled
              class="w-full bg-transparent text-sm text-gray-400 focus:outline-none placeholder-gray-300 cursor-not-allowed" />
          </div>
        </div>

        <!-- Header & Footer -->
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">HEADER DOKUMEN</label>
            <textarea bind:value={settings.header_text} rows="3" placeholder="Teks header pada dokumen cetak"
              class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 resize-none"></textarea>
          </div>
          <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">FOOTER DOKUMEN</label>
            <textarea bind:value={settings.footer_text} rows="3" placeholder="Teks footer pada dokumen cetak"
              class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 resize-none"></textarea>
          </div>
        </div>

        <!-- Syarat & Ketentuan -->
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">SYARAT & KETENTUAN</label>
          <textarea bind:value={settings.terms_conditions} rows="4" placeholder="Syarat dan ketentuan yang tertera di dokumen"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 resize-none"></textarea>
        </div>

        <!-- Toggle tampilan dokumen -->
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">TAMPILAN DOKUMEN CETAK</p>
          {#each [
            { key: 'show_company_logo',    label: 'Tampilkan logo perusahaan' },
            { key: 'show_company_address', label: 'Tampilkan alamat perusahaan' },
            { key: 'show_tax_column',      label: 'Tampilkan kolom pajak' },
            { key: 'show_discount_column', label: 'Tampilkan kolom diskon' },
          ] as opt}
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" bind:checked={settings[opt.key]}
                class="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer" />
              <span class="text-sm text-gray-700">{opt.label}</span>
            </label>
          {/each}
        </div>

        <!-- Action buttons -->
        <div class="flex items-center justify-between pt-4">
          <button type="button" on:click={forceCloseModal}
            class="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            BATAL
          </button>
          <button type="button" on:click={handleSaveSettings} disabled={savingSettings}
            class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {#if savingSettings}
              <div class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            {:else}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
              </svg>
            {/if}
            SIMPAN PENGATURAN
          </button>
        </div>
      {/if}
    </div>
  {/if}

</Modal>
