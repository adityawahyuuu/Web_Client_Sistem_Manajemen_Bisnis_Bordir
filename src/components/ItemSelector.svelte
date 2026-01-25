<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { items, loadItems, createItem, itemsLoading } from '../stores/items.js';
  import { selectedCompany } from '../stores/company.js';
  import debounce from 'lodash.debounce';

  export let value = null;
  export let placeholder = 'Pilih atau cari item...';
  export let disabled = false;
  export let allowCreate = true;
  export let customerId = null; // For customer-specific items

  const dispatch = createEventDispatcher();

  let isOpen = false;
  let searchTerm = '';
  let showCreateForm = false;
  let inputElement;
  let dropdownElement;

  // New item form
  let newItemForm = {
    name: '',
    unit: 'pcs',
    unit_price: 0
  };

  const unitOptions = [
    { value: 'pcs', label: 'Pcs' },
    { value: 'unit', label: 'Unit' },
    { value: 'box', label: 'Box' },
    { value: 'dozen', label: 'Lusin' },
    { value: 'kg', label: 'Kg' },
    { value: 'm', label: 'Meter' },
    { value: 'roll', label: 'Roll' },
    { value: 'pack', label: 'Pack' },
    { value: 'set', label: 'Set' }
  ];

  onMount(() => {
    if ($selectedCompany?.id && $items.length === 0) {
      loadItems();
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownElement && !dropdownElement.contains(event.target)) {
        isOpen = false;
        showCreateForm = false;
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });

  // Reload when company changes
  $: if ($selectedCompany?.id) {
    loadItems();
  }

  $: filteredItems = searchTerm
    ? $items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : $items;

  $: selectedItem = value ? $items.find(item => item.id === value) : null;

  $: displayValue = selectedItem ? selectedItem.name : '';

  const debouncedSearch = debounce((term) => {
    if (term.length >= 2) {
      loadItems(1, 100, term);
    } else if (term.length === 0) {
      loadItems();
    }
  }, 300);

  function handleInputFocus() {
    isOpen = true;
  }

  function handleInputChange(event) {
    searchTerm = event.target.value;
    debouncedSearch(searchTerm);
  }

  function selectItem(item) {
    value = item.id;
    searchTerm = '';
    isOpen = false;
    showCreateForm = false;
    dispatch('select', item);
  }

  function clearSelection() {
    value = null;
    searchTerm = '';
    dispatch('clear');
  }

  function openCreateForm() {
    showCreateForm = true;
    newItemForm = {
      name: searchTerm || '',
      unit: 'pcs',
      unit_price: 0
    };
  }

  async function handleCreateItem() {
    if (!newItemForm.name) return;

    try {
      const createdItem = await createItem({
        name: newItemForm.name,
        unit: newItemForm.unit,
        unit_price: parseFloat(newItemForm.unit_price) || 0
      });

      if (createdItem) {
        selectItem(createdItem);
      }
    } catch (err) {
      // Error handled by store
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }
</script>

<div class="relative" bind:this={dropdownElement}>
  <!-- Input Field -->
  <div class="relative">
    {#if selectedItem}
      <div class="flex items-center gap-2 input-field bg-gray-50">
        <span class="flex-1 truncate">{selectedItem.name}</span>
        <span class="text-xs text-gray-500">{formatCurrency(selectedItem.unit_price)}/{selectedItem.unit}</span>
        {#if !disabled}
          <button
            type="button"
            on:click|stopPropagation={clearSelection}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>
    {:else}
      <input
        type="text"
        bind:this={inputElement}
        value={searchTerm}
        on:input={handleInputChange}
        on:focus={handleInputFocus}
        {placeholder}
        {disabled}
        class="input-field pr-10"
      />
      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    {/if}
  </div>

  <!-- Dropdown -->
  {#if isOpen && !disabled}
    <div class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-hidden">
      {#if showCreateForm}
        <!-- Create New Item Form -->
        <div class="p-3 border-b border-gray-200">
          <h4 class="text-sm font-medium text-gray-900 mb-3">Tambah Item Baru</h4>
          <div class="space-y-2">
            <input
              type="text"
              bind:value={newItemForm.name}
              placeholder="Nama item"
              class="input-field text-sm"
            />
            <div class="grid grid-cols-2 gap-2">
              <select bind:value={newItemForm.unit} class="input-field text-sm">
                {#each unitOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
              <input
                type="number"
                bind:value={newItemForm.unit_price}
                placeholder="Harga"
                class="input-field text-sm"
                min="0"
              />
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                on:click={() => showCreateForm = false}
                class="flex-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                type="button"
                on:click={handleCreateItem}
                disabled={!newItemForm.name || $itemsLoading}
                class="flex-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      {:else}
        <!-- Items List -->
        <div class="max-h-56 overflow-y-auto">
          {#if $itemsLoading}
            <div class="px-4 py-3 text-center text-gray-500 text-sm">
              Memuat...
            </div>
          {:else if filteredItems.length === 0}
            <div class="px-4 py-3 text-center text-gray-500 text-sm">
              {searchTerm ? 'Tidak ada item yang cocok' : 'Belum ada item'}
            </div>
          {:else}
            {#each filteredItems as item}
              <button
                type="button"
                on:click={() => selectItem(item)}
                class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
              >
                <div>
                  <div class="text-sm font-medium text-gray-900">{item.name}</div>
                  {#if item.sku}
                    <div class="text-xs text-gray-500">SKU: {item.sku}</div>
                  {/if}
                </div>
                <div class="text-right">
                  <div class="text-sm text-gray-900">{formatCurrency(item.unit_price)}</div>
                  <div class="text-xs text-gray-500">per {item.unit}</div>
                </div>
              </button>
            {/each}
          {/if}
        </div>

        <!-- Add New Button -->
        {#if allowCreate}
          <div class="border-t border-gray-200">
            <button
              type="button"
              on:click={openCreateForm}
              class="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {searchTerm ? `Tambah "${searchTerm}" sebagai item baru` : 'Tambah item baru'}
            </button>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>
