<script>
  import { onMount } from 'svelte';
  import { customers, loadCustomers, addCustomer, updateCustomer, deleteCustomer } from '../stores/customers.js';
  import { success, error as showError } from '../stores/notifications.js';
  import Modal from '../components/Modal.svelte';

  onMount(() => {
    loadCustomers();
  });

  let showModal = false;
  let editingCustomer = null;
  let searchTerm = '';

  let form = {
    name: '',
    company_name: '',
    email: '',
    phone: '',
    whatsapp_numbers: '',
    address: '',
    city: '',
    province: '',
    postal_code: ''
  };

  $: filteredCustomers = $customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openModal(customer = null) {
    editingCustomer = customer;
    if (customer) {
      form = {
        name: customer.name,
        company_name: customer.company_name || '',
        email: customer.email,
        phone: customer.phone || '',
        whatsapp_numbers: (customer.whatsapp_numbers || []).join(', '),
        address: customer.address || '',
        city: customer.city || '',
        province: customer.province || '',
        postal_code: customer.postal_code || ''
      };
    } else {
      form = {
        name: '',
        company_name: '',
        email: '',
        phone: '',
        whatsapp_numbers: '',
        address: '',
        city: '',
        province: '',
        postal_code: ''
      };
    }
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingCustomer = null;
  }

  function handleSubmit() {
    if (!form.name || !form.email) {
      showError('Nama dan email harus diisi');
      return;
    }

    const customerData = {
      ...form,
      whatsapp_numbers: form.whatsapp_numbers.split(',').map(n => n.trim()).filter(n => n)
    };

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, customerData);
      success('Pelanggan berhasil diperbarui');
    } else {
      addCustomer(customerData);
      success('Pelanggan berhasil ditambahkan');
    }

    closeModal();
  }

  function handleDelete(id) {
    if (confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) {
      deleteCustomer(id);
      success('Pelanggan berhasil dihapus');
    }
  }
</script>

<div>
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Pelanggan</h1>
    <button class="btn-primary" on:click={() => openModal()}>
      + Tambah Pelanggan
    </button>
  </div>

  <div class="card mb-6">
    <input
      type="text"
      bind:value={searchTerm}
      placeholder="Cari pelanggan..."
      class="input-field"
    />
  </div>

  <div class="card">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th class="px-6 py-3 table-header">Nama</th>
            <th class="px-6 py-3 table-header">Perusahaan</th>
            <th class="px-6 py-3 table-header">Email</th>
            <th class="px-6 py-3 table-header">Telepon</th>
            <th class="px-6 py-3 table-header">Kota</th>
            <th class="px-6 py-3 table-header">Aksi</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#if filteredCustomers.length === 0}
            <tr>
              <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                Tidak ada data pelanggan
              </td>
            </tr>
          {:else}
            {#each filteredCustomers as customer}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {customer.name}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.company_name || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.email}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.phone}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.city}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    on:click={() => openModal(customer)}
                    class="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    on:click={() => handleDelete(customer.id)}
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

<Modal bind:show={showModal} title={editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'} size="lg">
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
        <input type="text" bind:value={form.name} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Perusahaan</label>
        <input type="text" bind:value={form.company_name} class="input-field" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input type="email" bind:value={form.email} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
        <input type="text" bind:value={form.phone} class="input-field" />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp (pisahkan dengan koma)</label>
      <input type="text" bind:value={form.whatsapp_numbers} class="input-field" placeholder="6281234567890, 6282345678901" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
      <textarea bind:value={form.address} class="input-field" rows="2"></textarea>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Kota</label>
        <input type="text" bind:value={form.city} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
        <input type="text" bind:value={form.province} class="input-field" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Kode Pos</label>
        <input type="text" bind:value={form.postal_code} class="input-field" />
      </div>
    </div>

    <div class="flex justify-end gap-3 pt-4">
      <button type="button" class="btn-secondary" on:click={closeModal}>Batal</button>
      <button type="submit" class="btn-primary">Simpan</button>
    </div>
  </form>
</Modal>
