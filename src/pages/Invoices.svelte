<script>
  import { onMount } from 'svelte';
  import { invoices, loadInvoices, addInvoice, updateInvoice, deleteInvoice } from '../stores/invoices.js';
  import { customers, loadCustomers } from '../stores/customers.js';
  import { success, error as showError, info } from '../stores/notifications.js';
  import invoiceService from '../services/invoice.service.js';
  import Modal from '../components/Modal.svelte';

  let downloadingId = null;

  onMount(() => {
    loadInvoices();
    loadCustomers();
  });

  let showModal = false;
  let showWhatsAppModal = false;
  let editingInvoice = null;
  let selectedInvoice = null;
  let searchTerm = '';

  let form = {
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    items: [{ item_name: '', description: '', quantity: 1, unit_price: 0 }],
    tax_amount: 0,
    discount_amount: 0,
    notes: '',
    status: 'draft'
  };

  $: filteredInvoices = $invoices.filter(i =>
    (i.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  $: subtotal = form.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  $: totalAmount = subtotal + form.tax_amount - form.discount_amount;

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  function getCustomerName(customerId) {
    const customer = $customers.find(c => c.id === customerId);
    return customer ? customer.name : '-';
  }

  function openModal(invoice = null) {
    editingInvoice = invoice;
    if (invoice) {
      form = {
        customer_id: invoice.customer_id,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date || '',
        items: (invoice.items || []).map(i => ({
          item_name: i.item_name || '',
          description: i.description || '',
          quantity: i.quantity || 1,
          unit_price: i.unit_price || 0
        })),
        tax_amount: invoice.tax_amount || 0,
        discount_amount: invoice.discount_amount || 0,
        notes: invoice.notes || '',
        status: invoice.status || 'draft'
      };
      if (form.items.length === 0) {
        form.items = [{ item_name: '', description: '', quantity: 1, unit_price: 0 }];
      }
    } else {
      form = {
        customer_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        items: [{ item_name: '', description: '', quantity: 1, unit_price: 0 }],
        tax_amount: 0,
        discount_amount: 0,
        notes: '',
        status: 'draft'
      };
    }
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingInvoice = null;
  }

  function addItem() {
    form.items = [...form.items, { item_name: '', description: '', quantity: 1, unit_price: 0 }];
  }

  function removeItem(index) {
    if (form.items.length > 1) {
      form.items = form.items.filter((_, i) => i !== index);
    }
  }

  function handleSubmit() {
    if (!form.customer_id) {
      showError('Pelanggan harus dipilih');
      return;
    }

    const invoiceData = {
      ...form,
      items: form.items.map((item, index) => ({
        id: String(index + 1),
        ...item,
        total_price: item.quantity * item.unit_price
      })),
      subtotal,
      total_amount: totalAmount
    };

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

  function openWhatsAppModal(invoice) {
    selectedInvoice = invoice;
    showWhatsAppModal = true;
  }

  function getCustomerPhones(customerId) {
    const customer = $customers.find(c => c.id === customerId);
    if (customer && customer.whatsapp_numbers && customer.whatsapp_numbers.length > 0) {
      return customer.whatsapp_numbers;
    }
    return [];
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
    downloadingId = invoice.id;
    try {
      // Generate document first
      await invoiceService.generate(invoice.id);

      // Then download
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
    } catch (error) {
      showError('Gagal mengunduh invoice: ' + error.message);
    } finally {
      downloadingId = null;
    }
  }
</script>

<div>
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Invoice</h1>
    <button class="btn-primary" on:click={() => openModal()}>
      + Buat Invoice
    </button>
  </div>

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
            <th class="px-6 py-3 table-header">Aksi</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#if filteredInvoices.length === 0}
            <tr>
              <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                Tidak ada invoice
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
                  {formatCurrency(invoice.total_amount)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs rounded-full {badge.class}">
                    {badge.label}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    on:click={() => handleDownload(invoice)}
                    class="text-purple-600 hover:text-purple-800"
                    disabled={downloadingId === invoice.id}
                  >
                    {downloadingId === invoice.id ? 'Mengunduh...' : 'Download'}
                  </button>
                  <button
                    on:click={() => openWhatsAppModal(invoice)}
                    class="text-green-600 hover:text-green-800"
                  >
                    Kirim WA
                  </button>
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
            <input type="text" bind:value={item.item_name} placeholder="Nama item" class="input-field col-span-3" />
            <input type="text" bind:value={item.description} placeholder="Deskripsi" class="input-field col-span-3" />
            <input type="number" bind:value={item.quantity} placeholder="Qty" class="input-field col-span-2" />
            <input type="number" bind:value={item.unit_price} placeholder="Harga" class="input-field col-span-3" />
            <button type="button" on:click={() => removeItem(i)} class="text-red-500 col-span-1">X</button>
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