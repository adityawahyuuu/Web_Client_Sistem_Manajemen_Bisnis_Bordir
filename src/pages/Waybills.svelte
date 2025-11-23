<script>
  import { onMount } from 'svelte';
  import { waybills, loadWaybills, addWaybill, updateWaybill, deleteWaybill } from '../stores/waybills.js';
  import { invoices, loadInvoices } from '../stores/invoices.js';
  import { customers, loadCustomers } from '../stores/customers.js';
  import { success, error as showError, info } from '../stores/notifications.js';
  import { sendWaybillToMultiple } from '../stores/whatsapp.js';
  import Modal from '../components/Modal.svelte';
  import WhatsAppSendModal from '../components/WhatsAppSendModal.svelte';

  onMount(() => {
    loadWaybills();
    loadInvoices();
    loadCustomers();
  });

  let showModal = false;
  let showWhatsAppModal = false;
  let editingWaybill = null;
  let selectedWaybill = null;
  let searchTerm = '';

  let form = {
    invoice_id: '',
    customer_id: '',
    waybill_date: new Date().toISOString().split('T')[0],
    destination_address: '',
    destination_city: '',
    destination_province: '',
    vehicle_number: '',
    driver_name: '',
    items: [{ item_name: '', quantity: 1, unit: 'pcs', notes: '' }],
    notes: '',
    status: 'pending'
  };

  $: filteredWaybills = $waybills.filter(w =>
    (w.waybill_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  function getCustomerName(customerId) {
    const customer = $customers.find(c => c.id === customerId);
    return customer ? customer.name : '-';
  }

  function openModal(waybill = null) {
    editingWaybill = waybill;
    if (waybill) {
      form = {
        invoice_id: waybill.invoice_id || '',
        customer_id: waybill.customer_id,
        waybill_date: waybill.waybill_date,
        destination_address: waybill.destination_address || '',
        destination_city: waybill.destination_city || '',
        destination_province: waybill.destination_province || '',
        vehicle_number: waybill.vehicle_number || '',
        driver_name: waybill.driver_name || '',
        items: (waybill.items || []).map(i => ({
          item_name: i.item_name || '',
          quantity: i.quantity || 1,
          unit: i.unit || 'pcs',
          notes: i.notes || ''
        })),
        notes: waybill.notes || '',
        status: waybill.status || 'draft'
      };
      if (form.items.length === 0) {
        form.items = [{ item_name: '', quantity: 1, unit: 'pcs', notes: '' }];
      }
    } else {
      form = {
        invoice_id: '',
        customer_id: '',
        waybill_date: new Date().toISOString().split('T')[0],
        destination_address: '',
        destination_city: '',
        destination_province: '',
        vehicle_number: '',
        driver_name: '',
        items: [{ item_name: '', quantity: 1, unit: 'pcs', notes: '' }],
        notes: '',
        status: 'pending'
      };
    }
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingWaybill = null;
  }

  function addItem() {
    form.items = [...form.items, { item_name: '', quantity: 1, unit: 'pcs', notes: '' }];
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

    const waybillData = {
      ...form,
      items: form.items.map((item, index) => ({
        id: String(index + 1),
        ...item
      }))
    };

    if (editingWaybill) {
      updateWaybill(editingWaybill.id, waybillData);
      success('Surat jalan berhasil diperbarui');
    } else {
      addWaybill(waybillData);
      success('Surat jalan berhasil ditambahkan');
    }

    closeModal();
  }

  function handleDelete(id) {
    if (confirm('Apakah Anda yakin ingin menghapus surat jalan ini?')) {
      deleteWaybill(id);
      success('Surat jalan berhasil dihapus');
    }
  }

  function openWhatsAppModal(waybill) {
    selectedWaybill = waybill;
    showWhatsAppModal = true;
  }

  function getCustomerPhones(customerId) {
    const customer = $customers.find(c => c.id === customerId);
    if (customer && customer.whatsapp_numbers && customer.whatsapp_numbers.length > 0) {
      return customer.whatsapp_numbers;
    }
    return [];
  }

  async function handleWhatsAppSend(event) {
    const { phoneNumbers, message } = event.detail;
    try {
      const results = await sendWaybillToMultiple(selectedWaybill.id, phoneNumbers, message);

      if (results.success.length > 0) {
        updateWaybill(selectedWaybill.id, { status: 'sent' });
      }

      if (results.failed.length === 0) {
        success(`Surat jalan berhasil dikirim ke ${results.success.length} nomor via WhatsApp`);
      } else if (results.success.length > 0) {
        info(`Berhasil: ${results.success.length} nomor, Gagal: ${results.failed.length} nomor`);
      } else {
        showError(`Gagal mengirim ke semua nomor`);
      }
    } catch (error) {
      showError('Gagal mengirim surat jalan: ' + error.message);
    }
    showWhatsAppModal = false;
  }

  function getStatusBadge(status) {
    const badges = {
      pending: 'bg-gray-100 text-gray-800',
      shipped: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800'
    };
    const labels = { pending: 'Pending', shipped: 'Dikirim', delivered: 'Terkirim' };
    return { class: badges[status] || badges.pending, label: labels[status] || status };
  }
</script>

<div>
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Surat Jalan</h1>
    <button class="btn-primary" on:click={() => openModal()}>
      + Buat Surat Jalan
    </button>
  </div>

  <div class="card mb-6">
    <input
      type="text"
      bind:value={searchTerm}
      placeholder="Cari nomor surat jalan..."
      class="input-field"
    />
  </div>

  <div class="card">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th class="px-6 py-3 table-header">No. Surat Jalan</th>
            <th class="px-6 py-3 table-header">Pelanggan</th>
            <th class="px-6 py-3 table-header">Tanggal</th>
            <th class="px-6 py-3 table-header">Tujuan</th>
            <th class="px-6 py-3 table-header">Status</th>
            <th class="px-6 py-3 table-header">Aksi</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#if filteredWaybills.length === 0}
            <tr>
              <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                Tidak ada surat jalan
              </td>
            </tr>
          {:else}
            {#each filteredWaybills as waybill}
              {@const badge = getStatusBadge(waybill.status)}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {waybill.waybill_number}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getCustomerName(waybill.customer_id)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {waybill.waybill_date}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {waybill.destination_city}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs rounded-full {badge.class}">
                    {badge.label}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    on:click={() => openWhatsAppModal(waybill)}
                    class="text-green-600 hover:text-green-800"
                  >
                    Kirim WA
                  </button>
                  <button
                    on:click={() => openModal(waybill)}
                    class="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    on:click={() => handleDelete(waybill.id)}
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

<Modal bind:show={showModal} title={editingWaybill ? 'Edit Surat Jalan' : 'Buat Surat Jalan'} size="xl">
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div class="grid grid-cols-3 gap-4">
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
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
        <input type="date" bind:value={form.waybill_date} class="input-field" />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Alamat Tujuan</label>
        <input type="text" bind:value={form.destination_address} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Kota Tujuan</label>
        <input type="text" bind:value={form.destination_city} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
        <input type="text" bind:value={form.destination_province} class="input-field" />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">No. Kendaraan</label>
        <input type="text" bind:value={form.vehicle_number} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nama Sopir</label>
        <input type="text" bind:value={form.driver_name} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select bind:value={form.status} class="input-field">
          <option value="pending">Pending</option>
          <option value="shipped">Dikirim</option>
          <option value="delivered">Terkirim</option>
        </select>
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
            <input type="text" bind:value={item.item_name} placeholder="Nama item" class="input-field col-span-4" />
            <input type="number" bind:value={item.quantity} placeholder="Qty" class="input-field col-span-2" />
            <input type="text" bind:value={item.unit} placeholder="Satuan" class="input-field col-span-2" />
            <input type="text" bind:value={item.notes} placeholder="Catatan" class="input-field col-span-3" />
            <button type="button" on:click={() => removeItem(i)} class="text-red-500 col-span-1">X</button>
          </div>
        {/each}
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

{#if selectedWaybill}
  <WhatsAppSendModal
    bind:show={showWhatsAppModal}
    documentType="waybill"
    documentNumber={selectedWaybill.waybill_number}
    customerPhones={getCustomerPhones(selectedWaybill.customer_id)}
    on:send={handleWhatsAppSend}
  />
{/if}