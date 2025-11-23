<script>
  import { link, useLocation } from 'svelte-routing';
  import { user, logout } from '../stores/auth.js';

  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/customers', label: 'Pelanggan', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { path: '/invoices', label: 'Invoice', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { path: '/waybills', label: 'Surat Jalan', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { path: '/receipts', label: 'Kwitansi', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' }
  ];

  function handleLogout() {
    logout();
  }
</script>

<aside class="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
  <div class="p-6 border-b border-gray-200">
    <h1 class="text-xl font-bold text-blue-600">Bordir System</h1>
    <p class="text-sm text-gray-500">Manajemen Bisnis</p>
  </div>

  <nav class="flex-1 p-4">
    <ul class="space-y-2">
      {#each menuItems as item}
        <li>
          <a
            href={item.path}
            use:link
            class="sidebar-link {$location.pathname === item.path ? 'active' : ''}"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
            </svg>
            {item.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>

  <div class="p-4 border-t border-gray-200">
    <div class="flex items-center gap-3 mb-3">
      <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
        <span class="text-blue-600 font-medium">
          {$user?.fullName?.charAt(0) || 'U'}
        </span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900 truncate">{$user?.fullName || 'User'}</p>
        <p class="text-xs text-gray-500 truncate">{$user?.email || ''}</p>
      </div>
    </div>
    <button on:click={handleLogout} class="w-full btn-secondary text-sm">
      Logout
    </button>
  </div>
</aside>
