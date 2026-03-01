<script>
  import {
    invoices, invoicesLoading,
    loadInvoices, addInvoice, updateInvoice, deleteInvoice,
    addInvoicePayment, updateInvoicePaymentEntry, deleteInvoicePaymentEntry,
    decimalToNumber
  } from '../stores/invoices.js';
  import { customers, loadCustomers, addCustomer } from '../stores/customers.js';
  import { items, itemsLoading, loadItems, createItem } from '../stores/items.js';
  import { selectedCompany } from '../stores/company.js';
  import { success, error as showError, confirmDialog } from '../stores/notifications.js';
  import invoiceService from '../services/invoice.service.js';
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
  let editingInvoice = null;
  let activeTab = 'info';
  let downloadingId = null;

  // ── Quick-add Customer ─────────────────────────────────────────
  let showQuickCustomer = false;
  let quickCustomerForm = { name: '', phone: '', email: '' };
  let quickCustomerSaving = false;
  let quickCustomerTouched = { name: false };
  $: quickCustomerNameValid = quickCustomerForm.name.trim().length > 0;

  function openQuickCustomer() { showQuickCustomer = true; quickCustomerForm = { name: '', phone: '', email: '' }; quickCustomerTouched = { name: false }; }
  function closeQuickCustomer() { showQuickCustomer = false; }

  async function handleQuickCustomer() {
    quickCustomerTouched = { name: true };
    if (!quickCustomerNameValid) return;
    quickCustomerSaving = true;
    try {
      const result = await addCustomer({ name: quickCustomerForm.name.trim(), phone: quickCustomerForm.phone || undefined, email: quickCustomerForm.email || undefined });
      if (result?.id) { form.customer_id = String(result.id); touched.customer = true; }
      closeQuickCustomer();
    } catch { /* handled by store */ } finally { quickCustomerSaving = false; }
  }

  // ── Quick-add Item ─────────────────────────────────────────────
  const unitOptions = [
    { value: 'pcs', label: 'Pcs' }, { value: 'unit', label: 'Unit' }, { value: 'box', label: 'Box' },
    { value: 'dozen', label: 'Lusin' }, { value: 'kg', label: 'Kg' }, { value: 'm', label: 'Meter' },
    { value: 'roll', label: 'Roll' }, { value: 'pack', label: 'Pack' }, { value: 'set', label: 'Set' },
  ];
  let showQuickItem = false;
  let quickItemTargetIndex = -1;
  let quickItemForm = { name: '', unit: 'pcs', unit_price: 0, category: '' };
  let quickItemPriceDisplay = '';
  let quickItemSaving = false;
  let quickItemTouched = { name: false };
  $: quickItemNameValid = quickItemForm.name.trim().length > 0;

  function openQuickItem(index) { showQuickItem = true; quickItemTargetIndex = index; quickItemForm = { name: '', unit: 'pcs', unit_price: 0, category: '' }; quickItemPriceDisplay = ''; quickItemTouched = { name: false }; }
  function closeQuickItem() { showQuickItem = false; quickItemTargetIndex = -1; }

  function handleQuickItemPriceInput(e) {
    const raw = e.target.value.replace(/\D/g, '');
    quickItemForm.unit_price = Number(raw) || 0;
    quickItemPriceDisplay = raw ? Number(raw).toLocaleString('id-ID') : '';
    e.target.value = quickItemPriceDisplay;
  }

  async function handleQuickItem() {
    quickItemTouched = { name: true };
    if (!quickItemNameValid) return;
    quickItemSaving = true;
    try {
      const result = await createItem({ item_name: quickItemForm.name.trim(), unit: quickItemForm.unit, unit_price: quickItemForm.unit_price, category: quickItemForm.category || undefined });
      if (result?.id && quickItemTargetIndex >= 0) {
        formItems[quickItemTargetIndex].item_id = String(result.id);
        formItems = formItems;
        onItemChange(quickItemTargetIndex);
      }
      closeQuickItem();
    } catch { /* handled by store */ } finally { quickItemSaving = false; }
  }

  // ── Filter panel ───────────────────────────────────────────────
  let showFilterPanel = false;
  let filters = {
    isUnpaid: false,
  };

  $: activeFilterCount = Object.values(filters).filter(Boolean).length;

  $: filteredTableData = tableData.filter(inv => {
    if (filters.isUnpaid && inv._payment_status === 'lunas')  return false;
    return true;
  });

  function clearFilters() {
    filters = { isUnpaid: false };
  }

  // ── Validation ─────────────────────────────────────────────────
  let touched = { customer: false };
  $: customerValid = !!form.customer_id;

  // ── Payment state ──────────────────────────────────────────────
  let paymentsList = [];
  let loadingPayments = false;
  let showPaymentForm = false;
  let editingPaymentId = null;
  let savingPayment = false;

  const emptyPaymentForm = () => ({
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'transfer',
    notes: ''
  });
  let paymentEntryForm = emptyPaymentForm();

  function normalizePayment(p) {
    return {
      ...p,
      amount: decimalToNumber(p.amount),
      payment_date: (p.payment_date || '').split('T')[0]
    };
  }

  function parsePaymentsList(result) {
    if (!result) return [];
    const raw = Array.isArray(result)
      ? result
      : (result.invoice_payments || result.payments || result.receipts || []);
    return raw.map(normalizePayment);
  }

  function paymentMethodLabel(method) {
    const map = { cash: 'Tunai', transfer: 'Transfer', check: 'Cek', other: 'Lainnya' };
    return map[method] || method || '-';
  }

  const num = v => { const n = Number(v); return isNaN(n) ? 0 : n; };

  /** @type {{ id:number|null, item_id:string, name:string, description:string, quantity:number, unit_price:number, unit:string, discount_amount:number, discount_type:string }[]} */
  let formItems = [{ id: null, item_id: '', name: '', description: '', quantity: 1, unit_price: 0, unit: 'pcs', discount_amount: 0, discount_type: 'rp' }];

  let form = {
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    po_number: '',
    tax_amount: 0,
    discount_amount: 0,
    shipping_cost: 0,
    notes: '',
  };

  const tableColumns = [
    { key: 'invoice_date',   label: 'Tanggal' },
    { key: 'invoice_number', label: 'Faktur' },
    { key: '_customer_name', label: 'Pelanggan' },
    { key: 'due_date',       label: 'Jatuh Tempo' },
    { key: '_total',         label: 'Total' },
    { key: 'total_paid',     label: 'Terbayar' },
    { key: '_payment_status', label: 'Status', sortable: false },
  ];

  function discountPerUnit(item) {
    return item.discount_type === 'pct'
      ? num(item.unit_price) * num(item.discount_amount) / 100
      : num(item.discount_amount);
  }
  $: subtotal = formItems.reduce((sum, i) => sum + num(i.quantity) * (num(i.unit_price) - discountPerUnit(i)), 0);
  $: totalAmount = subtotal - num(form.discount_amount) + num(form.shipping_cost) + num(form.tax_amount);
  $: derivedPayStatus = totalAmount <= (editingInvoice?.total_paid || 0) ? 'lunas' : (editingInvoice?.total_paid || 0) > 0 ? 'dp' : 'belum_bayar';

  $: tableData = $invoices.map(inv => {
    const itemsSubtotal = (inv.items || []).reduce((sum, i) => {
      const discType = (i.discount_type || '').toLowerCase();
      const discPerUnit = (discType === 'pct' || discType === 'persen')
        ? num(i.unit_price) * num(i.discount_amount) / 100
        : num(i.discount_amount);
      return sum + num(i.quantity) * (num(i.unit_price) - discPerUnit);
    }, 0);
    const computedTotal = itemsSubtotal - num(inv.discount_amount) + num(inv.shipping_cost) + num(inv.tax_amount);
    const computedPayStatus = computedTotal <= num(inv.total_paid)
      ? 'lunas'
      : num(inv.total_paid) > 0
      ? 'dp'
      : 'belum_bayar';
    return {
      ...inv,
      _customer_name: $customers.find(c => c.id === inv.customer_id)?.name || '-',
      _total: computedTotal,
      _payment_status: computedPayStatus,
    };
  });

  $: emptyText = !$selectedCompany?.id
    ? 'Pilih perusahaan terlebih dahulu'
    : 'Belum ada data invoice';

  // ── Company guard ──────────────────────────────────────────────
  let _loadedCompanyId = null;
  $: {
    const cid = $selectedCompany?.id || null;
    if (cid !== _loadedCompanyId) {
      _loadedCompanyId = cid;
      selectedIds = [];
      if (cid) { loadInvoices(); loadCustomers(); loadItems(); }
    }
  }

