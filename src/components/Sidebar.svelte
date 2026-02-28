<script>
  import { link, useLocation } from 'svelte-routing';
  import { user, logout } from '../stores/auth.js';
  import { selectedCompany, clearCompanyState } from '../stores/company.js';
  import logoUrl from '../assets/logo.png';

  const location = useLocation();

  const mainMenuItems = [
    {
      path: '/',
      label: 'Beranda',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      path: '/customers',
      label: 'Pelanggan',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
    },
    {
      path: '/items',
      label: 'Item',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    },
    {
      path: '/invoices',
      label: 'Invoice',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      path: '/receipts',
      label: 'Kwitansi',
      icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      path: '/waybills',
      label: 'Surat Jalan',
      icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0'
    }
  ];

  const bottomMenuItems = [
    {
      path: '/companies',
      label: 'Settings',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    }
  ];

  function isActive(path, currentPath) {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }

  function handleLogout() {
    clearCompanyState();
    logout();
  }

  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<aside class="w-64 bg-gray-900 h-screen flex flex-col flex-shrink-0 overflow-y-auto">
  <!-- Logo area -->
  <div class="h-20 flex items-center justify-center border-b border-gray-700 px-4 flex-shrink-0">
    <img src={logoUrl} alt="Logo" class="h-14 w-auto object-contain" />
  </div>

  <!-- Navigation -->
  <nav class="flex-1 px-3 py-4 space-y-0.5">
    {#each mainMenuItems as item}
      <a
        href={item.path}
        use:link
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm
          {isActive(item.path, $location.pathname)
            ? 'bg-gray-800 text-white font-medium'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'}"
      >
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
        </svg>
        {item.label}
      </a>
    {/each}
  </nav>

  <!-- Bottom nav + User -->
  <div class="border-t border-gray-700 px-3 py-4 space-y-0.5 flex-shrink-0">
    {#each bottomMenuItems as item}
      <a
        href={item.path}
        use:link
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm
          {isActive(item.path, $location.pathname)
            ? 'bg-gray-800 text-white font-medium'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'}"
      >
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
        </svg>
        {item.label}
      </a>
    {/each}

    <button
      on:click={handleLogout}
      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm text-gray-400 hover:text-white hover:bg-gray-800"
    >
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Logout
    </button>

    <!-- User info -->
    <div class="flex items-center gap-3 px-3 pt-3 mt-2 border-t border-gray-700">
      <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
        <span class="text-white text-xs font-semibold">{getInitials($user?.fullName)}</span>
      </div>
      <div class="min-w-0">
        <p class="text-sm text-white font-medium truncate">{$user?.fullName || 'User'}</p>
        <p class="text-xs text-gray-400 truncate">{$user?.email || ''}</p>
      </div>
    </div>
  </div>

  <!-- App name -->
  <div class="bg-black px-4 py-2 text-center flex-shrink-0">
    <span class="text-gray-500 text-xs">Deskripsi singkat aplikasi</span>
  </div>
</aside>
