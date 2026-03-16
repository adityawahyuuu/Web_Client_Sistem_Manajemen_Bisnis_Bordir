<script>
  import { customers, customersLoading, loadCustomers, addCustomer, updateCustomer, deleteCustomer } from '../stores/customers.js';
  import { invoices, loadInvoices, decimalToNumber } from '../stores/invoices.js';
  import { items, loadItems } from '../stores/items.js';
  import { selectedCompany } from '../stores/company.js';
  import { success, error as showError, confirmDialog } from '../stores/notifications.js';
  import { itemService } from '../services/item.service.js';
  import api from '../services/api.js';
  import * as XLSX from 'xlsx';
  import Modal from '../components/Modal.svelte';
  import CompanySelector from '../components/CompanySelector.svelte';
  import DataTable from '../components/DataTable.svelte';
  import SearchableSelect from '../components/SearchableSelect.svelte';
  import { sidebarOpen } from '../stores/ui.js';

  const num = v => { const n = Number(v); return isNaN(n) ? 0 : n; };

  // ── Country codes ──────────────────────────────────────────────
  const countryCodes = [
    { code: '62', flag: '🇮🇩', name: 'Indonesia' },
    { code: '60', flag: '🇲🇾', name: 'Malaysia' },
    { code: '65', flag: '🇸🇬', name: 'Singapura' },
    { code: '61', flag: '🇦🇺', name: 'Australia' },
    { code: '1',  flag: '🇺🇸', name: 'Amerika' },
  ];

  // ── Page state ─────────────────────────────────────────────────
  let searchTerm = '';
  let selectedIds = [];
  let showModal = false;
  let shakeModal = false;
  let editingCustomer = null;
  let activeTab = 'info';

  // ── Filter panel ───────────────────────────────────────────────
  let showFilterPanel = false;
  let filters = {
    hasPiutang:     false,   // Ada piutang (belum lunas)
    hasEmail:       false,   // Memiliki email
    hasMobilePhone: false,   // Memiliki No. HP
    hasPhone:       false,   // Memiliki No. Telp.
    hasCompany:     false,   // Terdaftar di perusahaan
    hasAddress:     false,   // Memiliki data alamat
  };

  $: activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Hitung piutang per pelanggan dari data invoice (termasuk diskon item)
  $: customerPiutangMap = (() => {
    const map = new Map();
    for (const inv of $invoices) {
      const itemsSubtotal = (inv.items || []).reduce((sum, i) => {
        const discType = (i.discount_type || '').toLowerCase();
        const discPerUnit = (discType === 'pct' || discType === 'persen')
          ? num(i.unit_price) * num(i.discount_amount) / 100
          : num(i.discount_amount);
        return sum + num(i.quantity) * (num(i.unit_price) - discPerUnit);
      }, 0);
      const computedTotal = itemsSubtotal - num(inv.discount_amount) + num(inv.shipping_cost) + num(inv.tax_amount);
      const sisa    = Math.max(0, computedTotal - num(inv.total_paid));
      const overpay = Math.max(0, num(inv.total_paid) - computedTotal);
      if (!map.has(inv.customer_id)) map.set(inv.customer_id, { piutang: 0, overpay: 0 });
      const entry = map.get(inv.customer_id);
      entry.piutang += sisa;
      entry.overpay += overpay;
    }
    return map;
  })();

  // Timpa piutang & overpay dari backend dengan nilai yang sudah terkoreksi
  $: customersEnriched = $customers.map(c => {
    const p = customerPiutangMap.get(c.id);
    return { ...c, piutang: p?.piutang ?? 0, overpay: p?.overpay ?? 0 };
  });

  $: filteredCustomers = customersEnriched.filter(c => {
    if (filters.hasPiutang     && !(Number(c.piutang) > 0)) return false;
    if (filters.hasEmail       && !c.email)                  return false;
    if (filters.hasMobilePhone && !c.mobile_phone)           return false;
    if (filters.hasPhone       && !c.phone)                  return false;
    if (filters.hasCompany     && !c.company_name)           return false;
    if (filters.hasAddress     && !c.province_code)          return false;
    return true;
  });

  function clearFilters() {
    filters = {
      hasPiutang: false, hasEmail: false, hasMobilePhone: false,
      hasPhone: false, hasCompany: false, hasAddress: false,
    };
  }

  // ── Customer items (harga khusus) ──────────────────────────────
  let customerItems = [];
  let customerItemsLoading = false;
  let showAddItemForm = false;
  let addItemForm = { item_id: '', custom_price: 0, notes: '' };
  let customPriceDisplay = '';
  let savingCustomerItem = false;

  function onCustomPriceInput(e) {
    const digits = e.target.value.replace(/\D/g, '');
    addItemForm.custom_price = digits ? Number(digits) : 0;
    customPriceDisplay = digits ? Number(digits).toLocaleString('id-ID') : '';
    e.target.value = customPriceDisplay;
  }

  // ── Location master data ───────────────────────────────────────
  let provinces = [];
  let cities = [];
  let subdistricts = [];
  let villages = [];
  let provincesLoading = false;
  let citiesLoading = false;
  let subdistrictsLoading = false;
  let villagesLoading = false;

  // ── Form validation touched state ──────────────────────────────
  let touched = { name: false, email: false, mobilePhone: false, phone: false };

  // ── Form state ─────────────────────────────────────────────────
  let form = {
    name: '',
    company_name: '',
    email: '',
    mobile_phone_raw: '',
    mobile_phone_code: '62',
    phone_raw: '',
    phone_code: '62',
    address: '',
    province_code: '',
    city_code: '',
    subdistrict_code: '',
    village_code: '',
    postal_code: '',
  };

  // ── Reactive validation ────────────────────────────────────────
  $: nameValid        = form.name.trim().length > 0;
  $: emailValid       = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  $: mobilePhoneNormalized = form.mobile_phone_raw.trim() ? (parsePhoneForSubmit(form.mobile_phone_raw, form.mobile_phone_code) ?? '') : '';
  $: phoneNormalized       = form.phone_raw.trim()       ? (parsePhoneForSubmit(form.phone_raw, form.phone_code) ?? '')               : '';
  // Prefix (62/0/nothing) dihitung sebagai 1, sisa digit dihitung apa adanya
  $: mobilePhoneDigits = mobilePhoneNormalized ? (mobilePhoneNormalized.length - form.mobile_phone_code.length + 1) : 0;
  $: phoneDigits       = phoneNormalized       ? (phoneNormalized.length - form.phone_code.length + 1)               : 0;
  $: mobilePhoneValid  = !form.mobile_phone_raw.trim() || (mobilePhoneDigits >= 11 && mobilePhoneDigits <= 15);
  $: phoneValid        = !form.phone_raw.trim()        || (phoneDigits >= 11 && phoneDigits <= 15);

  // ── Reactive flag display ──────────────────────────────────────
  $: mobilePhoneFlag = countryCodes.find(c => c.code === form.mobile_phone_code)?.flag ?? '🇮🇩';
  $: phoneFlag       = countryCodes.find(c => c.code === form.phone_code)?.flag ?? '🇮🇩';

  const tableColumns = [
    { key: 'name',         label: 'Nama' },
    { key: 'company_name', label: 'Nama Perusahaan' },
    { key: 'email',        label: 'Email' },
    { key: 'mobile_phone', label: 'No. HP', sortable: false },
    { key: 'phone',        label: 'No. Telpon', sortable: false },
    { key: 'piutang',      label: 'Piutang' },
  ];

  $: emptyText = !$selectedCompany?.id
    ? 'Pilih perusahaan terlebih dahulu'
    : 'Belum ada data pelanggan';

  $: availableItems = $items.filter(item =>
    item.is_active !== false && !customerItems.some(ci => ci.item_id === item.id)
  );

  // Guard: hanya reset selectedIds & reload saat company benar-benar berganti
  let _loadedCompanyId = null;
  $: {
    const cid = $selectedCompany?.id || null;
    if (cid !== _loadedCompanyId) {
      _loadedCompanyId = cid;
      selectedIds = [];
      if (cid) { loadCustomers(); loadItems(); loadInvoices(); }
    }
  }

  // ── Phone helpers ──────────────────────────────────────────────
  function displayPhone(phone) {
    if (!phone) return '-';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('62')) return '0' + digits.slice(2);
    return digits;
  }

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

  // ── Location loaders ───────────────────────────────────────────
  async function loadProvinces() {
    if (provinces.length > 0) return;
    provincesLoading = true;
    try {
      const res = await api.get('/master/provinces');
      provinces = res.data ?? res ?? [];
    } catch { provinces = []; }
    finally { provincesLoading = false; }
  }

  async function onProvinceChange() {
    form.city_code = '';
    form.subdistrict_code = '';
    form.village_code = '';
    form.postal_code = '';
    cities = []; subdistricts = []; villages = [];
    if (!form.province_code) return;
    citiesLoading = true;
    try {
      const res = await api.get(`/master/cities?province_code=${form.province_code}`);
      cities = res.data ?? res ?? [];
    } catch { cities = []; }
    finally { citiesLoading = false; }
  }

  async function onCityChange() {
    form.subdistrict_code = '';
    form.village_code = '';
    form.postal_code = '';
    subdistricts = []; villages = [];
    if (!form.city_code) return;
    subdistrictsLoading = true;
    try {
      const res = await api.get(`/master/subdistricts?city_code=${form.city_code}`);
      subdistricts = res.data ?? res ?? [];
    } catch { subdistricts = []; }
    finally { subdistrictsLoading = false; }
  }

  async function onSubdistrictChange() {
    form.village_code = '';
    form.postal_code = '';
    villages = [];
    if (!form.subdistrict_code) return;
    villagesLoading = true;
    try {
      const res = await api.get(`/master/villages?subdistrict_code=${form.subdistrict_code}`);
      villages = res.data ?? res ?? [];
    } catch { villages = []; }
    finally { villagesLoading = false; }
  }

  function onVillageChange() {
    if (!form.village_code) { form.postal_code = ''; return; }
    const v = villages.find(v => String(v.code) === String(form.village_code));
    form.postal_code = v?.postal_code ?? '';
  }

  // ── Modal open/close ───────────────────────────────────────────
  async function openModal(customer = null) {
    editingCustomer = customer;
    activeTab = 'info';
    customerItems = [];
    showAddItemForm = false;
    addItemForm = { item_id: '', custom_price: 0, notes: '' }; customPriceDisplay = '';
    touched = { name: false, email: false, mobilePhone: false, phone: false };

    await loadProvinces();

    if (customer) {
      form = {
        name:               customer.name          || '',
        company_name:       customer.company_name  || '',
        email:              customer.email         || '',
        mobile_phone_raw:   stripCountryCode(customer.mobile_phone, '62'),
        mobile_phone_code:  '62',
        phone_raw:          stripCountryCode(customer.phone, '62'),
        phone_code:         '62',
        address:            customer.address        || '',
        province_code:      customer.province_code  || '',
        city_code:          customer.city_code      || '',
        subdistrict_code:   customer.subdistrict_code || '',
        village_code:       customer.village_code   || '',
        postal_code:        customer.postal_code    || '',
      };

      // Re-hydrate cascade dropdowns
      cities = []; subdistricts = []; villages = [];
      if (customer.province_code) {
        citiesLoading = true;
        try {
          const res = await api.get(`/master/cities?province_code=${customer.province_code}`);
          cities = res.data ?? res ?? [];
        } catch { cities = []; } finally { citiesLoading = false; }
      }
      if (customer.city_code) {
        subdistrictsLoading = true;
        try {
          const res = await api.get(`/master/subdistricts?city_code=${customer.city_code}`);
          subdistricts = res.data ?? res ?? [];
        } catch { subdistricts = []; } finally { subdistrictsLoading = false; }
      }
      if (customer.subdistrict_code) {
        villagesLoading = true;
        try {
          const res = await api.get(`/master/villages?subdistrict_code=${customer.subdistrict_code}`);
          villages = res.data ?? res ?? [];
        } catch { villages = []; } finally { villagesLoading = false; }
      }

      loadCustomerItems(customer.id);
    } else {
      form = {
        name: '', company_name: '', email: '',
        mobile_phone_raw: '', mobile_phone_code: '62',
        phone_raw: '', phone_code: '62',
        address: '', province_code: '', city_code: '',
        subdistrict_code: '', village_code: '', postal_code: '',
      };
      cities = []; subdistricts = []; villages = [];
    }
    showModal = true;
  }

  function closeModal() {
    const hasInvalidTouched =
      (touched.name && !nameValid) ||
      (touched.email && !emailValid) ||
      (touched.mobilePhone && !mobilePhoneValid) ||
      (touched.phone && !phoneValid);
    if (hasInvalidTouched) { shakeModal = true; return; }

    forceCloseModal();
  }

  function forceCloseModal() {
    showModal = false;
    editingCustomer = null;
    customerItems = [];
    showAddItemForm = false;
  }

  // ── Submit ─────────────────────────────────────────────────────
  async function handleSubmit() {
    touched = { name: true, email: true, mobilePhone: true, phone: true };
    if (!nameValid || !emailValid || !mobilePhoneValid || !phoneValid) { shakeModal = true; return; }

    const data = {
      name:             form.name.trim(),
      company_name:     form.company_name  || undefined,
      email:            form.email.trim()  || undefined,
      phone:            parsePhoneForSubmit(form.phone_raw, form.phone_code),
      mobile_phone:     parsePhoneForSubmit(form.mobile_phone_raw, form.mobile_phone_code),
      address:          form.address       || undefined,
      province_code:    form.province_code    || undefined,
      city_code:        form.city_code        || undefined,
      subdistrict_code: form.subdistrict_code || undefined,
      village_code:     form.village_code     || undefined,
      postal_code:      form.postal_code      || undefined,
    };

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, data);
        success('Pelanggan berhasil diperbarui');
      } else {
        await addCustomer(data);
        success('Pelanggan berhasil ditambahkan');
      }
      closeModal();
    } catch (err) {
      showError(err.message || 'Terjadi kesalahan');
    }
  }

  // ── Customer items ─────────────────────────────────────────────
  async function loadCustomerItems(customerId) {
    customerItemsLoading = true;
    try {
      const result = await itemService.getCustomerItems(customerId);
      customerItems = result?.data || [];
    } catch { customerItems = []; }
    finally { customerItemsLoading = false; }
  }

  async function handleAddCustomerItem() {
    if (!addItemForm.item_id) { showError('Pilih item terlebih dahulu'); return; }
    savingCustomerItem = true;
    try {
      await itemService.createCustomerItem(editingCustomer.id, {
        id: Number(addItemForm.item_id),
        custom_price: Number(addItemForm.custom_price) || undefined,
        notes: addItemForm.notes || undefined
      });
      success('Harga khusus item berhasil ditambahkan');
      showAddItemForm = false;
      addItemForm = { item_id: '', custom_price: 0, notes: '' }; customPriceDisplay = '';
      await loadCustomerItems(editingCustomer.id);
    } catch (err) {
      showError(err.message || 'Gagal menambah harga khusus');
    } finally { savingCustomerItem = false; }
  }

  async function handleDeleteCustomerItem(customerItemId) {
    const ci = customerItems.find(x => x.id === customerItemId);
    const name = ci?.item_name || getItemName(ci?.item_id) || `#${customerItemId}`;
    if (!await confirmDialog('Hapus harga khusus item ini?')) return;
    try {
      await itemService.deleteCustomerItem(editingCustomer.id, customerItemId);
      customerItems = customerItems.filter(x => x.id !== customerItemId);
      success(`Harga khusus "${name}" berhasil dihapus`);
    } catch (err) {
      showError(`Gagal menghapus harga khusus "${name}"`);
    }
  }

  async function handleBulkDelete() {
    if (!await confirmDialog(`Hapus ${selectedIds.length} pelanggan terpilih?`)) return;
    const toDelete = $customers.filter(c => selectedIds.includes(c.id));
    const succeededIds = [], failedNames = [];
    for (const c of toDelete) {
      try { await deleteCustomer(c.id); succeededIds.push(c.id); }
      catch { failedNames.push(c.name || `#${c.id}`); }
    }
    selectedIds = selectedIds.filter(id => !succeededIds.includes(id));
    const succeededNames = toDelete.filter(c => succeededIds.includes(c.id)).map(c => c.name || `#${c.id}`);
    if (succeededNames.length) success(`Berhasil dihapus: ${succeededNames.join(', ')}`);
    if (failedNames.length) showError(`Gagal dihapus: ${failedNames.join(', ')}`);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function handleExport() {
    if (!filteredCustomers.length) { showError('Tidak ada data untuk diekspor'); return; }

    const rows = filteredCustomers.map(c => ({
      'Nama':             c.name         || '',
      'Nama Perusahaan':  c.company_name || '',
      'Email':            c.email        || '',
      'No. HP':           c.mobile_phone ? displayPhone(c.mobile_phone) : '',
      'No. Telp.':        c.phone        ? displayPhone(c.phone)        : '',
      'Piutang (Rp)':     Number(c.piutang) || 0,
      'Alamat':           c.address      || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set lebar kolom
    ws['!cols'] = [
      { wch: 30 }, // Nama
      { wch: 30 }, // Nama Perusahaan
      { wch: 30 }, // Email
      { wch: 18 }, // No. HP
      { wch: 18 }, // No. Telp.
      { wch: 18 }, // Piutang
      { wch: 40 }, // Alamat
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pelanggan');

    const companyName = ($selectedCompany?.name || 'Perusahaan').replace(/[/\\?%*:|"<>]/g, '-');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Pelanggan_${companyName}_${date}.xlsx`);
  }

  function getItemName(itemId) {
    const found = $items.find(i => i.id === itemId);
    return found ? `${found.name} (${found.sku || '-'})` : `Item #${itemId}`;
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
        placeholder="Cari Pelanggan"
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
        <h1 class="text-xl font-semibold text-gray-900">Pelanggan</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          Menampilkan data pelanggan{$selectedCompany ? ` ${$selectedCompany.name}` : ''}
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
            <!-- Backdrop -->
            <div class="fixed inset-0 z-10" on:click={() => showFilterPanel = false}></div>
            <!-- Panel -->
            <div class="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 z-20 w-56 sm:w-60 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Filter Pelanggan</span>
                {#if activeFilterCount > 0}
                  <button on:click={clearFilters} class="text-xs text-blue-600 hover:underline">Reset</button>
                {/if}
              </div>
              <div class="py-2">
                {#each [
                  { key: 'hasPiutang',     label: 'Ada piutang',           desc: 'Belum lunas' },
                  { key: 'hasEmail',       label: 'Memiliki email',         desc: '' },
                  { key: 'hasMobilePhone', label: 'Memiliki No. HP',        desc: '' },
                  { key: 'hasPhone',       label: 'Memiliki No. Telp.',     desc: '' },
                  { key: 'hasCompany',     label: 'Terdaftar di perusahaan', desc: '' },
                  { key: 'hasAddress',     label: 'Memiliki alamat',        desc: 'Ada data provinsi' },
                ] as f}
                  <label class="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      bind:checked={filters[f.key]}
                      class="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer accent-blue-600"
                    />
                    <div>
                      <p class="text-sm text-gray-700">{f.label}</p>
                      {#if f.desc}
                        <p class="text-xs text-gray-400">{f.desc}</p>
                      {/if}
                    </div>
                  </label>
                {/each}
              </div>
              {#if activeFilterCount > 0}
                <div class="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                  Menampilkan {filteredCustomers.length} dari {$customers.length} pelanggan
                </div>
              {/if}
            </div>
          {/if}
        </div>
        <button
          on:click={handleExport}
          disabled={!$selectedCompany?.id || !filteredCustomers.length}
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
          + <span class="hidden sm:inline">Tambah </span>Pelanggan
        </button>
      </div>
    </div>

    <!-- Tabel -->
    <DataTable
      data={filteredCustomers}
      columns={tableColumns}
      loading={$customersLoading}
      globalFilter={searchTerm}
      {selectedIds}
      on:selectionChange={(e) => { selectedIds = e.detail; }}
      emptyText={emptyText}
    >
      <svelte:fragment slot="row" let:row>
        <td class="px-4 py-3">
          <button
            on:click={() => openModal(row.original)}
            class="text-sm font-semibold text-blue-600 hover:underline text-left"
          >
            {row.original.name}
          </button>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original.company_name || '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original.email || '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original.mobile_phone ? displayPhone(row.original.mobile_phone) : '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-600">{row.original.phone ? displayPhone(row.original.phone) : '-'}</td>
        <td class="px-4 py-3 text-sm">
          {#if row.original.piutang > 0}
            <span class="text-red-600 font-medium">{formatCurrency(row.original.piutang)}</span>
          {:else if row.original.overpay > 0}
            <div title="{row.original.name} membayar lebih sebesar {formatCurrency(row.original.overpay)}">
              <span class="text-gray-400">{formatCurrency(0)}</span>
              <div class="text-xs text-green-500">(+{formatCurrency(row.original.overpay)})</div>
            </div>
          {:else}
            <span class="text-gray-400">{formatCurrency(0)}</span>
          {/if}
        </td>
      </svelte:fragment>
    </DataTable>
  </div>
</div>

<!-- Modal -->
<Modal bind:show={showModal} bind:shake={shakeModal} title={editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'} size="xl" on:close={closeModal}>
  <!-- Tab (hanya saat edit) -->
  <!-- TODO: Harga Khusus tab hidden, uncomment when ready
  {#if editingCustomer}
    <div class="flex border-b border-gray-200 mb-5 -mt-1">
      <button
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors {activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        on:click={() => activeTab = 'info'}
      >Info Dasar</button>
      <button
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors {activeTab === 'hargakhusus' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        on:click={() => activeTab = 'hargakhusus'}
      >
        Harga Khusus
        {#if customerItems.length > 0}
          <span class="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">{customerItems.length}</span>
        {/if}
      </button>
    </div>
  {/if}
  -->

  <form on:submit|preventDefault={handleSubmit}>

    <!-- ── Tab: Info Dasar ─────────────────────────────────────── -->
    {#if activeTab === 'info'}
      <div class="space-y-4">

        <!-- Row 1: Nama & Perusahaan -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- NAMA -->
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
                placeholder="NAMA LENGKAP"
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
              <p class="text-red-500 text-xs mt-1 font-medium">NAMA PELANGGAN HARUS DIISI</p>
            {/if}
          </div>

          <!-- PERUSAHAAN -->
          <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400">PERUSAHAAN</label>
            <input
              type="text"
              bind:value={form.company_name}
              placeholder="NAMA PERUSAHAAN"
              maxlength="255"
              class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300"
            />
          </div>
        </div>

        <!-- Row 2: Email (kiri saja) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- EMAIL -->
          <div>
            <div class="relative rounded-lg border px-3 pt-2 pb-2 transition-colors
              {touched.email && form.email.trim()
                ? (emailValid ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
                : 'border-gray-200 bg-gray-50'}">
              <label class="block text-xs font-semibold uppercase tracking-wide
                {touched.email && form.email.trim()
                  ? (emailValid ? 'text-green-600' : 'text-red-500')
                  : 'text-gray-400'}">
                EMAIL
              </label>
              <input
                type="email"
                bind:value={form.email}
                on:blur={() => touched.email = true}
                placeholder="NAME EMAIL PELANGGAN (contoh@gmail.com)"
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
          <div></div>
        </div>

        <!-- Row 3: Handphone & Telephone -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- HANDPHONE (mobile_phone) -->
          <div>
            <div class="flex gap-2">
              <!-- Country code picker -->
              <div class="flex items-center gap-1.5 px-3 border border-gray-200 bg-gray-50 rounded-lg shrink-0">
                <span class="text-lg leading-none">{mobilePhoneFlag}</span>
                <select
                  bind:value={form.mobile_phone_code}
                  class="bg-transparent text-sm text-gray-600 focus:outline-none cursor-pointer"
                >
                  {#each countryCodes as cc}
                    <option value={cc.code}>+{cc.code}</option>
                  {/each}
                </select>
              </div>
              <!-- Number input -->
              <div class="relative flex-1 rounded-lg border px-3 pt-2 pb-2 transition-colors
                {touched.mobilePhone && form.mobile_phone_raw.trim()
                  ? (mobilePhoneValid ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
                  : 'border-gray-200 bg-gray-50'}">
                <label class="block text-xs font-semibold uppercase tracking-wide
                  {touched.mobilePhone && form.mobile_phone_raw.trim()
                    ? (mobilePhoneValid ? 'text-green-600' : 'text-red-500')
                    : 'text-gray-400'}">HANDPHONE</label>
                <input
                  type="tel"
                  bind:value={form.mobile_phone_raw}
                  on:blur={() => touched.mobilePhone = true}
                  on:keypress={(e) => { if (!/\d/.test(e.key)) e.preventDefault(); }}
                  on:paste={(e) => { e.preventDefault(); const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, ''); document.execCommand('insertText', false, digits); }}
                  placeholder="8023456789"
                  maxlength="15"
                  class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 pr-7"
                />
                {#if touched.mobilePhone && form.mobile_phone_raw.trim() && mobilePhoneValid}
                  <div class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                {/if}
              </div>
            </div>
            {#if touched.mobilePhone && form.mobile_phone_raw.trim() && !mobilePhoneValid}
              <p class="text-red-500 text-xs mt-1 font-medium">NOMOR HANDPHONE {mobilePhoneDigits} DIGIT (MIN 11, MAKS 15)</p>
            {/if}
          </div>

          <!-- TELEPHONE (phone) -->
          <div>
            <div class="flex gap-2">
              <!-- Country code picker -->
              <div class="flex items-center gap-1.5 px-3 border border-gray-200 bg-gray-50 rounded-lg shrink-0">
                <span class="text-lg leading-none">{phoneFlag}</span>
                <select
                  bind:value={form.phone_code}
                  class="bg-transparent text-sm text-gray-600 focus:outline-none cursor-pointer"
                >
                  {#each countryCodes as cc}
                    <option value={cc.code}>+{cc.code}</option>
                  {/each}
                </select>
              </div>
              <!-- Number input -->
              <div class="relative flex-1 rounded-lg border px-3 pt-2 pb-2 transition-colors
                {touched.phone && form.phone_raw.trim()
                  ? (phoneValid ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
                  : 'border-gray-200 bg-gray-50'}">
                <label class="block text-xs font-semibold uppercase tracking-wide
                  {touched.phone && form.phone_raw.trim()
                    ? (phoneValid ? 'text-green-600' : 'text-red-500')
                    : 'text-gray-400'}">TELEPHONE</label>
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
              <p class="text-red-500 text-xs mt-1 font-medium">NOMOR TELEPHONE {phoneDigits} DIGIT (MIN 11, MAKS 15)</p>
            {/if}
          </div>
        </div>

        <!-- Row 4: Provinsi, Kota/Kabupaten, Kecamatan -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchableSelect
            label="PROVINSI"
            bind:value={form.province_code}
            options={provinces.map(p => ({ value: p.code ?? p.id, label: p.name }))}
            placeholder="PILIH PROVINSI"
            loading={provincesLoading}
            on:change={onProvinceChange}
          />
          <SearchableSelect
            label="KOTA/KABUPATEN"
            bind:value={form.city_code}
            options={cities.map(c => ({ value: c.code ?? c.id, label: c.name }))}
            placeholder="PILIH KOTA/KABUPATEN"
            disabled={!form.province_code}
            loading={citiesLoading}
            on:change={onCityChange}
          />
          <SearchableSelect
            label="KECAMATAN"
            bind:value={form.subdistrict_code}
            options={subdistricts.map(s => ({ value: s.code ?? s.id, label: s.name }))}
            placeholder="PILIH KECAMATAN"
            disabled={!form.city_code}
            loading={subdistrictsLoading}
            on:change={onSubdistrictChange}
          />
        </div>

        <!-- Row 5: Kelurahan/Desa, Kode Pos, Alamat -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <!-- KELURAHAN/DESA -->
          <SearchableSelect
            label="KELURAHAN/DESA"
            bind:value={form.village_code}
            options={villages.map(v => ({ value: v.code ?? v.id, label: v.name }))}
            placeholder="PILIH KELURAHAN/DESA"
            disabled={!form.subdistrict_code}
            loading={villagesLoading}
            on:change={onVillageChange}
          />

          <!-- KODE POS (auto-fill) -->
          <div class="rounded-lg border border-gray-200 bg-gray-100 px-3 pt-2 pb-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">KODE POS</label>
            <input
              type="text"
              value={form.postal_code}
              readonly
              placeholder="terisi dari kelurahan/desa"
              class="w-full bg-transparent text-sm text-gray-600 focus:outline-none placeholder-gray-300 cursor-default"
            />
          </div>

          <!-- ALAMAT -->
          <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">ALAMAT</label>
            <textarea
              bind:value={form.address}
              rows="2"
              placeholder="JL. RAYA SUMEDANG-BANDUNG NO. 107"
              class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300 resize-none"
            ></textarea>
          </div>
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
            disabled={$customersLoading}
            class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
            </svg>
            {editingCustomer ? 'SIMPAN' : 'TAMBAH'}
          </button>
        </div>
      </div>
    {/if}

    <!-- ── Tab: Harga Khusus ───────────────────────────────────── -->
    <!-- TODO: hidden, uncomment when ready -->
    {#if false && activeTab === 'hargakhusus'}
      <div class="space-y-3">
        {#if !showAddItemForm}
          <button
            type="button"
            on:click={() => showAddItemForm = true}
            disabled={availableItems.length === 0}
            class="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Tambah Harga Khusus Item
          </button>
        {:else}
          <div class="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
            <p class="text-sm font-medium text-gray-700">Tambah Harga Khusus Item</p>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Pilih Item *</label>
              <select bind:value={addItemForm.item_id} class="input-field">
                <option value="">-- Pilih item --</option>
                {#each availableItems as item}
                  <option value={item.id}>{item.name} ({item.sku || '-'}) — {formatCurrency(item.unit_price)}</option>
                {/each}
              </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Harga Khusus (Rp)</label>
                <input type="text" inputmode="numeric" value={customPriceDisplay} on:input={onCustomPriceInput} class="input-field" placeholder="Kosongkan = pakai harga normal" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
                <input type="text" bind:value={addItemForm.notes} class="input-field" placeholder="Opsional" />
              </div>
            </div>
            <div class="flex gap-2">
              <button type="button" class="btn-secondary text-sm py-1.5" on:click={() => { showAddItemForm = false; addItemForm = { item_id: '', custom_price: 0, notes: '' }; customPriceDisplay = ''; }}>Batal</button>
              <button type="button" class="btn-primary text-sm py-1.5" on:click={handleAddCustomerItem} disabled={savingCustomerItem}>
                {savingCustomerItem ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        {/if}

        {#if customerItemsLoading}
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        {:else if customerItems.length === 0}
          <div class="text-center py-8 text-gray-400 text-sm">
            Belum ada harga khusus item untuk pelanggan ini
          </div>
        {:else}
          <div class="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {#each customerItems as ci}
              <div class="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                <div>
                  <p class="text-sm font-medium text-gray-800">{ci.item_name || getItemName(ci.item_id)}</p>
                  <div class="flex items-center gap-3 mt-0.5">
                    <span class="text-xs text-gray-500">Harga normal: {formatCurrency(ci.unit_price || 0)}</span>
                    {#if ci.custom_price}
                      <span class="text-xs font-semibold text-blue-600">→ Harga khusus: {formatCurrency(ci.custom_price)}</span>
                    {/if}
                    {#if ci.notes}
                      <span class="text-xs text-gray-400 italic">"{ci.notes}"</span>
                    {/if}
                  </div>
                </div>
                <button
                  type="button"
                  on:click={() => handleDeleteCustomerItem(ci.id)}
                  class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Hapus harga khusus"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        {/if}

      </div>
    {/if}
  </form>
</Modal>
