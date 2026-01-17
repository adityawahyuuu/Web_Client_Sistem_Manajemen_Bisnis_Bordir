<script>
  import { navigate } from 'svelte-routing';
  import authService from '../services/auth.service.js';
  import { error as showError, success } from '../stores/notifications.js';
  import { onMount } from 'svelte';

  let email = '';
  let otpCode = '';
  let loading = false;
  let resendLoading = false;
  let countdown = 0;

  // Get email from URL query params
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    email = params.get('email') || '';

    if (!email) {
      showError('Email tidak ditemukan');
      navigate('/register');
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
      navigate('/login');
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

      // Start countdown (60 seconds)
      countdown = 60;
      const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(timer);
        }
      }, 1000);
    } catch (err) {
      showError(err.message || 'Gagal mengirim ulang OTP');
    } finally {
      resendLoading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
  <div class="card w-full max-w-md">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Bordir System</h1>
      <p class="text-gray-500">Sistem Manajemen Bisnis Bordir</p>
    </div>

    <h2 class="text-xl font-semibold mb-2">Verifikasi Email</h2>
    <p class="text-sm text-gray-600 mb-6">
      Kami telah mengirim kode OTP ke <span class="font-medium">{email}</span>
    </p>

    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div>
        <label for="otpCode" class="block text-sm font-medium text-gray-700 mb-1">
          Kode OTP (6 digit)
        </label>
        <input
          id="otpCode"
          type="text"
          bind:value={otpCode}
          maxlength="6"
          inputmode="numeric"
          class="input-field text-center text-2xl tracking-widest"
          placeholder="000000"
          disabled={loading}
        />
      </div>

      <button type="submit" class="w-full btn-primary" disabled={loading}>
        {loading ? 'Memverifikasi...' : 'Verifikasi'}
      </button>
    </form>

    <div class="mt-4 text-center text-sm">
      <p class="text-gray-600 mb-2">Tidak menerima kode?</p>
      <button
        type="button"
        on:click={handleResendOtp}
        class="text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
        disabled={resendLoading || countdown > 0}
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

    <div class="mt-6 text-center text-sm text-gray-600">
      <a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">
        Kembali ke Login
      </a>
    </div>
  </div>
</div>
