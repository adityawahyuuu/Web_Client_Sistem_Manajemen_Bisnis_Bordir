<script>
  import { navigate } from 'svelte-routing';
  import authService from '../services/auth.service.js';
  import { error as showError, success } from '../stores/notifications.js';
  import { withBasePath } from '../lib/router.js';
  import { onMount } from 'svelte';
  import logo from '../assets/logo.png';

  let email = '';
  let otpCode = '';
  let loading = false;
  let resendLoading = false;
  let countdown = 0;

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    email = params.get('email') || '';
    if (!email) {
      showError('Email tidak ditemukan');
      navigate(withBasePath('/register'));
    }
  });

  async function handleSubmit() {
    if (!otpCode) {
      showError('Kode OTP harus diisi');
      return;
    }
    if (otpCode.length !== 6) {
      showError('Kode OTP harus 6 digit');
      return;
    }
    loading = true;
    try {
      const result = await authService.verifyEmail(email, otpCode);
      success(result.message || 'Email berhasil diverifikasi! Silakan login.');
      navigate(withBasePath('/login'));
    } catch (err) {
      showError(err.message || 'Kode OTP tidak valid');
    } finally {
      loading = false;
    }
  }

  async function handleResendOtp() {
    if (countdown > 0) return;
    resendLoading = true;
    try {
      const result = await authService.resendOtp(email);
      success(result.message || 'Kode OTP baru telah dikirim ke email Anda');
      countdown = 60;
      const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) clearInterval(timer);
      }, 1000);
    } catch (err) {
      showError(err.message || 'Gagal mengirim ulang OTP');
    } finally {
      resendLoading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="w-full max-w-md">

    <!-- Header -->
    <div class="text-center mb-8">
      <img src={logo} alt="Bordir System" class="w-16 h-16 object-contain mx-auto mb-3" />
      <h1 class="text-xl font-bold text-gray-900">Bordir System</h1>
      <p class="text-sm text-gray-500 mt-0.5">Sistem Manajemen Bisnis Bordir</p>
    </div>

    <!-- Card -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-1">Verifikasi Email</h2>
      <p class="text-sm text-gray-500 mb-6">
        Kode OTP telah dikirim ke <span class="font-medium text-gray-700">{email}</span>
      </p>

      <form on:submit|preventDefault={handleSubmit} class="space-y-4">

        <!-- OTP -->
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-3">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">KODE OTP</label>
          <input
            type="text"
            bind:value={otpCode}
            maxlength="6"
            inputmode="numeric"
            placeholder="000000"
            disabled={loading}
            class="w-full bg-transparent text-2xl font-bold tracking-widest text-center text-gray-800 focus:outline-none placeholder-gray-300"
          />
        </div>

        <!-- Submit -->
        <button
          type="submit"
          disabled={loading}
          class="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Memverifikasi...' : 'Verifikasi'}
        </button>
      </form>

      <div class="mt-5 text-center text-sm text-gray-500">
        <p class="mb-2">Tidak menerima kode?</p>
        <button
          type="button"
          on:click={handleResendOtp}
          disabled={resendLoading || countdown > 0}
          class="text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {#if resendLoading}
            Mengirim...
          {:else if countdown > 0}
            Kirim ulang dalam {countdown}s
          {:else}
            Kirim ulang kode OTP
          {/if}
        </button>
      </div>

      <p class="mt-5 text-center text-sm text-gray-500">
        <a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">Kembali ke Login</a>
      </p>
    </div>

  </div>
</div>
