<script>
  import { onMount } from 'svelte';
  import {
    whatsappStatus,
    whatsappLoading,
    initializeWhatsApp,
    getWhatsAppStatus,
    logoutWhatsApp,
    clearWhatsAppSession
  } from '../stores/whatsapp.js';
  import { success, error as showError } from '../stores/notifications.js';

  let pollingInterval = null;
  let isMobile = false;
  let pairingPhoneNumber = '';
  let mobileMethod = 'pairing'; // 'pairing' atau 'qr'

  // Detect if user is on mobile device
  function detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  }

  onMount(() => {
    isMobile = detectMobile();
    getWhatsAppStatus();

    // Poll status every 2 minutes when connecting (give user time to scan QR)
    pollingInterval = setInterval(() => {
      if ($whatsappStatus.status === 'connecting') {
        getWhatsAppStatus();
      }
    }, 120000);

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

  async function handleMobileQRInitialize() {
    try {
      // Initialize without phoneNumber to get QR code
      await initializeWhatsApp();
      success('QR code berhasil dibuat');
    } catch (error) {
      showError('Gagal membuat QR code: ' + error.message);
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

  async function handleRequestPairingCode() {
    if (!pairingPhoneNumber.trim()) {
      showError('Masukkan nomor telepon WhatsApp Anda');
      return;
    }
    try {
      // Initialize with phoneNumber to get pairing code directly
      await initializeWhatsApp(pairingPhoneNumber.trim());
      success('Kode pairing berhasil dibuat');
    } catch (error) {
      showError('Gagal membuat kode pairing: ' + error.message);
    }
  }

  async function handleClearSession() {
    if (!confirm('Hapus session WhatsApp? Anda perlu scan QR/pairing code lagi untuk connect.')) {
      return;
    }
    try {
      const result = await clearWhatsAppSession();
      if (result.data?.cleared) {
        success('Session berhasil dihapus');
      } else {
        success(result.message || 'Session berhasil dihapus');
      }
    } catch (error) {
      showError('Gagal menghapus session: ' + error.message);
    }
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
        {#if isMobile}
          <!-- Pilihan metode untuk mobile -->
          <div class="flex gap-2 mb-4">
            <button
              class="flex-1 px-3 py-2 text-sm rounded-lg {mobileMethod === 'pairing' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}"
              on:click={() => mobileMethod = 'pairing'}
            >
              Kode Pairing
            </button>
            <button
              class="flex-1 px-3 py-2 text-sm rounded-lg {mobileMethod === 'qr' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}"
              on:click={() => mobileMethod = 'qr'}
            >
              QR Code
            </button>
          </div>

          {#if mobileMethod === 'pairing'}
            <p class="text-gray-600 mb-4">
              Masukkan nomor telepon WhatsApp Anda untuk mendapatkan kode pairing 8 digit.
            </p>
            <div class="flex flex-col gap-3">
              <input
                type="tel"
                bind:value={pairingPhoneNumber}
                placeholder="Contoh: 081234567890"
                class="input-field"
              />
              <button
                class="btn-primary"
                on:click={handleRequestPairingCode}
                disabled={$whatsappLoading}
              >
                {$whatsappLoading ? 'Memproses...' : 'Dapatkan Kode Pairing'}
              </button>
            </div>
          {:else}
            <p class="text-gray-600 mb-4">
              Klik tombol di bawah untuk mendapatkan QR code, lalu scan menggunakan HP lain atau buka link di komputer.
            </p>
            <button
              class="btn-primary w-full"
              on:click={handleMobileQRInitialize}
              disabled={$whatsappLoading}
            >
              {$whatsappLoading ? 'Memproses...' : 'Dapatkan QR Code'}
            </button>
          {/if}
        {:else}
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
        {/if}
      </div>
    {:else if ($whatsappStatus.status === 'connecting' || $whatsappStatus.status === 'qr_ready') && ($whatsappStatus.qrCode || $whatsappStatus.pairingCode)}
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        {#if isMobile}
          <!-- Mobile: Prioritaskan pairing code jika ada, lalu QR code -->
          {#if $whatsappStatus.pairingCode}
            <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
              <p class="text-blue-800 font-medium mb-3">
                Hubungkan dengan Kode 8 Digit
              </p>

              <div class="bg-white border-2 border-blue-300 rounded-lg p-4 mb-4 text-center">
                <p class="text-sm text-gray-600 mb-2">Masukkan kode ini di WhatsApp:</p>
                <p class="text-3xl font-mono font-bold tracking-widest text-blue-600">
                  {$whatsappStatus.pairingCode}
                </p>
              </div>

              <p class="text-blue-700 text-sm mb-2">
                Cara menggunakan:
              </p>
              <ol class="list-decimal list-inside text-blue-700 text-sm space-y-1">
                <li>Buka WhatsApp di HP Anda</li>
                <li>Ketuk titik tiga → Perangkat tertaut → Tautkan perangkat</li>
                <li>Pilih "Tautkan dengan nomor telepon"</li>
                <li>Masukkan kode 8 digit di atas</li>
              </ol>
            </div>
            <p class="text-sm text-gray-500 mt-4 text-center">
              Kode pairing akan expired dalam beberapa menit
            </p>
          {:else if $whatsappStatus.qrCode}
            <p class="text-gray-600 mb-4">
              Scan QR code di bawah menggunakan HP lain atau buka link di komputer:
            </p>
            <div class="flex justify-center">
              <img
                src={$whatsappStatus.qrCode}
                alt="WhatsApp QR Code"
                class="border rounded-lg max-w-full"
                style="max-height: 250px;"
              />
            </div>
            <p class="text-sm text-gray-500 mt-4 text-center">
              QR code akan diperbarui otomatis setiap 2 menit
            </p>
          {:else}
            <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p class="text-yellow-700 text-sm">
                Data belum tersedia. Silakan coba lagi.
              </p>
            </div>
          {/if}
        {:else}
          <!-- Desktop: Tampilkan QR code -->
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
            QR code akan diperbarui otomatis setiap 2 menit
          </p>
        {/if}
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

  <div class="card mb-6">
    <h2 class="text-lg font-semibold mb-4">Panduan Penggunaan</h2>
    <ul class="list-disc list-inside text-gray-600 space-y-2">
      <li>Pastikan HP Anda terhubung ke internet saat menggunakan WhatsApp</li>
      <li>Setelah scan QR code, tunggu beberapa saat hingga status berubah menjadi "Terhubung"</li>
      <li>Anda dapat mengirim invoice, kwitansi, dan surat jalan dari halaman masing-masing</li>
      <li>Jika koneksi terputus, kembali ke halaman ini untuk menghubungkan ulang</li>
    </ul>
  </div>

  <div class="card">
    <h2 class="text-lg font-semibold mb-4">Troubleshooting</h2>
    <p class="text-gray-600 mb-4">
      Gunakan tombol di bawah jika mengalami masalah seperti QR code tidak muncul,
      error connection berulang, atau ingin ganti akun WhatsApp.
    </p>
    <button
      class="btn-danger"
      on:click={handleClearSession}
      disabled={$whatsappLoading}
    >
      {$whatsappLoading ? 'Menghapus...' : 'Clear Session'}
    </button>
  </div>
</div>

<style>
  .btn-danger {
    @apply px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .input-field {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  }
</style>