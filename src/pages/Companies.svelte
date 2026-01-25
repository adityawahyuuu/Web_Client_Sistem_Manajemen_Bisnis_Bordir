<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-routing';
  import Modal from '../components/Modal.svelte';
  import {
    companies,
    selectedCompany,
    companiesLoading,
    createCompany,
    updateCompany,
    deleteCompany,
    selectCompany,
    loadCompaniesWithLogo,
    updateCompanyLogo
  } from '../stores/company.js';
  import { success, error as errorNotify } from '../stores/notifications.js';
  import companyService from '../services/company.service.js';
  
  let showModal = false;
  let editingCompany = null;
  let form = {
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    tax_id: ''
  };

  let logoFile = null;
  let logoPreview = null;
  let uploadingLogo = false;

  onMount(() => {
    loadCompaniesWithLogo();
  });

  function openCreateModal() {
    editingCompany = null;
    form = {
      name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      tax_id: ''
    };
    showModal = true;
  }

  function openEditModal(company) {
    editingCompany = company;
    form = {
      name: company.name || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      tax_id: company.tax_id || ''
    };
    showModal = true;
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      errorNotify('Nama perusahaan wajib diisi');
      return;
    }

    try {
      let company;

      if (editingCompany) {
        company = await updateCompany(editingCompany.id, form);
      } else {
        company = await createCompany(form);
      }

      // ===== UPLOAD LOGO SETELAH COMPANY ADA =====
      if (logoFile && company?.id) {
        uploadingLogo = true;

        await companyService.uploadLogo(company.id, logoFile);

        // refresh logo url
        const logoUrl = await companyService.getLogo(company.id);
        updateCompanyLogo(company.id, logoUrl);
      }

      showModal = false;
      logoFile = null;
      logoPreview = null;
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      uploadingLogo = false;
    }
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      errorNotify('File harus berupa gambar');
      return;
    }

    logoFile = file;
    logoPreview = URL.createObjectURL(file);
  }

  async function handleDelete(company) {
    if (!confirm(`Yakin ingin menghapus "${company.name}"? Semua data terkait akan ikut terhapus.`)) {
      return;
    }

    try {
      await deleteCompany(company.id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  async function handleSelect(company) {
    try {
      // jika logo belum pernah di-load
      if (!company.logoUrl) {
        const logoUrl = await companyService.getLogo(company.id);
        updateCompanyLogo(company.id, logoUrl);
      }

      selectCompany(company);
      success(`${company.name} dipilih sebagai perusahaan aktif`);
    } catch (err) {
      console.error('Failed to load logo:', err);
      selectCompany(company); // tetap pilih walau logo gagal
    }
  }

  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
</script>

<div>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Perusahaan</h1>
      <p class="text-sm text-gray-500 mt-1">Kelola daftar perusahaan Anda</p>
    </div>
    <button class="btn-primary flex items-center gap-2" on:click={openCreateModal}>
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      Tambah Perusahaan
    </button>
  </div>

  {#if $companiesLoading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  {:else if $companies.length === 0}
    <div class="card text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Belum ada perusahaan</h3>
      <p class="text-gray-500 mb-4">Buat perusahaan pertama Anda untuk mulai menggunakan sistem</p>
      <button class="btn-primary" on:click={openCreateModal}>
        Buat Perusahaan
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each $companies as company}
        <div
          class="card relative {$selectedCompany?.id === company.id ? 'ring-2 ring-blue-500' : ''}"
        >
          {#if $selectedCompany?.id === company.id}
            <div class="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              Aktif
            </div>
          {/if}

          <div class="flex items-start gap-4 mb-4">
            <div class="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {#if company.logoUrl}
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  class="w-full h-full rounded-lg object-cover"
                />
              {:else}
                <span class="text-lg font-bold text-blue-600">
                  {getInitials(company.name)}
                </span>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 truncate">{company.name}</h3>
              {#if company.address}
                <p class="text-sm text-gray-500 truncate">{company.address}</p>
              {/if}
            </div>
          </div>

          <div class="space-y-2 text-sm text-gray-600 mb-4">
            {#if company.phone}
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {company.phone}
              </div>
            {/if}
            {#if company.email}
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {company.email}
              </div>
            {/if}
          </div>

          <div class="flex items-center gap-2 pt-4 border-t border-gray-100">
            {#if $selectedCompany?.id !== company.id}
              <button
                class="flex-1 btn-secondary text-sm"
                on:click={() => handleSelect(company)}
              >
                Pilih
              </button>
            {/if}
            <a
              href="/template-editor"
              use:link
              class="flex-1 px-3 py-2 text-sm text-center text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              on:click={() => handleSelect(company)}
            >
              Edit Template
            </a>
            <button
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              on:click={() => openEditModal(company)}
              title="Edit"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              on:click={() => handleDelete(company)}
              title="Hapus"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal Form -->
<Modal bind:show={showModal} title={editingCompany ? 'Edit Perusahaan' : 'Tambah Perusahaan'} size="md">
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1" for="name">
        Nama Perusahaan *
      </label>
      <input
        id="name"
        type="text"
        bind:value={form.name}
        class="input-field"
        placeholder="PT Contoh Sejahtera"
        required
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1" for="address">
        Alamat
      </label>
      <textarea
        id="address"
        bind:value={form.address}
        class="input-field"
        rows="2"
        placeholder="Jl. Contoh No. 123, Kota"
      ></textarea>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="phone">
          Telepon
        </label>
        <input
          id="phone"
          type="text"
          bind:value={form.phone}
          class="input-field"
          placeholder="(021) 123-4567"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          bind:value={form.email}
          class="input-field"
          placeholder="info@perusahaan.com"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="website">
          Website
        </label>
        <input
          id="website"
          type="text"
          bind:value={form.website}
          class="input-field"
          placeholder="www.perusahaan.com"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="tax_id">
          NPWP
        </label>
        <input
          id="tax_id"
          type="text"
          bind:value={form.tax_id}
          class="input-field"
          placeholder="00.000.000.0-000.000"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Logo Perusahaan
      </label>

      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
          {#if logoPreview}
            <img src={logoPreview} class="w-full h-full object-cover" />
          {:else if editingCompany?.logoUrl}
            <img src={editingCompany.logoUrl} class="w-full h-full object-cover" />
          {:else}
            <span class="text-gray-400 text-sm">No logo</span>
          {/if}
        </div>

        <input
          type="file"
          accept="image/*"
          on:change={handleLogoChange}
        />
      </div>
    </div>

    <div class="flex justify-end gap-3 pt-4">
      <button
        type="button"
        class="btn-secondary"
        on:click={() => showModal = false}
      >
        Batal
      </button>
      <button type="submit" class="btn-primary" disabled={uploadingLogo}>
        {uploadingLogo
          ? 'Mengunggah logo...'
          : editingCompany ? 'Simpan Perubahan' : 'Buat Perusahaan'}
      </button>
    </div>
  </form>
</Modal>
