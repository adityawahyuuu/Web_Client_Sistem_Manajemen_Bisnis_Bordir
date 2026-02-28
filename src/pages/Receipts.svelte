<script>
  import { receipts, receiptsLoading, loadReceipts, addReceipt, updateReceipt, deleteReceipt } from '../stores/receipts.js';
  import { invoices, loadInvoices } from '../stores/invoices.js';
  import { customers, loadCustomers } from '../stores/customers.js';
  import { selectedCompany } from '../stores/company.js';
  import { success, error as showError } from '../stores/notifications.js';
  import receiptService from '../services/receipt.service.js';
  import * as XLSX from 'xlsx';
  import Modal from '../components/Modal.svelte';
  import CompanySelector from '../components/CompanySelector.svelte';
  import DataTable from '../components/DataTable.svelte';
  import SearchableSelect from '../components/SearchableSelect.svelte';

  // ── Page state ─────────────────────────────────────────────────
  let searchTerm = '';
  let selectedIds = [];
  let showModal = false;
  let shakeModal = false;
  let editingReceipt = null;
  let downloadingId = null;

  // ── Payment method multi-select ────────────────────────────────
  let showPaymentDropdown = false;
  let paymentMethodSearch = '';
  const paymentMethodOptions = [
    { value: 'cash',     label: 'Tunai' },
    { value: 'transfer', label: 'Transfer Bank' },
    { value: 'check',    label: 'Cek' },
    { value: 'other',    label: 'Lainnya' }
  ];
  $: filteredPaymentOptions = paymentMethodSearch.trim()
    ? paymentMethodOptions.filter(o => o.label.toLowerCase().includes(paymentMethodSearch.trim().toLowerCase()))
    : paymentMethodOptions;

  function togglePaymentMethod(val) {
    form.payment_method = form.payment_method.includes(val)
      ? form.payment_method.filter(m => m !== val)
      : [...form.payment_method, val];
  }

  // ── Filter panel ───────────────────────────────────────────────
  let showFilterPanel = false;
  let filters = {
    isPiutang:  false,
    hasInvoice: false,
  };

  $: activeFilterCount = Object.values(filters).filter(Boolean).length;

  $: filteredTableData = tableData.filter(r => {
    if (filters.isPiutang  && r.status !== 'piutang') return false;
    if (filters.hasInvoice && !r.invoice_id)          return false;
    return true;
  });

  function clearFilters() {
    filters = { isPiutang: false, hasInvoice: false };
  }

  // ── Form state ─────────────────────────────────────────────────
  let form = {
    invoice_id:     '',
    customer_id:    '',
    receipt_date:   new Date().toISOString().split('T')[0],
    amount:         0,
    payment_method: ['cash'],
    status:         'dp',
    description:    '',
    received_by:    '',
    notes:          ''
  };

  // ── Validation ─────────────────────────────────────────────────
  let touched = { customer: false, invoice: false, amount: false };
  $: customerValid = !!form.customer_id;
  $: invoiceValid  = !!form.invoice_id;
  $: amountValid   = Number(form.amount) > 0;

  // ── Numeric input helpers ──────────────────────────────────────
  let amountDisplay = '';

  function handleAmountInput(e) {
    const raw = e.target.value.replace(/\D/g, '');
    form.amount = Number(raw) || 0;
    amountDisplay = raw ? Number(raw).toLocaleString('id-ID') : '';
    e.target.value = amountDisplay;
  }

  const tableColumns = [
    { key: 'receipt_date',    label: 'Tanggal' },
    { key: 'receipt_number',  label: 'No. Kuitansi' },
    { key: '_customer_name',  label: 'Pelanggan' },
    { key: 'amount',          label: 'Jumlah Pembayaran' },
    { key: '_payment_method', label: 'Metode', sortable: false },
    { key: 'status',          label: 'Status', sortable: false },
  ];

  $: tableData = $receipts.map(r => ({
    ...r,
    _customer_name:  getCustomerName(r.customer_id),
    _payment_method: getPaymentMethodLabel(r.payment_method),
  }));

  $: filteredInvoices = form.customer_id
    ? $invoices.filter(inv => String(inv.customer_id) === String(form.customer_id))
    : $invoices;

  $: emptyText = !$selectedCompany?.id
    ? 'Pilih perusahaan terlebih dahulu'
    : 'Belum ada data kuitansi';

  // ── Company guard ──────────────────────────────────────────────
  let _loadedCompanyId = null;
  $: {
    const cid = $selectedCompany?.id || null;
    if (cid !== _loadedCompanyId) {
      _loadedCompanyId = cid;
      selectedIds = [];
      if (cid) { loadReceipts(); loadInvoices(); loadCustomers(); }
    }
  }

  function getCustomerName(customerId) {
    const c = $customers.find(c => c.id === customerId);
    return c ? c.name : '-';
  }

  function getPaymentMethodLabel(method) {
    const map = { cash: 'Tunai', transfer: 'Transfer', check: 'Cek', other: 'Lainnya' };
    if (!method) return '-';
    return String(method).split(',').map(m => map[m.trim()] || m.trim()).join(', ');
  }

  function onInvoiceChange() {
    touched.invoice = true;
    if (editingReceipt || !form.invoice_id) return;
    const inv = $invoices.find(i => String(i.id) === String(form.invoice_id));
    if (!inv) return;
    // Autofill JUMLAH → sisa piutang
    const sisa = Math.max(0, inv.total_amount - inv.total_paid);
    form.amount = sisa;
    amountDisplay = sisa > 0 ? Number(sisa).toLocaleString('id-ID') : '';
    // Autofill STATUS
    form.status = (inv.total_paid >= inv.total_amount && inv.total_amount > 0)
      ? 'lunas'
      : inv.total_paid > 0 ? 'dp' : 'piutang';
    // Autofill CATATAN jika ada kelebihan bayar
    const overpay = inv.total_paid - inv.total_amount;
    if (overpay > 0) form.notes = `Kelebihan bayar: ${formatCurrency(overpay)}`;
  }

  function getStatusBadge(status) {
    const map = {
      lunas:   { label: 'Lunas',   cls: 'bg-green-500 text-white' },
      dp:      { label: 'DP',      cls: 'bg-purple-600 text-white' },
      piutang: { label: 'Piutang', cls: 'bg-red-500 text-white' }
    };
    return map[status] || { label: status || '-', cls: 'bg-gray-200 text-gray-700' };
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Modal open/close ───────────────────────────────────────────
  function openModal(receipt = null) {
    editingReceipt = receipt;
    touched = { customer: false, invoice: false, amount: false };
    form = receipt ? {
      invoice_id:     receipt.invoice_id  ? String(receipt.invoice_id)  : '',
      customer_id:    receipt.customer_id ? String(receipt.customer_id) : '',
      receipt_date:   receipt.receipt_date   || new Date().toISOString().split('T')[0],
      amount:         receipt.amount         || 0,
      payment_method: receipt.payment_method
        ? String(receipt.payment_method).split(',').map(m => m.trim()).filter(Boolean)
        : ['cash'],
      status:         receipt.status         || 'dp',
      description:    receipt.description    || '',
      received_by:    receipt.received_by    || '',
      notes:          receipt.notes          || ''
    } : {
      invoice_id: '', customer_id: '',
      receipt_date: new Date().toISOString().split('T')[0],
      amount: 0, payment_method: ['cash'], status: 'dp',
      description: '', received_by: '', notes: ''
    };
    amountDisplay = form.amount > 0 ? Number(form.amount).toLocaleString('id-ID') : '';
    showModal = true;
  }

  function closeModal() {
    const hasInvalidTouched =
      (touched.customer && !customerValid) ||
      (touched.invoice  && !invoiceValid)  ||
      (touched.amount   && !amountValid);
    if (hasInvalidTouched) { shakeModal = true; return; }
    forceCloseModal();
  }

  function forceCloseModal() {
    showModal = false;
    editingReceipt = null;
    showPaymentDropdown = false;
    paymentMethodSearch = '';
  }

  // ── Submit ─────────────────────────────────────────────────────
  async function handleSubmit() {
    touched = { customer: true, invoice: true, amount: true };
    if (!customerValid || !invoiceValid || !amountValid) { shakeModal = true; return; }

    try {
      if (editingReceipt) {
        await updateReceipt(editingReceipt.id, {
          amount:         form.amount,
          payment_method: form.payment_method.join(',') || 'cash',
          status:         form.status,
          description:    form.description  || undefined,
          received_by:    form.received_by  || undefined,
          notes:          form.notes        || undefined,
        });
        success('Kuitansi berhasil diperbarui');
      } else {
        await addReceipt({
          customer_id:    Number(form.customer_id),
          invoice_id:     Number(form.invoice_id),
          receipt_date:   form.receipt_date,
          amount:         form.amount,
          payment_method: form.payment_method.join(',') || 'cash',
          status:         form.status,
          description:    form.description  || undefined,
          received_by:    form.received_by  || undefined,
          notes:          form.notes        || undefined,
        });
        success('Kuitansi berhasil ditambahkan');
      }
      forceCloseModal();
    } catch (err) {
      showError(err.message || 'Terjadi kesalahan');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Yakin ingin menghapus kuitansi ini?')) return;
    try {
      await deleteReceipt(id);
      selectedIds = selectedIds.filter(i => i !== id);
      success('Kuitansi berhasil dihapus');
    } catch {}
  }

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedIds.length} kuitansi terpilih?`)) return;
    for (const id of [...selectedIds]) {
      try { await deleteReceipt(id); } catch {}
    }
    selectedIds = [];
    success('Kuitansi berhasil dihapus');
  }

  async function handleDownload(receipt) {
    downloadingId = receipt.id;
    try {
      await receiptService.generate(receipt.id);
      const blob = await receiptService.download(receipt.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${receipt.receipt_number}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success('Kuitansi berhasil diunduh');
    } catch (err) {
      showError('Gagal mengunduh kuitansi: ' + (err.message || ''));
    } finally { downloadingId = null; }
  }

  // ── Export ─────────────────────────────────────────────────────
  function handleExport() {
    if (!filteredTableData.length) { showError('Tidak ada data untuk diekspor'); return; }

    const rows = filteredTableData.map(r => ({
      'Tanggal':        formatDate(r.receipt_date),
      'No. Kuitansi':   r.receipt_number         || '',
      'Pelanggan':      r._customer_name          || '',
      'Jumlah (Rp)':    Number(r.amount)          || 0,
      'Metode':         r._payment_method         || '',
      'Status':         r.status                  || '',
      'Deskripsi':      r.description             || '',
      'Diterima Oleh':  r.received_by             || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch:14 },{ wch:18 },{ wch:30 },{ wch:16 },{ wch:12 },{ wch:10 },{ wch:30 },{ wch:20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kuitansi');

    const companyName = ($selectedCompany?.name || 'Perusahaan').replace(/[/\\?%*:|"<>]/g, '-');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Kuitansi_${companyName}_${date}.xlsx`);
  }
