<script>
  import { navigate } from 'svelte-routing';
  import authService from '../services/auth.service.js';
  import { error as showError, success } from '../stores/notifications.js';
  import { onMount } from 'svelte';

  let token = '';
  let password = '';
  let repeatPassword = '';
  let loading = false;
  let showPassword = false;
  let showRepeatPassword = false;

  // Get token from URL query params
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    token = params.get('token') || '';

    if (!token) {
      showError('Token tidak valid');
      navigate('/login');
    }
  });

  async function handleSubmit() {
    // Validation
    if (!password || !repeatPassword) {
      showError('Semua field harus diisi');
      return;
    }

    if (password !== repeatPassword) {
      showError('Password tidak cocok');
      return;
    }

    if (password.length < 8) {
      showError('Password minimal 8 karakter');
      return;
    }

    loading = true;

    try {
      const result = await authService.resetPassword(token, password, repeatPassword);
      success(result.message || 'Password berhasil direset! Silakan login dengan password baru.');
      navigate('/login');
    } catch (err) {
      showError(err.message || 'Gagal reset password. Token mungkin sudah expired.');
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
  <div class="card w-full max-w-md">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Bordir System</h1>
      <p class="text-gray-500">Sistem Manajemen Bisnis Bordir</p>
    </div>

    <h2 class="text-xl font-semibold mb-2">Reset Password</h2>
    <p class="text-sm text-gray-600 mb-6">
      Masukkan password baru Anda
    </p>

    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          Password Baru
        </label>
        <div class="relative">
          {#if showPassword}
            <input
              id="password"
              type="text"
              bind:value={password}
              class="input-field pr-10"
              placeholder="Masukkan password"
            />
          {:else}
            <input
              id="password"
              type="password"
              bind:value={password}
              class="input-field pr-10"
              placeholder="Masukkan password"
            />
          {/if}
          <button
            type="button"
            on:click={() => showPassword = !showPassword}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {#if showPassword}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
              </svg>
            {:else}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            {/if}
          </button>
        </div>
      </div>

      <div>
        <label for="repeatPassword" class="block text-sm font-medium text-gray-700 mb-1">
          Ulangi Password Baru
        </label>
        <div class="relative">
          {#if showRepeatPassword}
            <input
              id="repeatPassword"
              type="text"
              bind:value={repeatPassword}
              class="input-field pr-10"
              placeholder="Masukkan password lagi"
            />
          {:else}
            <input
              id="repeatPassword"
              type='password'
              bind:value={repeatPassword}
              class="input-field pr-10"
              placeholder="Masukkan password lagi"
              disabled={loading}
            />
          {/if}
          <button
            type="button"
            on:click={() => showRepeatPassword = !showRepeatPassword}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {#if showRepeatPassword}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
              </svg>
            {:else}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            {/if}
          </button>
        </div>
      </div>

      <button type="submit" class="w-full btn-primary" disabled={loading}>
        {loading ? 'Menyimpan...' : 'Reset Password'}
      </button>
    </form>

    <div class="mt-4 text-center text-sm text-gray-600">
      <a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">
        Kembali ke Login
      </a>
    </div>
  </div>
</div>
