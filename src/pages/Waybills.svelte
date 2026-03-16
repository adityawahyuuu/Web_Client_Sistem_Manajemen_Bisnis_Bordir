<script>
  import { waybills, waybillsLoading, loadWaybills, addWaybill, updateWaybill, deleteWaybill } from '../stores/waybills.js';
  import { invoices, loadInvoices } from '../stores/invoices.js';
  import { customers, loadCustomers } from '../stores/customers.js';
  import { selectedCompany } from '../stores/company.js';
  import { success, error as showError, confirmDialog } from '../stores/notifications.js';
  import waybillService from '../services/waybill.service.js';
  import api from '../services/api.js';
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
  let editingWaybill = null;
  let downloadingId = null;

  // ── Filter panel ───────────────────────────────────────────────
  let showFilterPanel = false;
  let filters = { inTransit: false, hasInvoice: false };

  $: activeFilterCount = Object.values(filters).filter(Boolean).length;

  $: filteredTableData = tableData.filter(w => {
    if (filters.inTransit  && w.status === 'delivered') return false;
    if (filters.hasInvoice && !w.invoice_id)            return false;
    return true;
  });

  function clearFilters() { filters = { inTransit: false, hasInvoice: false }; }

  // ── Location master data (destination cascade) ─────────────────
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
    form.destination_city = '';
    cities = [];
    if (!form.destination_province) return;
    const province = provinces.find(p => p.name === form.destination_province);
    if (!province) return;
    citiesLoading = true;
    try {
      const res = await api.get(`/master/cities?province_code=${province.code ?? province.id}`);
      cities = res.data ?? res ?? [];
    } catch { cities = []; } finally { citiesLoading = false; }
  }

  // ── Form state ─────────────────────────────────────────────────
  let form = {
    invoice_id:           '',
    customer_id:          '',
    waybill_date:         new Date().toISOString().split('T')[0],
    destination_address:  '',
    destination_city:     '',
    destination_province: '',
    expedition_name:      '',
    vehicle_number:       '',
    driver_name:          '',
    notes:                '',
    status:               'pending'
  };

  // Items only for edit-mode display (read-only)
  let editWaybillItems = [];

  // ── Validation ─────────────────────────────────────────────────
  let touched = { customer: false, invoice: false };
  $: customerValid = !!form.customer_id;
  $: invoiceValid  = !!form.invoice_id;
  $: isDelivered   = editingWaybill?.status === 'delivered';

  // ── Invoices filtered by selected customer ─────────────────────
  $: filteredInvoices = form.customer_id
    ? $invoices.filter(inv => String(inv.customer_id) === String(form.customer_id))
    : $invoices;

  // ── Invoice item preview (create mode) ────────────────────────
  $: selectedInvoice = form.invoice_id
    ? $invoices.find(inv => String(inv.id) === String(form.invoice_id))
    : null;
  $: previewItems = selectedInvoice?.items || [];

  // ── Table ──────────────────────────────────────────────────────
  const tableColumns = [
    { key: 'waybill_date',    label: 'Tanggal Pengiriman' },
    { key: 'waybill_number',  label: 'No. Surat Jalan' },
    { key: '_customer_name',  label: 'Penerima' },
    { key: 'expedition_name', label: 'Ekspedisi' },
    { key: 'status',          label: 'Status', sortable: false },
  ];

  $: tableData = $waybills.map(w => ({
    ...w,
    _customer_name: getCustomerName(w.customer_id),
  }));

  $: emptyText = !$selectedCompany?.id
    ? 'Pilih perusahaan terlebih dahulu'
    : 'Belum ada data surat jalan';

  // ── Company guard ──────────────────────────────────────────────
  let _loadedCompanyId = null;
  $: {
    const cid = $selectedCompany?.id || null;
    if (cid !== _loadedCompanyId) {
      _loadedCompanyId = cid;
      selectedIds = [];
      if (cid) { loadWaybills(); loadInvoices(); loadCustomers(); }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────
  function getCustomerName(customerId) {
    const c = $customers.find(c => c.id === customerId);
    return c ? c.name : '-';
  }

  function getStatusBadge(status) {
    const map = {
      pending:    { label: 'Menunggu Pengiriman', cls: 'bg-orange-500 text-white' },
      in_transit: { label: 'Dalam Pengiriman',    cls: 'bg-purple-600 text-white' },
      delivered:  { label: 'Terkirim',            cls: 'bg-green-500 text-white' }
    };
    return map[status] || { label: status || '-', cls: 'bg-gray-200 text-gray-700' };
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Modal open/close ───────────────────────────────────────────
  async function openModal(waybill = null) {
    editingWaybill = waybill;
    touched = { customer: false, invoice: false };
    cities = [];
    await loadProvinces();

    if (waybill) {
      form = {
        invoice_id:           waybill.invoice_id           ? String(waybill.invoice_id)  : '',
        customer_id:          waybill.customer_id          ? String(waybill.customer_id) : '',
        waybill_date:         waybill.waybill_date         || new Date().toISOString().split('T')[0],
        destination_address:  waybill.destination_address  || '',
        destination_city:     waybill.destination_city     || '',
        destination_province: waybill.destination_province || '',
        expedition_name:      waybill.expedition_name      || '',
        vehicle_number:       waybill.vehicle_number       || '',
        driver_name:          waybill.driver_name          || '',
        notes:                waybill.notes                || '',
        status:               waybill.status               || 'pending'
      };
      editWaybillItems = (waybill.waybill_items || []).map(i => ({
        name:     i.name     || '',
        quantity: i.quantity || 1,
        unit:     i.unit     || 'pcs',
        notes:    i.notes    || ''
      }));
      // Re-hydrate city dropdown from province name
      if (waybill.destination_province) {
        const province = provinces.find(p => p.name === waybill.destination_province);
        if (province) {
          citiesLoading = true;
          try {
            const res = await api.get(`/master/cities?province_code=${province.code ?? province.id}`);
            cities = res.data ?? res ?? [];
          } catch { cities = []; } finally { citiesLoading = false; }
        }
      }
    } else {
      form = {
        invoice_id: '', customer_id: '',
        waybill_date: new Date().toISOString().split('T')[0],
        destination_address: '', destination_city: '', destination_province: '',
        expedition_name: '', vehicle_number: '', driver_name: '',
        notes: '', status: 'pending'
      };
      editWaybillItems = [];
    }
    showModal = true;
  }

  function closeModal() {
    const hasInvalidTouched =
      (touched.customer && !customerValid) ||
      (touched.invoice  && !invoiceValid);
    if (hasInvalidTouched) { shakeModal = true; return; }
    forceCloseModal();
  }

  function forceCloseModal() {
    showModal = false;
    editingWaybill = null;
    cities = [];
    editWaybillItems = [];
  }

  // ── Submit ─────────────────────────────────────────────────────
  async function handleSubmit() {
    if (isDelivered) return;
    touched = { customer: true, invoice: true };
    if (!customerValid || !invoiceValid) { shakeModal = true; return; }

    const editableFields = {
      destination_address:  form.destination_address  || undefined,
      destination_city:     form.destination_city     || undefined,
      destination_province: form.destination_province || undefined,
      expedition_name:      form.expedition_name      || undefined,
      vehicle_number:       form.vehicle_number       || undefined,
      driver_name:          form.driver_name          || undefined,
      notes:                form.notes                || undefined,
      status:               form.status,
    };

    try {
      if (editingWaybill) {
        await updateWaybill(editingWaybill.id, editableFields);
        success('Surat jalan berhasil diperbarui');
      } else {
        await addWaybill({
          customer_id:  Number(form.customer_id),
          invoice_id:   Number(form.invoice_id),
          waybill_date: form.waybill_date,
          ...editableFields,
          // items tidak dikirim — API auto-copy dari invoice
        });
        success('Surat jalan berhasil ditambahkan');
      }
      forceCloseModal();
    } catch (err) {
      showError(err.message || 'Terjadi kesalahan');
    }
  }

  async function handleDelete(id) {
    const item = $waybills.find(w => w.id === id);
    const name = item?.waybill_number || `#${id}`;
    if (!await confirmDialog('Yakin ingin menghapus surat jalan ini?')) return;
    try {
      await deleteWaybill(id);
      selectedIds = selectedIds.filter(i => i !== id);
      success(`"${name}" berhasil dihapus`);
    } catch {
      showError(`Gagal menghapus "${name}"`);
    }
  }

  async function handleBulkDelete() {
    if (!await confirmDialog(`Hapus ${selectedIds.length} surat jalan terpilih?`)) return;
    const toDelete = $waybills.filter(w => selectedIds.includes(w.id));
    const succeededIds = [], failedNames = [];
    for (const w of toDelete) {
      try { await deleteWaybill(w.id); succeededIds.push(w.id); }
      catch { failedNames.push(w.waybill_number || `#${w.id}`); }
    }
    selectedIds = selectedIds.filter(id => !succeededIds.includes(id));
    const succeededNames = toDelete.filter(w => succeededIds.includes(w.id)).map(w => w.waybill_number || `#${w.id}`);
    if (succeededNames.length) success(`Berhasil dihapus: ${succeededNames.join(', ')}`);
    if (failedNames.length) showError(`Gagal dihapus: ${failedNames.join(', ')}`);
  }

  async function handleDownload(waybill) {
    downloadingId = waybill.id;
    try {
      await waybillService.generate(waybill.id);
      const blob = await waybillService.download(waybill.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${waybill.waybill_number}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success('Surat jalan berhasil diunduh');
    } catch (err) {
      showError('Gagal mengunduh surat jalan: ' + (err.message || ''));
    } finally { downloadingId = null; }
  }

  // ── Export ─────────────────────────────────────────────────────
  function handleExport() {
    if (!filteredTableData.length) { showError('Tidak ada data untuk diekspor'); return; }
    const statusLabel = { pending: 'Menunggu', in_transit: 'Dalam Pengiriman', delivered: 'Terkirim' };
    const rows = filteredTableData.map(w => ({
      'Tanggal':         formatDate(w.waybill_date),
      'No. Surat Jalan': w.waybill_number   || '',
      'Penerima':        w._customer_name   || '',
      'Ekspedisi':       w.expedition_name  || '',
      'No. Kendaraan':   w.vehicle_number   || '',
      'Sopir':           w.driver_name      || '',
      'Kota Tujuan':     w.destination_city || '',
      'Status':          statusLabel[w.status] || w.status || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch:14 },{ wch:18 },{ wch:30 },{ wch:20 },{ wch:15 },{ wch:20 },{ wch:20 },{ wch:18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Surat Jalan');
    const companyName = ($selectedCompany?.name || 'Perusahaan').replace(/[/\\?%*:|"<>]/g, '-');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `SuratJalan_${companyName}_${date}.xlsx`);
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
        placeholder="Cari Surat Jalan"
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
        <h1 class="text-xl font-semibold text-gray-900">Surat Jalan</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          Menampilkan data surat jalan{$selectedCompany ? ` ${$selectedCompany.name}` : ''}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        {#if selectedIds.length > 0}
          <button on:click={handleBulkDelete} class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
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
                <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Filter Surat Jalan</span>
                {#if activeFilterCount > 0}
                  <button on:click={clearFilters} class="text-xs text-blue-600 hover:underline">Reset</button>
                {/if}
              </div>
              <div class="py-2">
                {#each [
                  { key: 'inTransit',  label: 'Belum terkirim',   desc: 'Pending atau dalam pengiriman' },
                  { key: 'hasInvoice', label: 'Terhubung invoice', desc: 'Ada nomor invoice terkait' },
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
                  Menampilkan {filteredTableData.length} dari {tableData.length} surat jalan
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <button
          on:click={handleExport}
          disabled={!$selectedCompany?.id || !filteredTableData.length}
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
          + <span class="hidden sm:inline">Tambah </span>Surat Jalan
        </button>
      </div>
    </div>

    <!-- Tabel -->
    <DataTable
      data={filteredTableData}
      columns={tableColumns}
      loading={$waybillsLoading}
      globalFilter={searchTerm}
      {selectedIds}
      on:selectionChange={(e) => { selectedIds = e.detail; }}
      emptyText={emptyText}
    >
      <svelte:fragment slot="row" let:row>
        {@const badge = getStatusBadge(row.original.status)}
        <td class="px-4 py-3 text-sm text-gray-600">{formatDate(row.original.waybill_date)}</td>
        <td class="px-4 py-3">
          <button on:click={() => openModal(row.original)} class="text-sm font-semibold text-blue-600 hover:underline">
            {row.original.waybill_number}
          </button>
          {#if row.original.invoice_id}
            <p class="text-xs text-gray-400 mt-0.5">
              {$invoices.find(i => i.id === row.original.invoice_id)?.invoice_number || `INV #${row.original.invoice_id}`}
            </p>
          {/if}
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original._customer_name}</td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original.expedition_name || '-'}</td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium {badge.cls}">
            <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
            {badge.label}
          </span>
        </td>
      </svelte:fragment>
    </DataTable>
  </div>
</div>

<!-- Modal -->
<Modal bind:show={showModal} bind:shake={shakeModal}
  title={editingWaybill ? `Surat Jalan: ${editingWaybill.waybill_number}` : 'Buat Surat Jalan'}
  size="xl" on:close={closeModal}>

  {#if isDelivered}
    <div class="mb-4 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
      </svg>
      Surat jalan ini sudah berstatus <strong class="ml-1">Terkirim</strong> dan tidak dapat diubah.
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit}>
    <div class="space-y-4">

      <!-- PELANGGAN, INVOICE, TANGGAL -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- PELANGGAN (required) -->
        <div>
          <SearchableSelect
            label="PELANGGAN *"
            bind:value={form.customer_id}
            options={$customers.map(c => ({ value: String(c.id), label: c.name }))}
            placeholder="PILIH PELANGGAN"
            disabled={!!editingWaybill || isDelivered}
            on:change={() => { touched.customer = true; form.invoice_id = ''; }}
          />
          {#if touched.customer && !customerValid}
            <p class="text-red-500 text-xs mt-1 font-medium">PELANGGAN HARUS DIPILIH</p>
          {/if}
        </div>

        <!-- INVOICE TERKAIT (required) -->
        <div>
          <SearchableSelect
            label="INVOICE TERKAIT *"
            bind:value={form.invoice_id}
            options={filteredInvoices.map(inv => ({ value: String(inv.id), label: inv.invoice_number }))}
            placeholder="PILIH INVOICE"
            disabled={!!editingWaybill || isDelivered || !form.customer_id}
            on:change={() => touched.invoice = true}
          />
          {#if touched.invoice && !invoiceValid}
            <p class="text-red-500 text-xs mt-1 font-medium">INVOICE HARUS DIPILIH</p>
          {/if}
        </div>

        <!-- TANGGAL PENGIRIMAN -->
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">TANGGAL PENGIRIMAN</label>
          <input type="date" bind:value={form.waybill_date} disabled={!!editingWaybill || isDelivered}
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none disabled:text-gray-500" />
        </div>
      </div>

      <!-- TUJUAN: PROVINSI, KOTA, ALAMAT -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SearchableSelect
          label="PROVINSI TUJUAN"
          bind:value={form.destination_province}
          options={provinces.map(p => ({ value: p.name, label: p.name }))}
          placeholder="PILIH PROVINSI"
          loading={provincesLoading}
          disabled={isDelivered}
          on:change={onProvinceChange}
        />
        <SearchableSelect
          label="KOTA TUJUAN"
          bind:value={form.destination_city}
          options={cities.map(c => ({ value: c.name, label: c.name }))}
          placeholder="PILIH KOTA"
          disabled={!form.destination_province || isDelivered}
          loading={citiesLoading}
        />
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">ALAMAT TUJUAN</label>
          <input type="text" bind:value={form.destination_address} disabled={isDelivered}
            placeholder="JL. MERDEKA NO. 10"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 disabled:text-gray-500" />
        </div>
      </div>

      <!-- EKSPEDISI & DRIVER -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">EKSPEDISI</label>
          <input type="text" bind:value={form.expedition_name} disabled={isDelivered}
            placeholder="JNE, TIKI, DLL."
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 disabled:text-gray-500" />
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">NO. KENDARAAN</label>
          <input type="text" bind:value={form.vehicle_number} disabled={isDelivered}
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 disabled:text-gray-500" />
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">NAMA SOPIR</label>
          <input type="text" bind:value={form.driver_name} disabled={isDelivered}
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 disabled:text-gray-500" />
        </div>
      </div>

      <!-- STATUS -->
      <SearchableSelect
        label="STATUS PENGIRIMAN"
        bind:value={form.status}
        options={[
          { value: 'pending',    label: 'Menunggu Pengiriman' },
          { value: 'in_transit', label: 'Dalam Pengiriman' },
          { value: 'delivered',  label: 'Terkirim' }
        ]}
        placeholder="PILIH STATUS"
        disabled={isDelivered}
      />

      <!-- ITEM KIRIMAN -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Item Kiriman</label>
        {#if editingWaybill}
          {#if editWaybillItems.some(i => i.name)}
            <div class="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
              {#each editWaybillItems.filter(i => i.name) as item}
                <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 text-sm">
                  <span class="text-gray-800 font-medium">{item.name}</span>
                  <span class="text-gray-500">{item.quantity} {item.unit}{item.notes ? ` · ${item.notes}` : ''}</span>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-sm text-gray-400 italic py-2">Tidak ada item tercatat</p>
          {/if}
        {:else if previewItems.length > 0}
          <p class="text-xs text-gray-400 mb-1.5">Item otomatis dari invoice terpilih:</p>
          <div class="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {#each previewItems as item}
              <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 text-sm">
                <span class="text-gray-700">{item.name}</span>
                <span class="text-gray-500">{item.quantity} {item.unit}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-gray-400 italic py-2">
            {form.invoice_id ? 'Invoice tidak memiliki item — akan disalin otomatis dari invoice' : 'Pilih invoice untuk melihat item kiriman'}
          </p>
        {/if}
      </div>

      <!-- CATATAN -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">CATATAN</label>
        <textarea bind:value={form.notes} rows="2" disabled={isDelivered}
          placeholder="CATATAN TAMBAHAN..."
          class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 resize-none disabled:text-gray-500"></textarea>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center justify-between pt-4">
        <div>
          {#if editingWaybill}
            <button
              type="button"
              on:click={() => handleDownload(editingWaybill)}
              disabled={downloadingId === editingWaybill.id}
              class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloadingId === editingWaybill.id ? 'Mengunduh...' : 'Unduh PDF'}
            </button>
          {/if}
        </div>
        <div class="flex items-center gap-3">
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
          {#if !isDelivered}
            <button
              type="submit"
              class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
              </svg>
              {editingWaybill ? 'SIMPAN' : 'BUAT SURAT JALAN'}
            </button>
          {/if}
        </div>
      </div>

    </div>
  </form>
</Modal>
