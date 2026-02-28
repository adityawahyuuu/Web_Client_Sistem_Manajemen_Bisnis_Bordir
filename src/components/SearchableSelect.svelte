<script>
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';

  export let label = '';
  export let value = '';
  export let options = [];      // [{ value, label }]
  export let placeholder = 'Pilih...';
  export let disabled = false;
  export let loading = false;
  export let createLabel = '';

  const dispatch = createEventDispatcher();

  let open = false;
  let search = '';
  let containerEl;
  let searchEl;
  let listEl;

  $: selectedOption = options.find(o => String(o.value) === String(value));
  $: filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  async function toggle() {
    if (disabled || loading) return;
    open = !open;
    if (open) {
      await tick();
      searchEl?.focus();
    } else {
      search = '';
    }
  }

  function select(opt) {
    value = opt.value;
    open = false;
    search = '';
    dispatch('change', opt.value);
  }

  function clear(e) {
    e.stopPropagation();
    value = '';
    open = false;
    search = '';
    dispatch('change', '');
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') { open = false; search = ''; }
  }

  function handleOutsideClick(e) {
    if (containerEl && !containerEl.contains(e.target)) {
      open = false;
      search = '';
    }
  }

  onMount(() => document.addEventListener('mousedown', handleOutsideClick));
  onDestroy(() => document.removeEventListener('mousedown', handleOutsideClick));
</script>

<div class="relative" bind:this={containerEl}>
  <!-- Trigger button -->
  <button
    type="button"
    on:click={toggle}
    on:keydown={handleKeydown}
    disabled={disabled}
    class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 pt-2 pb-2 text-left transition-colors
      {disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}
      {open ? 'border-blue-400 ring-1 ring-blue-200' : ''}"
  >
    <span class="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</span>
    <div class="flex items-center justify-between gap-2 min-h-[1.25rem]">
      <span class="text-sm truncate {selectedOption ? 'text-gray-700' : 'text-gray-400'}">
        {selectedOption ? selectedOption.label : placeholder}
      </span>
      <div class="flex items-center gap-1 shrink-0">
        {#if loading}
          <div class="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
        {:else}
          {#if selectedOption}
            <span
              role="button"
              tabindex="0"
              on:click={clear}
              on:keydown={(e) => e.key === 'Enter' && clear(e)}
              class="text-gray-400 hover:text-gray-600 cursor-pointer leading-none"
              title="Hapus pilihan"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </span>
          {/if}
          <svg class="w-4 h-4 text-gray-400 transition-transform duration-150 {open ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        {/if}
      </div>
    </div>
  </button>

  <!-- Dropdown panel -->
  {#if open}
    <div
      class="absolute z-[60] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
      on:keydown={handleKeydown}
    >
      <!-- Search -->
      <div class="p-2 border-b border-gray-100">
        <div class="relative">
          <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          </svg>
          <input
            bind:this={searchEl}
            bind:value={search}
            type="text"
            placeholder="Cari..."
            class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
          />
        </div>
      </div>

      <!-- Options list -->
      <div bind:this={listEl} class="max-h-52 overflow-y-auto">
        {#if filtered.length === 0}
          <div class="px-3 py-4 text-sm text-gray-400 text-center">Tidak ada hasil</div>
        {:else}
          {#each filtered as opt (opt.value)}
            <button
              type="button"
              on:click={() => select(opt)}
              class="w-full px-3 py-2 text-sm text-left transition-colors
                {String(opt.value) === String(value)
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'}"
            >
              {opt.label}
            </button>
          {/each}
        {/if}
      </div>

      <!-- Create new option -->
      {#if createLabel}
        <div class="border-t border-gray-100">
          <button
            type="button"
            on:click={() => { open = false; search = ''; dispatch('create'); }}
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            {createLabel}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
