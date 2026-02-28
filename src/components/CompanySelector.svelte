<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-routing';
  import {
    companies,
    selectedCompany,
    companiesLoading,
    selectCompany,
  } from '../stores/company.js';

  let isOpen = false;
  let dropdownRef;

  onMount(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event) {
      if (dropdownRef && !dropdownRef.contains(event.target)) {
        isOpen = false;
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function handleSelect(company) {
    selectCompany(company);
    isOpen = false;
  }

  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
</script>

<div class="company-selector relative" bind:this={dropdownRef}>
  <button
    type="button"
    class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
    on:click={toggleDropdown}
  >
    {#if $companiesLoading}
      <div class="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      <span class="text-sm text-gray-400">Loading...</span>
    {:else if $selectedCompany}
      <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        <span class="text-xs font-semibold text-blue-600">
          {getInitials($selectedCompany.name)}
        </span>
      </div>
      <div class="text-left hidden sm:block">
        <div class="text-sm font-medium text-gray-900 max-w-[150px] truncate">
          {$selectedCompany.name}
        </div>
      </div>
      <svg
        class="w-4 h-4 text-gray-400 transition-transform {isOpen ? 'rotate-180' : ''}"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    {:else}
      <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <span class="text-sm text-gray-500">Pilih Perusahaan</span>
      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    {/if}
  </button>

  {#if isOpen}
    <div class="absolute top-full right-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
      <!-- Company List -->
      <div class="max-h-64 overflow-y-auto">
        {#if $companies.length > 0}
          {#each $companies as company}
            <button
              type="button"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors {$selectedCompany?.id === company.id ? 'bg-blue-50' : ''}"
              on:click={() => handleSelect(company)}
            >
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-semibold text-blue-600">{getInitials(company.name)}</span>
              </div>
              <div class="flex-1 text-left min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">{company.name}</div>
                {#if company.address}
                  <div class="text-xs text-gray-500 truncate">{company.address}</div>
                {/if}
              </div>
              {#if $selectedCompany?.id === company.id}
                <svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              {/if}
            </button>
          {/each}
        {:else}
          <div class="px-4 py-6 text-center text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p class="text-sm">Belum ada perusahaan</p>
          </div>
        {/if}
      </div>

      <!-- Divider -->
      <div class="border-t border-gray-100"></div>

      <!-- Actions -->
      <div class="p-2">
        <a
          href="/companies"
          use:link
          class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          on:click={() => isOpen = false}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Tambah Perusahaan Baru
        </a>
        <a
          href="/companies"
          use:link
          class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          on:click={() => isOpen = false}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Kelola Perusahaan
        </a>
      </div>
    </div>
  {/if}
</div>
