<script>
  import { link } from 'svelte-routing';
  import { withBasePath } from '../lib/router.js';
  import { customers, customerCount, loadCustomers } from '../stores/customers.js';
  import { invoices, invoiceStats, invoicesLoading, loadInvoices } from '../stores/invoices.js';
  import { waybillStats, loadWaybills } from '../stores/waybills.js';
  import { selectedCompany, hasCompanies } from '../stores/company.js';
  import { sidebarOpen } from '../stores/ui.js';
  import CompanySelector from '../components/CompanySelector.svelte';

  $: if ($selectedCompany?.id) {
    loadCustomers();
    loadInvoices();
    loadWaybills();
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(Number(amount) || 0);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getInvoiceStatusBadge(status) {
    const map = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700'
    };
    const labels = { draft: 'Draft', sent: 'Terkirim', paid: 'Lunas' };
    return { cls: map[status] || map.draft, label: labels[status] || status };
  }

  $: recentInvoices = $invoices.slice(0, 5);
</script>

<div>
  <!-- Top bar -->
  <div class="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-4">
    <button
      class="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-700"
      on:click={() => sidebarOpen.update(v => !v)}
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>
    <div class="flex-1"></div>
    <div class="ml-auto flex-shrink-0">
      <CompanySelector />
    </div>
  </div>

  <!-- Content -->
  <div class="p-4 sm:p-6">

    {#if !$hasCompanies}
      <!-- No company state -->
      <div class="max-w-lg mx-auto mt-12 text-center">
        <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Selamat Datang!</h2>
        <p class="text-gray-500 mb-6">Buat perusahaan pertama Anda untuk mulai mengelola invoice, surat jalan, dan kwitansi.</p>
        <a href={withBasePath('/companies')} use:link class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Buat Perusahaan
        </a>
      </div>

    {:else if !$selectedCompany}
      <!-- Company not selected -->
      <div class="max-w-lg mx-auto mt-12 text-center">
        <div class="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Pilih Perusahaan</h2>
        <p class="text-gray-500">Pilih perusahaan dari dropdown di atas untuk melihat dashboard.</p>
      </div>

    {:else}
      <!-- Dashboard content -->
      <div class="mb-6">
        <h1 class="text-xl font-semibold text-gray-900">Beranda</h1>
        <p class="text-sm text-gray-500 mt-0.5">Ringkasan data untuk <span class="font-medium text-gray-700">{$selectedCompany.name}</span></p>
      </div>

      <!-- Quick actions -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <a href={withBasePath('/invoices')} use:link class="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group flex items-center gap-3 md:flex-col md:items-start md:p-5">
          <div class="w-9 h-9 md:w-10 md:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 md:mb-3 group-hover:bg-blue-100 transition-colors">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-700 truncate">Buat Invoice</p>
            <p class="text-xs text-gray-400 mt-0.5 hidden md:block">Tambah invoice baru</p>
          </div>
        </a>

        <a href={withBasePath('/receipts')} use:link class="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-sm transition-all group flex items-center gap-3 md:flex-col md:items-start md:p-5">
          <div class="w-9 h-9 md:w-10 md:h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 md:mb-3 group-hover:bg-green-100 transition-colors">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-700 truncate">Buat Kwitansi</p>
            <p class="text-xs text-gray-400 mt-0.5 hidden md:block">Catat pembayaran</p>
          </div>
        </a>

        <a href={withBasePath('/waybills')} use:link class="bg-white rounded-xl border border-gray-200 p-4 hover:border-orange-300 hover:shadow-sm transition-all group flex items-center gap-3 md:flex-col md:items-start md:p-5">
          <div class="w-9 h-9 md:w-10 md:h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0 md:mb-3 group-hover:bg-orange-100 transition-colors">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-700 truncate">Surat Jalan</p>
            <p class="text-xs text-gray-400 mt-0.5 hidden md:block">Kelola pengiriman</p>
          </div>
        </a>

        <a href={withBasePath('/customers')} use:link class="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all group flex items-center gap-3 md:flex-col md:items-start md:p-5">
          <div class="w-9 h-9 md:w-10 md:h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 md:mb-3 group-hover:bg-purple-100 transition-colors">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-700 truncate">Pelanggan</p>
            <p class="text-xs text-gray-400 mt-0.5 hidden md:block">Kelola data pelanggan</p>
          </div>
        </a>
      </div>

      <!-- Stats cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Total Pelanggan</p>
          <p class="text-2xl sm:text-3xl font-bold text-gray-900">{$customerCount}</p>
          <a href={withBasePath('/customers')} use:link class="text-xs text-blue-600 hover:underline mt-2 inline-block">Lihat semua →</a>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Total Invoice</p>
          <p class="text-2xl sm:text-3xl font-bold text-gray-900">{$invoiceStats.total}</p>
          <div class="flex flex-wrap gap-1 mt-2">
            <span class="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded whitespace-nowrap">{$invoiceStats.draft} draft</span>
            <span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded whitespace-nowrap">{$invoiceStats.paid} lunas</span>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Surat Jalan</p>
          <p class="text-2xl sm:text-3xl font-bold text-gray-900">{$waybillStats.total}</p>
          <div class="flex flex-wrap gap-1 mt-2">
            <span class="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded whitespace-nowrap">{$waybillStats.pending} menunggu</span>
            <span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded whitespace-nowrap">{$waybillStats.delivered} terkirim</span>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Nilai Invoice</p>
          <p class="text-lg sm:text-2xl font-bold text-gray-900 leading-tight break-all">{formatCurrency($invoiceStats.totalAmount)}</p>
          <p class="text-xs text-gray-400 mt-2">Total semua invoice</p>
        </div>
      </div>

      <!-- Recent invoices + Invoice status -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent invoices table -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 class="text-sm font-semibold text-gray-900">Invoice Terbaru</h2>
            <a href={withBasePath('/invoices')} use:link class="text-xs text-blue-600 hover:underline">Lihat semua</a>
          </div>
          {#if $invoicesLoading}
            <div class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          {:else if recentInvoices.length === 0}
            <div class="py-12 text-center text-gray-400 text-sm">Belum ada invoice</div>
          {:else}
            <!-- Desktop: table -->
            <div class="hidden sm:block overflow-x-auto">
              <table class="min-w-full">
                <thead>
                  <tr class="border-b border-gray-100">
                    <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">No. Invoice</th>
                    <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">Tanggal</th>
                    <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">Total</th>
                    <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  {#each recentInvoices as invoice}
                    {@const badge = getInvoiceStatusBadge(invoice.status)}
                    <tr class="hover:bg-gray-50">
                      <td class="px-5 py-3 text-sm font-medium text-blue-600">{invoice.invoice_number}</td>
                      <td class="px-5 py-3 text-sm text-gray-600">{formatDate(invoice.invoice_date)}</td>
                      <td class="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                      <td class="px-5 py-3">
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium {badge.cls}">{badge.label}</span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            <!-- Mobile: list cards -->
            <div class="sm:hidden divide-y divide-gray-50">
              {#each recentInvoices as invoice}
                {@const badge = getInvoiceStatusBadge(invoice.status)}
                <div class="px-4 py-3 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-blue-600 truncate">{invoice.invoice_number}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{formatDate(invoice.invoice_date)}</p>
                  </div>
                  <div class="flex-shrink-0 text-right">
                    <p class="text-sm font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                    <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 {badge.cls}">{badge.label}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Right column: Invoice status breakdown + shortcuts -->
        <div class="space-y-4">
          <!-- Invoice status summary -->
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <h2 class="text-sm font-semibold text-gray-900 mb-4">Status Invoice</h2>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span class="text-sm text-gray-600">Draft</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">{$invoiceStats.draft}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span class="text-sm text-gray-600">Terkirim</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">{$invoiceStats.sent}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-green-500"></div>
                  <span class="text-sm text-gray-600">Lunas</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">{$invoiceStats.paid}</span>
              </div>
              <div class="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">Total Nilai</span>
                <span class="text-sm font-bold text-blue-600">{formatCurrency($invoiceStats.totalAmount)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    {/if}
  </div>
</div>