</script>

<div>
  <!-- Bilah atas -->
  <div class="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
    <div class="relative flex-1 max-w-sm">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
      </svg>
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Cari Kuitansi"
        class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
      />
    </div>
    <div class="ml-auto flex-shrink-0">
      <CompanySelector />
    </div>
  </div>

  <!-- Konten -->
  <div class="p-6">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Kuitansi</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          Menampilkan data kuitansi{$selectedCompany ? ` ${$selectedCompany.name}` : ''}
        </p>
      </div>
      <div class="flex items-center gap-2">
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
            <div class="absolute right-0 top-full mt-1 z-20 w-60 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Filter Kuitansi</span>
                {#if activeFilterCount > 0}
                  <button on:click={clearFilters} class="text-xs text-blue-600 hover:underline">Reset</button>
                {/if}
              </div>
              <div class="py-2">
                {#each [
                  { key: 'isPiutang',  label: 'Status piutang',     desc: 'Belum lunas / DP' },
                  { key: 'hasInvoice', label: 'Terhubung invoice',   desc: 'Ada nomor invoice terkait' },
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
                  Menampilkan {filteredTableData.length} dari {tableData.length} kuitansi
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <button
          on:click={handleExport}
          disabled={!$selectedCompany?.id || !filteredTableData.length}
          class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Ekspor
        </button>

        <button
          on:click={() => openModal()}
          disabled={!$selectedCompany?.id}
          class="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          + Tambah Kuitansi
        </button>
      </div>
    </div>

    <!-- Tabel -->
    <DataTable
      data={filteredTableData}
      columns={tableColumns}
      loading={$receiptsLoading}
      globalFilter={searchTerm}
      {selectedIds}
      on:selectionChange={(e) => { selectedIds = e.detail; }}
      emptyText={emptyText}
    >
      <svelte:fragment slot="row" let:row>
        {@const badge = getStatusBadge(row.original.status)}
        <td class="px-4 py-3 text-sm text-gray-600">{formatDate(row.original.receipt_date)}</td>
        <td class="px-4 py-3">
          <button on:click={() => openModal(row.original)} class="text-sm font-semibold text-blue-600 hover:underline">
            {row.original.receipt_number}
          </button>
          {#if row.original.invoice_id}
            <p class="text-xs text-gray-400 mt-0.5">
              {$invoices.find(i => i.id === row.original.invoice_id)?.invoice_number || `INV #${row.original.invoice_id}`}
            </p>
          {/if}
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original._customer_name}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(row.original.amount)}</td>
        <td class="px-4 py-3 text-sm text-gray-500">{row.original._payment_method}</td>
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
  title={editingReceipt ? `Kuitansi: ${editingReceipt.receipt_number}` : 'Buat Kuitansi'}
  size="lg" on:close={closeModal}>
  <form on:submit|preventDefault={handleSubmit}>
    <div class="space-y-4">

      <!-- PELANGGAN & INVOICE TERKAIT -->
      <div class="grid grid-cols-2 gap-4">
        <!-- PELANGGAN (required) -->
        <div>
          <SearchableSelect
            label="PELANGGAN *"
            bind:value={form.customer_id}
            options={$customers.map(c => ({ value: String(c.id), label: c.name }))}
            placeholder="PILIH PELANGGAN"
            disabled={!!editingReceipt}
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
            disabled={!!editingReceipt || !form.customer_id}
            on:change={onInvoiceChange}
          />
          {#if touched.invoice && !invoiceValid}
            <p class="text-red-500 text-xs mt-1 font-medium">INVOICE HARUS DIPILIH</p>
          {:else if !editingReceipt && form.customer_id && filteredInvoices.length === 0}
            <p class="text-xs text-gray-400 mt-1">Tidak ada invoice untuk pelanggan ini</p>
          {/if}
        </div>
      </div>

      <!-- TANGGAL & JUMLAH -->
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">TANGGAL</label>
          <input type="date" bind:value={form.receipt_date}
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none" />
        </div>
        <!-- JUMLAH (required > 0) -->
        <div>
          <div class="relative rounded-lg border px-3 pt-2 pb-2 transition-colors
            {touched.amount && form.amount
              ? (amountValid ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
              : 'border-gray-200 bg-gray-50'}">
            <label class="block text-xs font-semibold uppercase tracking-wide
              {touched.amount && form.amount
                ? (amountValid ? 'text-green-600' : 'text-red-500')
                : 'text-gray-400'}">
              JUMLAH (Rp) <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputmode="numeric"
              value={amountDisplay}
              on:input={handleAmountInput}
              on:blur={() => touched.amount = true}
              placeholder="0"
              class="w-full bg-transparent text-sm text-gray-800 focus:outline-none pr-7"
            />
            {#if touched.amount && form.amount && amountValid}
              <div class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            {/if}
          </div>
          {#if touched.amount && !amountValid}
            <p class="text-red-500 text-xs mt-1 font-medium">JUMLAH HARUS LEBIH DARI 0</p>
          {/if}
        </div>
      </div>

      <!-- METODE & STATUS -->
      <div class="grid grid-cols-2 gap-4">
        <!-- METODE PEMBAYARAN (multiple, searchable) -->
        <div class="relative">
          <button
            type="button"
            on:click={() => showPaymentDropdown = !showPaymentDropdown}
            class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2 text-left cursor-pointer hover:border-gray-300 transition-colors
              {showPaymentDropdown ? 'border-blue-400 ring-1 ring-blue-200' : ''}"
          >
            <span class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">METODE PEMBAYARAN</span>
            <div class="flex items-center justify-between gap-2 min-h-[1.25rem]">
              {#if form.payment_method.length === 0}
                <span class="text-sm text-gray-400">PILIH METODE</span>
              {:else}
                <div class="flex flex-wrap gap-1">
                  {#each form.payment_method as m}
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                      {getPaymentMethodLabel(m)}
                      <span
                        role="button"
                        tabindex="0"
                        on:click|stopPropagation={() => togglePaymentMethod(m)}
                        on:keydown={(e) => e.key === 'Enter' && togglePaymentMethod(m)}
                        class="hover:text-blue-900 cursor-pointer leading-none"
                      >
                        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </span>
                    </span>
                  {/each}
                </div>
              {/if}
              <svg class="w-4 h-4 text-gray-400 transition-transform duration-150 shrink-0 {showPaymentDropdown ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </button>
          {#if showPaymentDropdown}
            <div class="fixed inset-0 z-[59]" on:click={() => { showPaymentDropdown = false; paymentMethodSearch = ''; }}></div>
            <div class="absolute z-[60] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              <div class="p-2 border-b border-gray-100">
                <div class="relative">
                  <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
                  </svg>
                  <input
                    bind:value={paymentMethodSearch}
                    type="text"
                    placeholder="Cari..."
                    class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                  />
                </div>
              </div>
              <div class="max-h-40 overflow-y-auto">
                {#each filteredPaymentOptions as opt (opt.value)}
                  <button
                    type="button"
                    on:click={() => togglePaymentMethod(opt.value)}
                    class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                      {form.payment_method.includes(opt.value) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}"
                  >
                    <div class="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                      {form.payment_method.includes(opt.value) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}">
                      {#if form.payment_method.includes(opt.value)}
                        <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                        </svg>
                      {/if}
                    </div>
                    {opt.label}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- STATUS (searchable) -->
        <SearchableSelect
          label="STATUS"
          bind:value={form.status}
          options={[
            { value: 'dp',      label: 'DP' },
            { value: 'lunas',   label: 'Lunas' },
            { value: 'piutang', label: 'Piutang' }
          ]}
          placeholder="PILIH STATUS"
        />
      </div>

      <!-- DESKRIPSI & DITERIMA OLEH -->
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">DESKRIPSI</label>
          <input type="text" bind:value={form.description} placeholder="KETERANGAN PEMBAYARAN"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">DITERIMA OLEH</label>
          <input type="text" bind:value={form.received_by} placeholder="NAMA PENERIMA"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
        </div>
      </div>

      <!-- CATATAN -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">CATATAN</label>
        <textarea bind:value={form.notes} rows="2" placeholder="CATATAN TAMBAHAN..."
          class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 resize-none"></textarea>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center justify-between pt-4">
        <div>
          {#if editingReceipt}
            <button
              type="button"
              on:click={() => handleDownload(editingReceipt)}
              disabled={downloadingId === editingReceipt.id}
              class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloadingId === editingReceipt.id ? 'Mengunduh...' : 'Unduh PDF'}
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
          <button
            type="submit"
            class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
            </svg>
            {editingReceipt ? 'SIMPAN' : 'BUAT KUITANSI'}
          </button>
        </div>
      </div>
    </div>
  </form>
</Modal>
