<script>
  import { navigate } from 'svelte-routing';
  import authService from '../services/auth.service.js';
  import { error as showError, success } from '../stores/notifications.js';
  import logo from '../assets/logo.png';

  let email = '';
  let password = '';
  let repeatPassword = '';
  let name = '';
  let loading = false;
  let showPassword = false;
  let showRepeatPassword = false;

  async function handleSubmit() {
    if (!email || !password || !repeatPassword || !name) {
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
      const result = await authService.register(email, password, repeatPassword, name);
      success(result.message || 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi.');
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      showError(err.message || 'Terjadi kesalahan saat registrasi');
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="w-full max-w-md">

    <!-- Header -->
    <div class="text-center mb-8">
      <img src={logo} alt="Nama Aplikasi" class="w-16 h-16 object-contain mx-auto mb-3" />
      <h1 class="text-xl font-bold text-gray-900">Nama Aplikasi</h1>
      <p class="text-sm text-gray-500 mt-0.5">Deskripsi singkat aplikasi</p>
    </div>

    <!-- Card -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-6">Daftar Akun Baru</h2>

      <form on:submit|preventDefault={handleSubmit} class="space-y-4">

        <!-- Nama -->
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">NAMA LENGKAP</label>
          <input
            type="text"
            bind:value={name}
            autocomplete="name"
            placeholder="Nama lengkap Anda"
            disabled={loading}
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300"
          />
        </div>

        <!-- Email -->
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">EMAIL</label>
          <input
            type="email"
            bind:value={email}
            autocomplete="email"
            placeholder="nama@email.com"
            disabled={loading}
            class="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300"
          />
        </div>

        <!-- Password -->
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">PASSWORD</label>
          <div class="flex items-center gap-2">
            {#if showPassword}
              <input
                type="text"
                bind:value={password}
                autocomplete="new-password"
                disabled={loading}
                class="input-class"
              />
            {:else}
              <input
                type="password"
                bind:value={password}
                autocomplete="new-password"
                disabled={loading}
                class="input-class"
              />
            {/if}
            <button
              type="button"
              on:click={() => showPassword = !showPassword}
              tabindex="-1"
              class="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              {#if showPassword}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              {:else}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <!-- Ulangi Password -->
        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">ULANGI PASSWORD</label>
          <div class="flex items-center gap-2">
            {#if showRepeatPassword}
              <input
                bind:value={repeatPassword}
                autocomplete="new-password"
                placeholder="Ulangi password"
                disabled={loading}
                class="flex-1 bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300"
              />
            {:else}
              <input
                type="password"
                bind:value={repeatPassword}
                autocomplete="new-password"
                disabled={loading}
                class="flex-1 bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-300"
              />
            {/if}
            
            <button
              type="button"
              on:click={() => showRepeatPassword = !showRepeatPassword}
              tabindex="-1"
              class="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              {#if showRepeatPassword}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              {:else}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          disabled={loading}
          class="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Mendaftar...' : 'Daftar'}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-gray-500">
        Sudah punya akun?
        <a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">Login di sini</a>
      </p>
    </div>

  </div>
</div>