function getPaymentStatusBadge(paymentStatus) {
    const map = {
      lunas:       { label: 'Lunas',       cls: 'bg-green-500 text-white' },
      dp:          { label: 'DP',          cls: 'bg-yellow-500 text-white' },
      belum_bayar: { label: 'Belum Bayar', cls: 'bg-gray-400 text-white' }
    };
    return map[paymentStatus] || { label: '-', cls: 'bg-gray-200 text-gray-600' };
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // ── Numeric input helpers ──────────────────────────────────────
  function fmtNum(val) {
    const n = Number(String(val).replace(/\D/g, '')) || 0;
    return n > 0 ? n.toLocaleString('id-ID') : '';
  }

  let taxDisplay = '';
  let discountDisplay = '';
  let shippingDisplay = '';
  let paymentAmountDisplay = '';

  function handleTaxInput(e) {
    const raw = e.target.value.replace(/\D/g, '');
    form.tax_amount = Number(raw) || 0;
    taxDisplay = raw ? Number(raw).toLocaleString('id-ID') : '';
    e.target.value = taxDisplay;
  }
  function handleDiscountInput(e) {
    const raw = e.target.value.replace(/\D/g, '');
    form.discount_amount = Number(raw) || 0;
    discountDisplay = raw ? Number(raw).toLocaleString('id-ID') : '';
    e.target.value = discountDisplay;
  }
  function handleShippingInput(e) {
    const raw = e.target.value.replace(/\D/g, '');
    form.shipping_cost = Number(raw) || 0;
    shippingDisplay = raw ? Number(raw).toLocaleString('id-ID') : '';
    e.target.value = shippingDisplay;
  }
  function handleLineDiscountInput(e, index) {
    const item = formItems[index];
    if (item.discount_type === 'pct') {
      const raw = e.target.value.replace(/[^\d.]/g, '');
      const val = Math.min(100, parseFloat(raw) || 0);
      item.discount_amount = val;
      e.target.value = raw === '' ? '' : raw.replace(/^(\d{0,3})(\.\d*)?.*/, '$1$2');
    } else {
      const raw = e.target.value.replace(/\D/g, '');
      item.discount_amount = Number(raw) || 0;
      e.target.value = raw ? Number(raw).toLocaleString('id-ID') : '';
    }
    formItems = formItems;
  }

  function toggleDiscountType(index) {
    formItems[index].discount_type = formItems[index].discount_type === 'rp' ? 'pct' : 'rp';
    formItems[index].discount_amount = 0;
    formItems = formItems;
  }
  function handlePaymentAmountInput(e) {
    const raw = e.target.value.replace(/\D/g, '');
    paymentEntryForm.amount = Number(raw) || 0;
    paymentAmountDisplay = raw ? Number(raw).toLocaleString('id-ID') : '';
    e.target.value = paymentAmountDisplay;
  }

  // ── Modal open/close ───────────────────────────────────────────
  function openModal(invoice = null) {
    editingInvoice = invoice;
    activeTab = 'info';
    paymentsList = [];
    showPaymentForm = false;
    editingPaymentId = null;
    paymentEntryForm = emptyPaymentForm();
    touched = { customer: false };

    if (invoice) {
      form = {
        customer_id:     String(invoice.customer_id),
        invoice_date:    invoice.invoice_date,
        due_date:        invoice.due_date || '',
        po_number:       invoice.po_number || '',
        tax_amount:      invoice.tax_amount || 0,
        discount_amount: invoice.discount_amount || 0,
        shipping_cost:   invoice.shipping_cost || 0,
        notes:           invoice.notes || '',
      };
      formItems = (invoice.items || []).length > 0
        ? invoice.items.map(i => ({
            id: i.id ?? null,
            item_id: i.item_id ? String(i.item_id) : '',
            name: i.name || '',
            description: i.description || '',
            quantity: num(i.quantity) || 1,
            unit_price: num(i.unit_price) || 0,
            unit: i.unit || 'pcs',
            discount_amount: num(i.discount_amount) || 0,
            discount_type: i.discount_type === 'persen' ? 'pct' : 'rp'
          }))
        : [{ id: null, item_id: '', name: '', description: '', quantity: 1, unit_price: 0, unit: 'pcs', discount_amount: 0, discount_type: 'rp' }];
    } else {
      form = {
        customer_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '', po_number: '',
        tax_amount: 0, discount_amount: 0, shipping_cost: 0,
        notes: '',
      };
      formItems = [{ id: null, item_id: '', name: '', description: '', quantity: 1, unit_price: 0, unit: 'pcs', discount_amount: 0, discount_type: 'rp' }];
    }
    taxDisplay = fmtNum(form.tax_amount);
    discountDisplay = fmtNum(form.discount_amount);
    shippingDisplay = fmtNum(form.shipping_cost);
    paymentAmountDisplay = '';
    showModal = true;
  }

  function closeModal() {
    if (activeTab === 'info' && touched.customer && !customerValid) {
      shakeModal = true;
      return;
    }
    forceCloseModal();
  }

  function forceCloseModal() {
    showModal = false;
    editingInvoice = null;
    paymentsList = [];
    showPaymentForm = false;
    editingPaymentId = null;
    paymentEntryForm = emptyPaymentForm();
  }

  // ── Payments tab ───────────────────────────────────────────────
  async function switchToPaymentsTab() {
    activeTab = 'payments';
    showPaymentForm = false;
    editingPaymentId = null;
    if (editingInvoice) {
      loadingPayments = true;
      try {
        const result = await invoiceService.getPayments(editingInvoice.id);
        paymentsList = parsePaymentsList(result);
      } catch {
        paymentsList = [];
      } finally {
        loadingPayments = false;
      }
    }
  }

  async function handleAddPayment() {
    if (!editingInvoice) return;
    if (!paymentEntryForm.payment_date) { showError('Tanggal pembayaran wajib diisi'); return; }
    if (!(Number(paymentEntryForm.amount) > 0)) { showError('Jumlah pembayaran harus lebih dari 0'); return; }
    savingPayment = true;
    try {
      const refreshed = await addInvoicePayment(editingInvoice.id, {
        payment_date: paymentEntryForm.payment_date,
        amount: Number(paymentEntryForm.amount),
        payment_method: paymentEntryForm.payment_method,
        ...(paymentEntryForm.notes ? { notes: paymentEntryForm.notes } : {})
      });
      if (refreshed) editingInvoice = refreshed;
      const result = await invoiceService.getPayments(editingInvoice.id);
      paymentsList = parsePaymentsList(result);
      showPaymentForm = false;
      paymentEntryForm = emptyPaymentForm();
      paymentAmountDisplay = '';
      loadCustomers();
      success('Cicilan berhasil ditambahkan');
    } catch (err) {
      showError(err.message || 'Gagal menambah cicilan');
    } finally {
      savingPayment = false;
    }
  }

  function startEditPayment(payment) {
    editingPaymentId = payment.id;
    showPaymentForm = false;
    paymentEntryForm = {
      payment_date: (payment.payment_date || '').split('T')[0] || new Date().toISOString().split('T')[0],
      amount: decimalToNumber(payment.amount),
      payment_method: payment.payment_method || 'transfer',
      notes: payment.notes || ''
    };
    paymentAmountDisplay = fmtNum(paymentEntryForm.amount);
  }

  async function handleUpdatePayment(paymentId) {
    if (!editingInvoice) return;
    if (!(Number(paymentEntryForm.amount) > 0)) { showError('Jumlah pembayaran harus lebih dari 0'); return; }
    savingPayment = true;
    try {
      const refreshed = await updateInvoicePaymentEntry(editingInvoice.id, paymentId, {
        payment_date: paymentEntryForm.payment_date,
        amount: Number(paymentEntryForm.amount),
        payment_method: paymentEntryForm.payment_method,
        ...(paymentEntryForm.notes ? { notes: paymentEntryForm.notes } : {})
      });
      if (refreshed) editingInvoice = refreshed;
      const result = await invoiceService.getPayments(editingInvoice.id);
      paymentsList = parsePaymentsList(result);
      editingPaymentId = null;
      paymentEntryForm = emptyPaymentForm();
      paymentAmountDisplay = '';
      loadCustomers();
      success('Cicilan berhasil diperbarui');
    } catch (err) {
      showError(err.message || 'Gagal memperbarui cicilan');
    } finally {
      savingPayment = false;
    }
  }

  async function handleDeletePayment(paymentId) {
    const p = paymentsList.find(x => x.id === paymentId);
    const name = p ? `${p.payment_date} — ${formatCurrency(p.amount)}` : `#${paymentId}`;
    if (!await confirmDialog('Yakin ingin menghapus cicilan ini?')) return;
    try {
      const refreshed = await deleteInvoicePaymentEntry(editingInvoice.id, paymentId);
      if (refreshed) editingInvoice = refreshed;
      const result = await invoiceService.getPayments(editingInvoice.id);
      paymentsList = parsePaymentsList(result);
      if (editingPaymentId === paymentId) editingPaymentId = null;
      loadCustomers();
      success(`Cicilan "${name}" berhasil dihapus`);
    } catch (err) {
      showError(`Gagal menghapus cicilan "${name}"`);
    }
  }

  // ── Line items ─────────────────────────────────────────────────
  function addLineItem() {
    formItems = [...formItems, { id: null, item_id: '', name: '', description: '', quantity: 1, unit_price: 0, unit: 'pcs', discount_amount: 0, discount_type: 'rp' }];
  }

  function removeLineItem(index) {
    if (index === 0) {
      formItems[0] = { id: formItems[0].id ?? null, item_id: '', name: '', description: '', quantity: 1, unit_price: 0, unit: 'pcs', discount_amount: 0 };
      formItems = formItems;
    } else {
      formItems = formItems.filter((_, i) => i !== index);
    }
  }

  function onItemChange(index) {
    const lineItem = formItems[index];
    const master = lineItem.item_id ? $items.find(i => i.id === Number(lineItem.item_id)) : null;
    if (master) {
      lineItem.name = master.name;
      lineItem.description = master.description || '';
      lineItem.unit_price = Number(master.unit_price) || 0;
      lineItem.unit = master.unit || 'pcs';
    } else {
      lineItem.name = ''; lineItem.description = ''; lineItem.unit_price = 0; lineItem.unit = 'pcs';
    }
    formItems = [...formItems];
  }

  // ── Submit ─────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!$selectedCompany?.id) return;
    touched = { customer: true };
    if (!customerValid) { shakeModal = true; return; }
    if (!formItems.some(i => i.item_id)) { showError('Minimal satu item harus dipilih'); return; }

    const invoiceData = {
      customer_id:     Number(form.customer_id),
      invoice_date:    form.invoice_date,
      due_date:        form.due_date || undefined,
      po_number:       form.po_number || undefined,
      tax_amount:      num(form.tax_amount),
      discount_amount: num(form.discount_amount),
      shipping_cost:   num(form.shipping_cost),
      notes:           form.notes || '',
      items: formItems.filter(i => i.item_id).map(item => ({
        item_id:         Number(item.item_id),
        name:            item.name,
        description:     item.description || '',
        quantity:        num(item.quantity),
        unit:            item.unit || 'pcs',
        unit_price:      num(item.unit_price),
        discount_amount: num(item.discount_amount),
        discount_type:   item.discount_type === 'pct' ? 'persen' : 'Rp'
      }))
    };

    try {
      if (editingInvoice) {
        await updateInvoice(editingInvoice.id, invoiceData);
        success('Invoice berhasil diperbarui');
      } else {
        await addInvoice(invoiceData);
        success('Invoice berhasil ditambahkan');
      }
      forceCloseModal();
    } catch (err) {
      showError(err.message || 'Terjadi kesalahan');
    }
  }

  async function handleDelete(id) {
    const item = $invoices.find(i => i.id === id);
    const name = item?.invoice_number || `#${id}`;
    if (!await confirmDialog('Yakin ingin menghapus invoice ini? Akan gagal jika ada kuitansi atau surat jalan terhubung.')) return;
    try {
      await deleteInvoice(id);
      selectedIds = selectedIds.filter(i => i !== id);
      success(`"${name}" berhasil dihapus`);
    } catch { /* error toast ditampilkan oleh service layer */ }
  }

  async function handleBulkDelete() {
    if (!await confirmDialog(`Hapus ${selectedIds.length} invoice terpilih?`)) return;
    const toDelete = $invoices.filter(i => selectedIds.includes(i.id));
    const succeededIds = [], failedNames = [];
    for (const inv of toDelete) {
      try { await deleteInvoice(inv.id); succeededIds.push(inv.id); }
      catch { /* error toast ditampilkan oleh service layer */ }
    }
    selectedIds = selectedIds.filter(id => !succeededIds.includes(id));
    const succeededNames = toDelete.filter(i => succeededIds.includes(i.id)).map(i => i.invoice_number || `#${i.id}`);
    if (succeededNames.length) success(`Berhasil dihapus: ${succeededNames.join(', ')}`);
  }

  async function handleDownload(invoice) {
    downloadingId = invoice.id;
    try {
      await invoiceService.generate(invoice.id);
      const blob = await invoiceService.download(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success('Invoice berhasil diunduh');
    } catch {
      showError('Gagal mengunduh invoice');
    } finally { downloadingId = null; }
  }

  // ── Export ─────────────────────────────────────────────────────
  function handleExport() {
    if (!filteredTableData.length) { showError('Tidak ada data untuk diekspor'); return; }

    const rows = filteredTableData.map(inv => ({
      'Tanggal':       formatDate(inv.invoice_date),
      'No. Faktur':    inv.invoice_number    || '',
      'Pelanggan':     inv._customer_name    || '',
      'Jatuh Tempo':   formatDate(inv.due_date),
      'Total (Rp)':    Number(inv._total)    || 0,
      'Terbayar (Rp)': Number(inv.total_paid)|| 0,
      'Sisa (Rp)':     Math.max(0, (Number(inv._total) || 0) - (Number(inv.total_paid) || 0)),
      'Status Bayar':  inv._payment_status   || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch:14 },{ wch:18 },{ wch:30 },{ wch:14 },{ wch:16 },{ wch:16 },{ wch:16 },{ wch:14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');

    const companyName = ($selectedCompany?.name || 'Perusahaan').replace(/[/\\?%*:|"<>]/g, '-');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Invoice_${companyName}_${date}.xlsx`);
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
        placeholder="Cari Invoice"
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
        <h1 class="text-xl font-semibold text-gray-900">Invoice</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          Menampilkan data invoice{$selectedCompany ? ` ${$selectedCompany.name}` : ''}
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
                <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Filter Invoice</span>
                {#if activeFilterCount > 0}
                  <button on:click={clearFilters} class="text-xs text-blue-600 hover:underline">Reset</button>
                {/if}
              </div>
              <div class="py-2">
                {#each [
                  { key: 'isUnpaid', label: 'Belum lunas', desc: 'Pembayaran belum selesai' },
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
                  Menampilkan {filteredTableData.length} dari {tableData.length} invoice
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
          + Buat Invoice
        </button>
      </div>
    </div>

    <!-- Tabel -->
    <DataTable
      data={filteredTableData}
      columns={tableColumns}
      loading={$invoicesLoading}
      globalFilter={searchTerm}
      {selectedIds}
      on:selectionChange={(e) => { selectedIds = e.detail; }}
      emptyText={emptyText}
    >
      <svelte:fragment slot="row" let:row>
        {@const payBadge = getPaymentStatusBadge(row.original._payment_status)}
        <td class="px-4 py-3 text-sm text-gray-600">{formatDate(row.original.invoice_date)}</td>
        <td class="px-4 py-3">
          <button on:click={() => openModal(row.original)} class="text-sm font-semibold text-blue-600 hover:underline">
            {row.original.invoice_number}
          </button>
          {#if row.original.po_number}
            <p class="text-xs text-gray-400 mt-0.5">PO: {row.original.po_number}</p>
          {/if}
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original._customer_name}</td>
        <td class="px-4 py-3 text-sm text-gray-500">{formatDate(row.original.due_date)}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(row.original._total)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">{formatCurrency(row.original.total_paid)}</td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {payBadge.cls}">{payBadge.label}</span>
        </td>
      </svelte:fragment>
    </DataTable>
  </div>
</div>

<!-- Modal Invoice -->
<Modal bind:show={showModal} bind:shake={shakeModal}
  title={editingInvoice ? `Invoice: ${editingInvoice.invoice_number}` : 'Buat Invoice'}
  size="xl" on:close={closeModal}>

  <!-- Tab (hanya saat edit) -->
  {#if editingInvoice}
    <div class="flex border-b border-gray-200 mb-5 -mt-1">
      <button
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors {activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        on:click={() => activeTab = 'info'}
      >
        Info Invoice
      </button>
      <button
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors {activeTab === 'payments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        on:click={switchToPaymentsTab}
      >
        Cicilan Pembayaran
      </button>
    </div>
  {/if}

  <!-- Tab: Info Invoice -->
  {#if activeTab === 'info'}
    <form on:submit|preventDefault={handleSubmit} class="space-y-4">

      <!-- Pelanggan & No. PO -->
      <div class="grid grid-cols-2 gap-4">
        <!-- PELANGGAN (required) -->
        <div>
          <SearchableSelect
            label="PELANGGAN *"
            bind:value={form.customer_id}
            options={$customers.map(c => ({ value: String(c.id), label: c.name + (c.company_name ? ` - ${c.company_name}` : '') }))}
            placeholder="PILIH PELANGGAN"
            disabled={!!editingInvoice}
            createLabel="Tambahkan Pelanggan Baru"
            on:change={() => touched.customer = true}
            on:create={openQuickCustomer}
          />
          {#if touched.customer && !customerValid}
            <p class="text-red-500 text-xs mt-1 font-medium">PELANGGAN HARUS DIPILIH</p>
          {/if}
        </div>
        <!-- NO. PO -->
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">NO. PO PELANGGAN</label>
          <input type="text" bind:value={form.po_number} placeholder="OPSIONAL"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
        </div>
      </div>

      <!-- Tanggal & Jatuh Tempo -->
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">TANGGAL INVOICE</label>
          <input type="date" bind:value={form.invoice_date} disabled={!!editingInvoice}
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none disabled:text-gray-500" />
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">JATUH TEMPO</label>
          <input type="date" bind:value={form.due_date}
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none" />
        </div>
      </div>

      <!-- Daftar Item -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-3">
        <div class="flex justify-between items-center mb-2.5">
          <label class="text-xs font-semibold uppercase tracking-wide text-gray-400">
            ITEM INVOICE <span class="text-red-500">*</span>
          </label>
          <button type="button" on:click={addLineItem}
            class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            + Tambah Baris
          </button>
        </div>
        <div class="grid grid-cols-12 gap-1.5 mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <span class="col-span-3">Item</span>
          <span class="col-span-2">Deskripsi</span>
          <span class="col-span-1 text-center">Qty</span>
          <span class="col-span-2">Harga (Rupiah)</span>
          <span class="col-span-2">Diskon/Baris</span>
          <span class="col-span-2 text-right">Aksi</span>
        </div>
        <div class="space-y-1.5">
          {#each formItems as lineItem, i}
            <div class="grid grid-cols-12 gap-1.5 items-center">
              <div class="col-span-3">
                <SearchableSelect
                  label=""
                  bind:value={lineItem.item_id}
                  options={$items.filter(m => m.is_active).map(m => ({ value: String(m.id), label: m.name }))}
                  placeholder="Pilih item"
                  createLabel="Tambahkan Item Baru"
                  on:change={() => onItemChange(i)}
                  on:create={() => openQuickItem(i)}
                />
              </div>
              <input type="text" value={lineItem.description} placeholder="—"
                class="col-span-2 w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500 focus:outline-none" disabled />
              <input type="number" bind:value={lineItem.quantity} placeholder="1" min="1" step="1"
                class="col-span-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 text-center focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors" />
              <input type="text" value={fmtNum(lineItem.unit_price)} placeholder="—"
                class="col-span-2 w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500 focus:outline-none" disabled />
              <div class="col-span-2 flex items-center gap-1">
                <input
                  type="text"
                  inputmode="numeric"
                  value={lineItem.discount_type === 'pct' ? (lineItem.discount_amount > 0 ? String(lineItem.discount_amount) : '') : fmtNum(lineItem.discount_amount)}
                  on:input={(e) => handleLineDiscountInput(e, i)}
                  placeholder="0"
                  class="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
                />
                <button
                  type="button"
                  on:click={() => toggleDiscountType(i)}
                  class="shrink-0 px-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors
                    {lineItem.discount_type === 'pct'
                      ? 'border-blue-400 bg-blue-50 text-blue-600 hover:bg-blue-100'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}"
                  title="Ganti satuan diskon"
                >
                  {lineItem.discount_type === 'pct' ? '%' : 'Rp'}
                </button>
              </div>
              <div class="col-span-2 flex items-center justify-end gap-1">
                <button type="button" on:click={() => removeLineItem(i)}
                  class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Biaya tambahan -->
      <div class="grid grid-cols-3 gap-4">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">PAJAK (Rp)</label>
          <input type="text" inputmode="numeric" value={taxDisplay} on:input={handleTaxInput} placeholder="0"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none" />
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">DISKON INVOICE (Rp)</label>
          <input type="text" inputmode="numeric" value={discountDisplay} on:input={handleDiscountInput} placeholder="0"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none" />
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">ONGKOS KIRIM (Rp)</label>
          <input type="text" inputmode="numeric" value={shippingDisplay} on:input={handleShippingInput} placeholder="0"
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none" />
        </div>
      </div>

      <!-- Ringkasan total -->
      <div class="bg-gray-50 rounded-lg p-4 text-sm space-y-1.5">
        <div class="flex justify-between text-gray-600">
          <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
        </div>
        {#if num(form.discount_amount) > 0}
          <div class="flex justify-between text-gray-600">
            <span>Diskon Invoice</span><span class="text-red-500">- {formatCurrency(form.discount_amount)}</span>
          </div>
        {/if}
        {#if num(form.shipping_cost) > 0}
          <div class="flex justify-between text-gray-600">
            <span>Ongkos Kirim</span><span>{formatCurrency(form.shipping_cost)}</span>
          </div>
        {/if}
        {#if num(form.tax_amount) > 0}
          <div class="flex justify-between text-gray-600">
            <span>Pajak</span><span>{formatCurrency(form.tax_amount)}</span>
          </div>
        {/if}
        <div class="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-2">
          <span>Total</span><span>{formatCurrency(totalAmount)}</span>
        </div>
        {#if editingInvoice && editingInvoice.total_paid > 0}
          {@const overpay = Math.max(0, editingInvoice.total_paid - totalAmount)}
          <div class="flex justify-between text-green-600 text-sm">
            <span>Sudah Dibayar</span>
            <div class="text-right">
              <span>{formatCurrency(overpay > 0 ? totalAmount : editingInvoice.total_paid)}</span>
              {#if overpay > 0}
                <div class="text-xs text-green-500">(+{formatCurrency(overpay)})</div>
              {/if}
            </div>
          </div>
          <div class="flex justify-between font-semibold text-sm {Math.max(0, totalAmount - editingInvoice.total_paid) > 0 ? 'text-red-600' : 'text-green-600'}">
            <span>Sisa</span><span>{formatCurrency(Math.max(0, totalAmount - editingInvoice.total_paid))}</span>
          </div>
        {/if}
      </div>

      <!-- Catatan -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">CATATAN</label>
        <textarea bind:value={form.notes} rows="2" placeholder="CATATAN TAMBAHAN..."
          class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 resize-none"></textarea>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center justify-between pt-4">
        <div>
          {#if editingInvoice}
            <button
              type="button"
              on:click={() => handleDownload(editingInvoice)}
              disabled={downloadingId === editingInvoice.id}
              class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloadingId === editingInvoice.id ? 'Mengunduh...' : 'Unduh PDF'}
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
            class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
            </svg>
            {editingInvoice ? 'SIMPAN' : 'BUAT INVOICE'}
          </button>
        </div>
      </div>
    </form>
  {/if}

  <!-- Tab: Cicilan Pembayaran -->
  {#if activeTab === 'payments'}
    <div class="space-y-4">

      <!-- Ringkasan totals -->
      <div class="grid grid-cols-4 gap-3">
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">TOTAL INVOICE</label>
          <p class="text-sm font-semibold text-gray-900">{formatCurrency(totalAmount)}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">TERBAYAR</label>
          <p class="text-sm font-semibold text-green-600">
            {formatCurrency(editingInvoice.total_paid > totalAmount ? totalAmount : editingInvoice.total_paid)}
          </p>
          {#if editingInvoice.total_paid > totalAmount}
            <p class="text-xs text-green-500">(+{formatCurrency(editingInvoice.total_paid - totalAmount)})</p>
          {/if}
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">SISA</label>
          <p class="text-sm font-semibold {Math.max(0, totalAmount - editingInvoice.total_paid) > 0 ? 'text-red-600' : 'text-green-600'}">
            {formatCurrency(Math.max(0, totalAmount - editingInvoice.total_paid))}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">STATUS</label>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getPaymentStatusBadge(derivedPayStatus).cls}">
            {getPaymentStatusBadge(derivedPayStatus).label}
          </span>
        </div>
      </div>

      <!-- Daftar cicilan -->
      {#if loadingPayments}
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      {:else if paymentsList.length === 0}
        <div class="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-400">
          Belum ada cicilan pembayaran
        </div>
      {:else}
        <div class="space-y-2">
          {#each paymentsList as payment (payment.id)}
            {#if editingPaymentId === payment.id}
              <!-- Edit form -->
              <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-3 space-y-3">
                <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">EDIT CICILAN</label>
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-lg border border-gray-200 bg-white px-3 pt-2 pb-2">
                    <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">TANGGAL</label>
                    <input type="date" bind:value={paymentEntryForm.payment_date}
                      class="w-full bg-transparent text-sm text-gray-800 focus:outline-none" />
                  </div>
                  <div class="rounded-lg border border-gray-200 bg-white px-3 pt-2 pb-2">
                    <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">JUMLAH (Rp)</label>
                    <input type="text" inputmode="numeric" value={paymentAmountDisplay} on:input={handlePaymentAmountInput} placeholder="0"
                      class="w-full bg-transparent text-sm text-gray-800 focus:outline-none" />
                  </div>
                  <SearchableSelect
                    label="METODE"
                    bind:value={paymentEntryForm.payment_method}
                    options={[
                      { value: 'cash',     label: 'Tunai' },
                      { value: 'transfer', label: 'Transfer' },
                      { value: 'check',    label: 'Cek' },
                      { value: 'other',    label: 'Lainnya' },
                    ]}
                    placeholder="PILIH METODE"
                  />
                  <div class="rounded-lg border border-gray-200 bg-white px-3 pt-2 pb-2">
                    <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">CATATAN</label>
                    <input type="text" bind:value={paymentEntryForm.notes} placeholder="OPSIONAL"
                      class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
                  </div>
                </div>
                <div class="flex items-center justify-between pt-1">
                  <button type="button"
                    on:click={() => { editingPaymentId = null; paymentEntryForm = emptyPaymentForm(); paymentAmountDisplay = ''; }}
                    class="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    BATAL
                  </button>
                  <button type="button" disabled={savingPayment} on:click={() => handleUpdatePayment(payment.id)}
                    class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
                    </svg>
                    {savingPayment ? 'MENYIMPAN...' : 'SIMPAN'}
                  </button>
                </div>
              </div>
            {:else}
              <!-- Display row -->
              <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-800">{formatDate(payment.payment_date)}</p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    {paymentMethodLabel(payment.payment_method)}{payment.notes ? ` · ${payment.notes}` : ''}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <p class="text-sm font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                  <button type="button" on:click={() => startEditPayment(payment)}
                    class="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit cicilan">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button type="button" on:click={() => handleDeletePayment(payment.id)}
                    class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Hapus cicilan">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}

      <!-- Form tambah cicilan -->
      {#if showPaymentForm}
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-3 space-y-3">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">TAMBAH CICILAN</label>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg border border-gray-200 bg-white px-3 pt-2 pb-2">
              <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">TANGGAL PEMBAYARAN</label>
              <input type="date" bind:value={paymentEntryForm.payment_date}
                class="w-full bg-transparent text-sm text-gray-800 focus:outline-none" />
            </div>
            <div class="rounded-lg border border-gray-200 bg-white px-3 pt-2 pb-2">
              <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">JUMLAH (Rp) *</label>
              <input type="text" inputmode="numeric" value={paymentAmountDisplay} on:input={handlePaymentAmountInput} placeholder="0"
                class="w-full bg-transparent text-sm text-gray-800 focus:outline-none" />
            </div>
            <SearchableSelect
              label="METODE PEMBAYARAN"
              bind:value={paymentEntryForm.payment_method}
              options={[
                { value: 'cash',     label: 'Tunai' },
                { value: 'transfer', label: 'Transfer' },
                { value: 'check',    label: 'Cek' },
                { value: 'other',    label: 'Lainnya' },
              ]}
              placeholder="PILIH METODE"
            />
            <div class="rounded-lg border border-gray-200 bg-white px-3 pt-2 pb-2">
              <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">CATATAN</label>
              <input type="text" bind:value={paymentEntryForm.notes} placeholder="OPSIONAL"
                class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
            </div>
          </div>
          <div class="flex items-center justify-between pt-1">
            <button type="button"
              on:click={() => { showPaymentForm = false; paymentEntryForm = emptyPaymentForm(); paymentAmountDisplay = ''; }}
              class="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              BATAL
            </button>
            <button type="button" disabled={savingPayment} on:click={handleAddPayment}
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
              </svg>
              {savingPayment ? 'MENYIMPAN...' : 'SIMPAN CICILAN'}
            </button>
          </div>
        </div>
      {:else if editingPaymentId === null}
        <button type="button"
          class="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
          on:click={() => showPaymentForm = true}>
          + Tambah Cicilan
        </button>
      {/if}

      <div class="flex justify-end pt-2 border-t border-gray-100">
        <button type="button" on:click={forceCloseModal}
          class="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          TUTUP
        </button>
      </div>
    </div>
  {/if}
</Modal>

<!-- Quick-add Pelanggan -->
<Modal bind:show={showQuickCustomer} title="Tambah Pelanggan Baru" size="md" on:close={closeQuickCustomer}>
  <form on:submit|preventDefault={handleQuickCustomer} class="space-y-4">

    <div>
      <div class="relative rounded-lg border px-3 pt-2 pb-2 transition-colors
        {quickCustomerTouched.name
          ? (quickCustomerNameValid ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
          : 'border-gray-200 bg-gray-50'}">
        <label class="block text-xs font-semibold uppercase tracking-wide
          {quickCustomerTouched.name
            ? (quickCustomerNameValid ? 'text-green-600' : 'text-red-500')
            : 'text-gray-400'}">
          NAMA <span class="text-red-500">*</span>
        </label>
        <input type="text" bind:value={quickCustomerForm.name}
          on:blur={() => quickCustomerTouched.name = true}
          placeholder="NAMA PELANGGAN" maxlength="255"
          class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
        {#if quickCustomerTouched.name && quickCustomerNameValid}
          <div class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        {/if}
      </div>
      {#if quickCustomerTouched.name && !quickCustomerNameValid}
        <p class="text-red-500 text-xs mt-1 font-medium">NAMA HARUS DIISI</p>
      {/if}
    </div>

    <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
      <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">NO. TELEPON</label>
      <input type="text" bind:value={quickCustomerForm.phone} placeholder="OPSIONAL"
        class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
    </div>

    <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
      <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">EMAIL</label>
      <input type="email" bind:value={quickCustomerForm.email} placeholder="OPSIONAL"
        class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
    </div>

    <div class="flex items-center justify-between pt-2">
      <button type="button" on:click={closeQuickCustomer}
        class="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        BATAL
      </button>
      <button type="submit" disabled={quickCustomerSaving}
        class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
        </svg>
        TAMBAH
      </button>
    </div>
  </form>
</Modal>

<!-- Quick-add Item -->
<Modal bind:show={showQuickItem} title="Tambah Item Baru" size="md" on:close={closeQuickItem}>
  <form on:submit|preventDefault={handleQuickItem} class="space-y-4">

    <div>
      <div class="relative rounded-lg border px-3 pt-2 pb-2 transition-colors
        {quickItemTouched.name
          ? (quickItemNameValid ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
          : 'border-gray-200 bg-gray-50'}">
        <label class="block text-xs font-semibold uppercase tracking-wide
          {quickItemTouched.name
            ? (quickItemNameValid ? 'text-green-600' : 'text-red-500')
            : 'text-gray-400'}">
          NAMA ITEM <span class="text-red-500">*</span>
        </label>
        <input type="text" bind:value={quickItemForm.name}
          on:blur={() => quickItemTouched.name = true}
          placeholder="NAMA ITEM" maxlength="255"
          class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
        {#if quickItemTouched.name && quickItemNameValid}
          <div class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        {/if}
      </div>
      {#if quickItemTouched.name && !quickItemNameValid}
        <p class="text-red-500 text-xs mt-1 font-medium">NAMA ITEM HARUS DIISI</p>
      {/if}
    </div>

    <div class="grid grid-cols-2 gap-4">
      <SearchableSelect label="SATUAN" bind:value={quickItemForm.unit}
        options={unitOptions} placeholder="PILIH SATUAN" />
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">HARGA SATUAN (Rp)</label>
        <input type="text" inputmode="numeric" value={quickItemPriceDisplay}
          on:input={handleQuickItemPriceInput} placeholder="0"
          class="w-full bg-transparent text-sm text-gray-800 focus:outline-none" />
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
      <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">KATEGORI</label>
      <input type="text" bind:value={quickItemForm.category} placeholder="OPSIONAL"
        class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300" />
    </div>

    <div class="flex items-center justify-between pt-2">
      <button type="button" on:click={closeQuickItem}
        class="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        BATAL
      </button>
      <button type="submit" disabled={quickItemSaving || $itemsLoading}
        class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
        </svg>
        TAMBAH
      </button>
    </div>
  </form>
</Modal>
