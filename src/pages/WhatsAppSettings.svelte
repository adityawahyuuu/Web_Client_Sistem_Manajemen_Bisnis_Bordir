<script>
  import { onMount } from 'svelte';
  import {
    whatsappStatus,
    whatsappLoading,
    initializeWhatsApp,
    getWhatsAppStatus,
    logoutWhatsApp
  } from '../stores/whatsapp.js';
  import { success, error as showError } from '../stores/notifications.js';

  let pollingInterval = null;

  onMount(() => {
    getWhatsAppStatus();

    // Poll status every 5 seconds when connecting
    pollingInterval = setInterval(() => {
      if ($whatsappStatus.status === 'connecting') {
        getWhatsAppStatus();
      }
    }, 5000);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  });

  async function handleInitialize() {
    try {
      await initializeWhatsApp();
      success('Inisialisasi WhatsApp berhasil');
    } catch (error) {
      showError('Gagal menginisialisasi WhatsApp: ' + error.message);
    }
  }

  async function handleLogout() {
    if (!confirm('Apakah Anda yakin ingin logout dari WhatsApp?')) return;
    try {
      await logoutWhatsApp();
      success('Berhasil logout dari WhatsApp');
    } catch (error) {
      showError('Gagal logout: ' + error.message);
    }
  }

  async function handleRefresh() {
    await getWhatsAppStatus();
  }

  function getStatusColor(status) {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'connected': return 'Terhubung';
      case 'connecting': return 'Menghubungkan...';
      default: return 'Tidak Terhubung';
    }
  }
</script>

<div>
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Pengaturan WhatsApp</h1>
    <button
      class="btn-secondary"
      on:click={handleRefresh}
      disabled={$whatsappLoading}
    >
      Refresh Status
    </button>
  </div>

  <div class="card mb-6">
    <h2 class="text-lg font-semibold mb-4">Status Koneksi</h2>

    <div class="flex items-center gap-4 mb-6">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full {$whatsappStatus.status === 'connected' ? 'bg-green-500' : $whatsappStatus.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}"></span>
        <span class="font-medium {getStatusColor($whatsappStatus.status)}">
          {getStatusLabel($whatsappStatus.status)}
        </span>
      </div>

      {#if $whatsappStatus.phoneNumber}
        <span class="text-gray-600">
          Nomor: {$whatsappStatus.phoneNumber}
        </span>
      {/if}
    </div>

    {#if $whatsappStatus.status === 'disconnected'}
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <p class="text-gray-600 mb-4">
          WhatsApp belum terhubung. Klik tombol di bawah untuk memulai koneksi dan scan QR code.
        </p>
        <button
          class="btn-primary"
          on:click={handleInitialize}
          disabled={$whatsappLoading}
        >
          {$whatsappLoading ? 'Menginisialisasi...' : 'Hubungkan WhatsApp'}
        </button>
      </div>
    {:else if $whatsappStatus.status === 'connecting' && $whatsappStatus.qrCode}
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <p class="text-gray-600 mb-4">
          Scan QR code di bawah menggunakan WhatsApp di HP Anda:
        </p>
        <div class="flex justify-center">
          <img
            src={$whatsappStatus.qrCode}
            alt="WhatsApp QR Code"
            class="border rounded-lg"
          />
        </div>
        <p class="text-sm text-gray-500 mt-4 text-center">
          QR code akan diperbarui otomatis jika expired
        </p>
      </div>
    {:else if $whatsappStatus.status === 'connected'}
      <div class="bg-green-50 p-4 rounded-lg mb-4">
        <p class="text-green-700 mb-4">
          WhatsApp sudah terhubung dan siap digunakan untuk mengirim invoice, kwitansi, dan surat jalan.
        </p>
        <button
          class="btn-danger"
          on:click={handleLogout}
          disabled={$whatsappLoading}
        >
          {$whatsappLoading ? 'Logout...' : 'Logout WhatsApp'}
        </button>
      </div>
    {/if}
  </div>

  <div class="card">
    <h2 class="text-lg font-semibold mb-4">Panduan Penggunaan</h2>
    <ul class="list-disc list-inside text-gray-600 space-y-2">
      <li>Pastikan HP Anda terhubung ke internet saat menggunakan WhatsApp</li>
      <li>Setelah scan QR code, tunggu beberapa saat hingga status berubah menjadi "Terhubung"</li>
      <li>Anda dapat mengirim invoice, kwitansi, dan surat jalan dari halaman masing-masing</li>
      <li>Jika koneksi terputus, kembali ke halaman ini untuk menghubungkan ulang</li>
    </ul>
  </div>
</div>

<style>
  .btn-danger {
    @apply px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed;
  }
</style>