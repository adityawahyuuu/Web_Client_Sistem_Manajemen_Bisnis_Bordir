<script>
  import { onMount } from 'svelte';
  import { customerCount, loadCustomers } from '../stores/customers.js';
  import { invoiceStats, loadInvoices } from '../stores/invoices.js';
  import { waybillStats, loadWaybills } from '../stores/waybills.js';
  import { receiptStats, loadReceipts } from '../stores/receipts.js';

  onMount(() => {
    loadCustomers();
    loadInvoices();
    loadWaybills();
    loadReceipts();
  });

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
</script>

<div>
  <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

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
    <div class="card">
      <h2 class="text-lg font-semibold mb-4">Status Invoice</h2>
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

    <div class="card">
      <h2 class="text-lg font-semibold mb-4">Ringkasan Pembayaran</h2>
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Transfer Bank</span>
          <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{$receiptStats.byMethod.transfer}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Tunai</span>
          <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">{$receiptStats.byMethod.cash}</span>
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
</div>
