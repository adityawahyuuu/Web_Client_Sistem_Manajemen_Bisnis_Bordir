<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-routing';
  import { customerCount, loadCustomers } from '../stores/customers.js';
  import { invoiceStats, loadInvoices } from '../stores/invoices.js';
  import { waybillStats, loadWaybills } from '../stores/waybills.js';
  import { receiptStats, loadReceipts } from '../stores/receipts.js';
  import { selectedCompany, hasCompanies, loadCompanies } from '../stores/company.js';

  onMount(async () => {
    await loadCompanies();
    loadCustomers();
    loadInvoices();
    loadWaybills();
    loadReceipts();
  });

  function formatCurrency(amount) {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  }

  // Quick actions for the current company
  const quickActions = [
    {
      label: 'Buat Invoice',
      href: '/invoices',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      color: 'blue'
    },
    {
      label: 'Edit Template',
      href: '/template-editor',
      icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
      color: 'purple'
    },
    {
      label: 'Tambah Pelanggan',
      href: '/customers',
      icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
      color: 'green'
    },
    {
      label: 'Kelola Perusahaan',
      href: '/companies',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      color: 'orange'
    }
  ];

  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:bg-blue-50' },
    green: { bg: 'bg-green-100', text: 'text-green-600', hover: 'hover:bg-green-50' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:bg-purple-50' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', hover: 'hover:bg-orange-50' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', hover: 'hover:bg-yellow-50' }
  };
</script>

<div>
  <!-- Header with Company Context -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      {#if $selectedCompany}
        <p class="text-sm text-gray-500 mt-1">
          Menampilkan data untuk <span class="font-medium text-gray-700">{$selectedCompany.name}</span>
        </p>
      {/if}
    </div>

    {#if !$hasCompanies}
      <a
        href="/companies"
        use:link
        class="btn-primary flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Buat Perusahaan
      </a>
    {/if}
  </div>

  <!-- No Company Warning -->
  {#if !$hasCompanies}
    <div class="card bg-yellow-50 border border-yellow-200 mb-6">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-yellow-800">Belum ada perusahaan</h3>
          <p class="text-sm text-yellow-700 mt-1">
            Anda perlu membuat perusahaan terlebih dahulu untuk mulai menggunakan sistem invoice.
            Setiap perusahaan dapat memiliki template dokumen sendiri.
          </p>
          <a
            href="/companies"
            use:link
            class="inline-flex items-center gap-1 text-sm font-medium text-yellow-800 hover:text-yellow-900 mt-2"
          >
            Buat Perusahaan Sekarang
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  {/if}

  <!-- Quick Actions -->
  {#if $hasCompanies}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {#each quickActions as action}
        <a
          href={action.href}
          use:link
          class="card {colorClasses[action.color].hover} border-2 border-transparent hover:border-{action.color}-200 transition-all group"
        >
          <div class="flex flex-col items-center text-center py-2">
            <div class="w-12 h-12 {colorClasses[action.color].bg} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6 {colorClasses[action.color].text}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={action.icon} />
              </svg>
            </div>
            <span class="text-sm font-medium text-gray-700">{action.label}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}

  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="card">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p class="text-sm text-gray-500">Total Pelanggan</p>
          <p class="text-2xl font-bold text-gray-900">{$customerCount}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p class="text-sm text-gray-500">Total Invoice</p>
          <p class="text-2xl font-bold text-gray-900">{$invoiceStats.total}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p class="text-sm text-gray-500">Surat Jalan</p>
          <p class="text-2xl font-bold text-gray-900">{$waybillStats.total}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <p class="text-sm text-gray-500">Total Kwitansi</p>
          <p class="text-2xl font-bold text-gray-900">{$receiptStats.total}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Invoice Status -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Status Invoice</h2>
        <a href="/invoices" use:link class="text-sm text-blue-600 hover:text-blue-700">
          Lihat Semua
        </a>
      </div>
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Draft</span>
          <span class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">{$invoiceStats.draft}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Terkirim</span>
          <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{$invoiceStats.sent}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Lunas</span>
          <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">{$invoiceStats.paid}</span>
        </div>
        <div class="border-t pt-3 mt-3">
          <div class="flex justify-between items-center">
            <span class="font-medium">Total Nilai</span>
            <span class="font-bold text-blue-600">{formatCurrency($invoiceStats.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Summary -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Ringkasan Pembayaran</h2>
        <a href="/receipts" use:link class="text-sm text-blue-600 hover:text-blue-700">
          Lihat Semua
        </a>
      </div>
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Transfer Bank</span>
          <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{$receiptStats.byMethod?.transfer || 0}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Tunai</span>
          <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">{$receiptStats.byMethod?.cash || 0}</span>
        </div>
        <div class="border-t pt-3 mt-3">
          <div class="flex justify-between items-center">
            <span class="font-medium">Total Diterima</span>
            <span class="font-bold text-green-600">{formatCurrency($receiptStats.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Template Editor Quick Access Card -->
  {#if $selectedCompany}
    <div class="card mt-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">Template Dokumen</h3>
            <p class="text-sm text-gray-600">
              Kustomisasi template invoice, surat jalan, dan kwitansi untuk {$selectedCompany.name}
            </p>
          </div>
        </div>
        <a
          href="/template-editor"
          use:link
          class="btn-primary flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Template
        </a>
      </div>
    </div>
  {/if}
</div>
