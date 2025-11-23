<script>
  import { onMount } from 'svelte';
  import { receipts, loadReceipts, addReceipt, updateReceipt, deleteReceipt } from '../stores/receipts.js';
  import { invoices, loadInvoices } from '../stores/invoices.js';
  import { customers, loadCustomers } from '../stores/customers.js';
  import { success, error as showError, info } from '../stores/notifications.js';
  import Modal from '../components/Modal.svelte';

  onMount(() => {
    loadReceipts();
    loadInvoices();
    loadCustomers();
  });

  let showModal = false;
  let editingReceipt = null;
  let searchTerm = '';

  let form = {
    invoice_id: '',
    customer_id: '',
    receipt_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'transfer',
    description: '',
    received_by: '',
    notes: ''
  };

  $: filteredReceipts = $receipts.filter(r =>
    (r.receipt_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  function openModal(receipt = null) {
    editingReceipt = receipt;
    if (receipt) {
      form = {
        invoice_id: receipt.invoice_id || '',
        customer_id: receipt.customer_id,
        receipt_date: receipt.receipt_date,
        amount: receipt.amount || 0,
        payment_method: receipt.payment_method || 'transfer',
        description: receipt.description || '',
        received_by: receipt.received_by || '',
        notes: receipt.notes || ''
      };
    } else {
      form = {
        invoice_id: '',
        customer_id: '',
        receipt_date: new Date().toISOString().split('T')[0],
        amount: 0,
        payment_method: 'transfer',
        description: '',
        received_by: '',
        notes: ''
      };
    }
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingReceipt = null;
  }

  function handleSubmit() {
    if (!form.customer_id || form.amount <= 0) {
      showError('Pelanggan dan jumlah harus diisi');
      return;
    }

    if (editingReceipt) {
      updateReceipt(editingReceipt.id, form);
      success('Kwitansi berhasil diperbarui');
    } else {
      addReceipt(form);
      success('Kwitansi berhasil ditambahkan');
    }

    closeModal();
  }

  function handleDelete(id) {
    if (confirm('Apakah Anda yakin ingin menghapus kwitansi ini?')) {
      deleteReceipt(id);
      success('Kwitansi berhasil dihapus');
    }
  }

  function sendWhatsApp(receipt) {
    const customer = $customers.find(c => c.id === receipt.customer_id);
    if (customer && customer.whatsapp_numbers && customer.whatsapp_numbers.length > 0) {
      info(`Simulasi: Mengirim ${receipt.receipt_number} ke ${customer.whatsapp_numbers.join(', ')}`);
      success('Kwitansi berhasil dikirim via WhatsApp (simulasi)');
    } else {
      showError('Pelanggan tidak memiliki nomor WhatsApp');
    }
  }

  function getPaymentMethodLabel(method) {
    const labels = { cash: 'Tunai', transfer: 'Transfer', other: 'Lainnya' };
    return labels[method] || method;
  }
</script>

<div>
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Kwitansi</h1>
    <button class="btn-primary" on:click={() => openModal()}>
      + Buat Kwitansi
    </button>
  </div>

  <div class="card mb-6">
    <input
      type="text"
      bind:value={searchTerm}
      placeholder="Cari nomor kwitansi..."
      class="input-field"
    />
  </div>

  <div class="card">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th class="px-6 py-3 table-header">No. Kwitansi</th>
            <th class="px-6 py-3 table-header">Pelanggan</th>
            <th class="px-6 py-3 table-header">Tanggal</th>
            <th class="px-6 py-3 table-header">Jumlah</th>
            <th class="px-6 py-3 table-header">Metode</th>
            <th class="px-6 py-3 table-header">Aksi</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#if filteredReceipts.length === 0}
            <tr>
              <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                Tidak ada kwitansi
              </td>
            </tr>
          {:else}
            {#each filteredReceipts as receipt}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {receipt.receipt_number}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getCustomerName(receipt.customer_id)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {receipt.receipt_date}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatCurrency(receipt.amount)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getPaymentMethodLabel(receipt.payment_method)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    on:click={() => sendWhatsApp(receipt)}
                    class="text-green-600 hover:text-green-800"
                  >
                    Kirim WA
                  </button>
                  <button
                    on:click={() => openModal(receipt)}
                    class="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    on:click={() => handleDelete(receipt.id)}
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

<Modal bind:show={showModal} title={editingReceipt ? 'Edit Kwitansi' : 'Buat Kwitansi'} size="lg">
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Pelanggan *</label>
        <select bind:value={form.customer_id} class="input-field">
          <option value="">Pilih pelanggan</option>
          {#each $customers as customer}
            <option value={customer.id}>{customer.name}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Invoice Terkait</label>
        <select bind:value={form.invoice_id} class="input-field">
          <option value="">Pilih invoice</option>
          {#each $invoices as invoice}
            <option value={invoice.id}>{invoice.invoice_number}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
        <input type="date" bind:value={form.receipt_date} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah *</label>
        <input type="number" bind:value={form.amount} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
        <select bind:value={form.payment_method} class="input-field">
          <option value="transfer">Transfer Bank</option>
          <option value="cash">Tunai</option>
          <option value="other">Lainnya</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
        <input type="text" bind:value={form.description} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Diterima Oleh</label>
        <input type="text" bind:value={form.received_by} class="input-field" />
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
