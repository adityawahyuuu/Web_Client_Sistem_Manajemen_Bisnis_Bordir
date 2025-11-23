<script>
  import { navigate } from 'svelte-routing';
  import { login } from '../stores/auth.js';
  import { error as showError, success } from '../stores/notifications.js';

  let email = '';
  let password = '';
  let loading = false;

  async function handleSubmit() {
    if (!email || !password) {
      showError('Email dan password harus diisi');
      return;
    }

    loading = true;

    try {
      const result = await login(email, password);

      if (result.success) {
        success('Login berhasil!');
        navigate('/');
      } else {
        showError(result.error);
      }
    } catch (err) {
      showError('Terjadi kesalahan');
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

    <h2 class="text-xl font-semibold mb-4">Login</h2>

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
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          bind:value={password}
          class="input-field"
          placeholder="Masukkan password"
        />
      </div>

      <button type="submit" class="w-full btn-primary" disabled={loading}>
        {loading ? 'Loading...' : 'Login'}
      </button>
    </form>

    <div class="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
      <p class="font-medium mb-1">Demo Credentials:</p>
      <p>Email: admin@bordir.com</p>
      <p>Password: admin123</p>
    </div>
  </div>
</div>
