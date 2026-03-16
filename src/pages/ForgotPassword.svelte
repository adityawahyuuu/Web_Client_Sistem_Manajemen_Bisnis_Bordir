<script>
  import { navigate } from 'svelte-routing';
  import authService from '../services/auth.service.js';
  import { error as showError, success } from '../stores/notifications.js';

  let email = '';
  let loading = false;
  let emailSent = false;

  async function handleSubmit() {
    if (!email) {
      showError('Email harus diisi');
      return;
    }

    loading = true;

    try {
      const result = await authService.forgotPassword(email);
      success(result.message || 'Link reset password telah dikirim ke email Anda');
      emailSent = true;
    } catch (err) {
      showError(err.message || 'Gagal mengirim link reset password');
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
  <div class="card w-full max-w-md">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Patchwork</h1>
      <p class="text-gray-500">Patchwork Invoice Management</p>
    </div>

    {#if !emailSent}
      <h2 class="text-xl font-semibold mb-2">Lupa Password</h2>
      <p class="text-sm text-gray-600 mb-6">
        Masukkan email Anda dan kami akan mengirimkan link untuk reset password
      </p>

      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            class="input-field"
            placeholder="Masukkan email"
            disabled={loading}
          />
        </div>

        <button type="submit" class="w-full btn-primary" disabled={loading}>
          {loading ? 'Mengirim...' : 'Kirim Link Reset Password'}
        </button>
      </form>

      <div class="mt-4 text-center text-sm text-gray-600">
        Ingat password Anda?
        <a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">
          Login di sini
        </a>
      </div>
    {:else}
      <div class="text-center">
        <div class="mb-4">
          <svg class="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>

        <h2 class="text-xl font-semibold mb-2">Email Terkirim!</h2>
        <p class="text-gray-600 mb-6">
          Kami telah mengirim link reset password ke <span class="font-medium">{email}</span>.
          Silakan cek email Anda dan ikuti instruksi yang diberikan.
        </p>

        <div class="space-y-3">
          <button
            type="button"
            on:click={() => emailSent = false}
            class="w-full btn-secondary"
          >
            Kirim Ulang
          </button>

          <a href="/login" class="block w-full btn-primary text-center">
            Kembali ke Login
          </a>
        </div>
      </div>
    {/if}
  </div>
</div>
