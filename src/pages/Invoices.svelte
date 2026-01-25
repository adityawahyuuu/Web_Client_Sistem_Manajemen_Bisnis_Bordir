<script>
  import { onMount } from 'svelte';
  import { invoices, loadInvoices, addInvoice, updateInvoice, deleteInvoice, invoiceTemplates, hasInvoiceTemplate, loadInvoiceTemplates } from '../stores/invoices.js';
  import { customers, loadCustomers } from '../stores/customers.js';
  import { success, error as showError } from '../stores/notifications.js';
  import { items, loadItems } from '../stores/items.js';
  import { selectedCompany } from '../stores/company.js';
  import invoiceService from '../services/invoice.service.js';
  import Modal from '../components/Modal.svelte';

  let downloadingId = null;

  const num = (v) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  onMount(() => {
    if ($selectedCompany?.id) {
      loadInvoices();
      loadCustomers();
      loadItems();
      loadInvoiceTemplates();
    }
  });

  $: if ($selectedCompany?.id) {
    loadInvoices();
    loadCustomers();
    loadItems();
    loadInvoiceTemplates();
  }

  let showModal = false;
  let editingInvoice = null;
  let selectedInvoice = null;
  let searchTerm = '';

  let form = {
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    id: '',
    items: [{ id: null, item_id: null, item_name: '', description: '', quantity: 1, unit_price: 0, unit: 'pcs' }],
    tax_amount: 0,
    discount_amount: 0,
    notes: '',
    status: 'draft'
  };

  $: filteredInvoices = $invoices.filter(i =>
    (i.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  $: subtotal = form.items.reduce((sum, i) => sum + num(i.quantity) * num(i.unit_price), 0);
  $: totalAmount = subtotal + num(form.tax_amount) - num(form.discount_amount);

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  const calculateInvoiceTotal = (invoice) => {
    const total = num(invoice.total_amount);
    if (total > 0) return total;

    const invoiceItems = invoice.items || [];
    const sub = invoiceItems.reduce(
      (sum, item) => sum + num(item.quantity) * num(item.unit_price),
      0
    );

    return sub + num(invoice.tax_amount) - num(invoice.discount_amount);
  };

  function getCustomerName(customerId) {
    const customer = $customers.find(c => c.id === customerId);
    return customer ? customer.name : '-';
  }

  function openModal(invoice = null) {
    console.log('Opening modal with invoice:', invoice);
    console.log('Available items:', $items);

    editingInvoice = invoice;
    if (invoice) {
      form = {
        customer_id: invoice.customer_id,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date || '',
        id: invoice.id,
        items: (invoice.items || []).map(i => ({
          id: i.id ?? null,
          item_id: i.item_id ?? null,
          item_name: i.item_name || '',
          description: i.description || '',
          quantity: num(i.quantity) || 1,
          unit_price: num(i.unit_price) || 0,
          unit: i.unit || 'pcs'
        })),
        tax_amount: num(invoice.tax_amount),
        discount_amount: num(invoice.discount_amount),
        notes: invoice.notes || '',
        status: invoice.status || 'draft'
      };
    } else {
      form = {
        customer_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        id: '',
        items: [{ id: null, item_id: null, item_name: '', description: '', quantity: 1, unit_price: 0, unit: 'pcs' }],  // ✅ FIX
        tax_amount: 0,
        discount_amount: 0,
        notes: '',
        status: 'draft'
      };
    }

    console.log('Available form items data:', form.items);
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingInvoice = null;
  }

  function addItem() {
    form.items = [
      ...form.items,
      {
        id: null,
        item_id: null,
        item_name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        unit: 'pcs'
      }
    ];
  }

  function removeItem(index) {
    if (form.items.length === 1) return;
    form.items = form.items.filter((_, i) => i !== index);
  }

  function handleSubmit() {
    if (!$selectedCompany?.id) return;

    if (!form.customer_id) {
      showError('Pelanggan harus dipilih');
      return;
    }

    const invoiceData = {
      customer_id: Number(form.customer_id),
      invoice_date: form.invoice_date,
      due_date: form.due_date || null,
      notes: form.notes || '',
      status: form.status || 'draft',
      tax_amount: num(form.tax_amount),
      discount_amount: num(form.discount_amount),
      items: form.items.map(item => {
        const quantity = num(item.quantity);
        const unitPrice = num(item.unit_price);

        return {
          id: item.id || null,
          item_id: Number(item.item_id),
          item_name: item.item_name,
          description: item.description || '',
          quantity,
          unit_price: unitPrice,
          unit: item.unit || 'pcs',
          total_price: quantity * unitPrice
        };
      })
    };

    invoiceData.subtotal = invoiceData.items.reduce((sum, i) => sum + i.total_price, 0);
    invoiceData.total_amount = invoiceData.subtotal + invoiceData.tax_amount - invoiceData.discount_amount;

    if (editingInvoice) {
      updateInvoice(editingInvoice.id, invoiceData);
      success('Invoice berhasil diperbarui');
    } else {
      addInvoice(invoiceData);
      success('Invoice berhasil ditambahkan');
    }

    closeModal();
  }

  function handleDelete(id) {
    if (confirm('Apakah Anda yakin ingin menghapus invoice ini?')) {
      deleteInvoice(id);
      success('Invoice berhasil dihapus');
    }
  }

  function getStatusBadge(status) {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800'
    };
    const labels = { draft: 'Draft', sent: 'Terkirim', paid: 'Lunas' };
    return { class: badges[status] || badges.draft, label: labels[status] || status };
  }

  async function handleDownload(invoice) {
    if (!$hasInvoiceTemplate) return;

    downloadingId = invoice.id;
    try {
      const template = $invoiceTemplates[0]; // default: template pertama
      await invoiceService.generate(invoice.id, template?.id);

      const blob = await invoiceService.download(invoice.id);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.URL.revokeObjectURL(url);
      success('Invoice berhasil diunduh');
    } catch (err) {
      showError('Gagal generate / download invoice');
    } finally {
      downloadingId = null;
    }
  }

  function onItemChange(index) {
    const item = form.items[index];
    const master = item.item_id
      ? $items.find(i => i.id === item.item_id)
      : null;

    if (!master) {
      item.item_name = '';
      item.description = '';
      item.unit_price = 0;
      item.unit = 'pcs';
    } else {
      item.item_name = master.name;
      item.description = master.description || '';
      item.unit_price = Number(master.unit_price) || 0;
      item.unit = master.unit || 'pcs';
    }

    form.items = [...form.items];
  }
</script>

<div>
  <div class="flex justify-between items-center mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Invoice</h1>
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
      + Buat Invoice
    </button>
  </div>

  {#if !$selectedCompany?.id}
    <div class="card text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Pilih Perusahaan</h3>
      <p class="text-gray-500">Silakan pilih perusahaan dari dropdown di sidebar untuk melihat daftar invoice.</p>
    </div>
  {:else}
    <div class="card mb-6">
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Cari nomor invoice..."
        class="input-field"
      />
    </div>

    <div class="card">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-6 py-3 table-header">No. Invoice</th>
              <th class="px-6 py-3 table-header">Pelanggan</th>
              <th class="px-6 py-3 table-header">Tanggal</th>
              <th class="px-6 py-3 table-header">Total</th>
              <th class="px-6 py-3 table-header">Status</th>
              {#if $hasInvoiceTemplate}
                <th class="px-6 py-3 table-header">Download</th>
              {/if}
              <th class="px-6 py-3 table-header">Aksi</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#if filteredInvoices.length === 0}
              <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? 'Tidak ada invoice yang cocok dengan pencarian' : 'Belum ada data invoice'}
                </td>
              </tr>
            {:else}
              {#each filteredInvoices as invoice}
                {@const badge = getStatusBadge(invoice.status)}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getCustomerName(invoice.customer_id)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.invoice_date}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(calculateInvoiceTotal(invoice))}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs rounded-full {badge.class}">
                      {badge.label}
                    </span>
                  </td>
                  {#if $hasInvoiceTemplate}
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        on:click={() => handleDownload(invoice)}
                        class="text-purple-600 hover:text-purple-800"
                        disabled={downloadingId === invoice.id}
                      >
                        {downloadingId === invoice.id ? 'Mengunduh...' : 'Download'}
                      </button>
                    </td>
                  {/if}
                  <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      on:click={() => openModal(invoice)}
                      class="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      on:click={() => handleDelete(invoice.id)}
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
    </div>
  {/if}
</div>

<Modal bind:show={showModal} title={editingInvoice ? 'Edit Invoice' : 'Buat Invoice'} size="xl">
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Pelanggan *</label>
        <select bind:value={form.customer_id} class="input-field">
          <option value="">Pilih pelanggan</option>
          {#each $customers as customer}
            <option value={customer.id}>{customer.name} - {customer.company_name || ''}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Invoice</label>
        <input type="date" bind:value={form.invoice_date} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Jatuh Tempo</label>
        <input type="date" bind:value={form.due_date} class="input-field" />
      </div>
    </div>

    <div>
      <div class="flex justify-between items-center mb-2">
        <label class="block text-sm font-medium text-gray-700">Item</label>
        <button type="button" class="text-blue-600 text-sm" on:click={addItem}>+ Tambah Item</button>
      </div>
      <div class="space-y-2">
        {#each form.items as item, i}
          <div class="grid grid-cols-12 gap-2 items-center">
            <select
              bind:value={item.item_id}
              on:change={() => onItemChange(i)}
              class="input-field col-span-3"
            >
              <option value={null}>Pilih item</option>
              {#each $items as master}
                <option value={master.id}>
                  {master.name}
                </option>
              {/each}
            </select>
            <input
              type="text"
              value={item.description}
              placeholder="Deskripsi"
              class="input-field col-span-3 bg-gray-100"
              disabled
            />
            <input 
              type="number" 
              bind:value={item.quantity} 
              placeholder="Qty" 
              class="input-field col-span-2" 
              min="1" 
            />
            <input
              type="number"
              value={item.unit_price}
              placeholder="Harga"
              class="input-field col-span-3 bg-gray-100"
              disabled
            />
            <button 
              type="button" 
              on:click={() => removeItem(i)} 
              class="text-red-500 col-span-1"
            >
              X
            </button>
          </div>
        {/each}
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Pajak</label>
        <input type="number" bind:value={form.tax_amount} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Diskon</label>
        <input type="number" bind:value={form.discount_amount} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select bind:value={form.status} class="input-field">
          <option value="draft">Draft</option>
          <option value="sent">Terkirim</option>
          <option value="paid">Lunas</option>
        </select>
      </div>
    </div>

    <div class="bg-gray-50 p-4 rounded-lg">
      <div class="flex justify-between text-sm mb-1">
        <span>Subtotal:</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div class="flex justify-between text-sm mb-1">
        <span>Pajak:</span>
        <span>{formatCurrency(form.tax_amount)}</span>
      </div>
      <div class="flex justify-between text-sm mb-1">
        <span>Diskon:</span>
        <span>-{formatCurrency(form.discount_amount)}</span>
      </div>
      <div class="flex justify-between font-bold text-lg border-t pt-2">
        <span>Total:</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
      <textarea bind:value={form.notes} class="input-field" rows="2"></textarea>
    </div>

    <div class="flex justify-end gap-3 pt-4">
      <button type="button" class="btn-secondary" on:click={closeModal}>Batal</button>
      <button type="submit" class="btn-primary">Simpan</button>
    </div>
  </form>
</Modal>