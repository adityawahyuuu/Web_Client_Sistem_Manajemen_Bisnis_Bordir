<script>
  import { writable } from 'svelte/store';
  import { createEventDispatcher } from 'svelte';
  import {
    createSvelteTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
  } from '@tanstack/svelte-table';

  const dispatch = createEventDispatcher();

  /**
   * @typedef {{ key: string, label: string, sortable?: boolean }} KolomDef
   */

  /** @type {any[]} Sumber data tabel */
  export let data = [];
  /** @type {KolomDef[]} Definisi kolom */
  export let columns = [];
  /** Tampilkan spinner loading */
  export let loading = false;
  /** Kata kunci pencarian global — ikat dua arah: bind:globalFilter */
  export let globalFilter = '';
  /** ID baris terpilih — ikat dua arah: bind:selectedIds */
  export let selectedIds = [];
  /** Teks saat tabel kosong */
  export let emptyText = 'Tidak ada data';
  /** Jumlah baris per halaman (nilai awal) */
  export let pageSize = 10;

  const pageSizeOptions = [10, 25, 50, 100];
  let currentPageSize = pageSize;
  /** Fungsi opsional: mengembalikan kelas CSS tambahan berdasarkan data baris */
  export let getRowClass = (_original) => '';

  // State pengurutan internal
  let sorting = [];

  // Bangun definisi kolom TanStack dari spesifikasi sederhana
  function buildCols(cols) {
    return cols.map(col => ({
      id: col.key,
      accessorFn: row => {
        const val = row[col.key];
        if (Array.isArray(val)) return val.join(', ');
        return val ?? '';
      },
      header: col.label,
      enableSorting: col.sortable !== false,
      enableGlobalFilter: true,
    }));
  }

  // Filter global kustom: cocokkan semua tipe nilai terhadap kata kunci
  function filterGlobal(row, columnId, filterValue) {
    if (!filterValue) return true;
    const val = row.getValue(columnId);
    const teks = Array.isArray(val) ? val.join(' ') : String(val ?? '');
    return teks.toLowerCase().includes(String(filterValue).toLowerCase());
  }

  // Buat opsi tabel sebagai writable store agar reaktif
  const tableOptions = writable({
    data,
    columns: buildCols(columns),
    state: {
      sorting,
      globalFilter,
      pagination: { pageIndex: 0, pageSize },
    },
    onSortingChange: updater => {
      sorting = typeof updater === 'function' ? updater(sorting) : updater;
      tableOptions.update(o => ({ ...o, state: { ...o.state, sorting } }));
    },
    globalFilterFn: filterGlobal,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  const table = createSvelteTable(tableOptions);

  // Perbarui data & filter secara reaktif saat props berubah
  $: tableOptions.update(o => ({
    ...o,
    data,
    state: { ...o.state, globalFilter },
  }));

  function onPageSizeChange(e) {
    currentPageSize = Number(e.target.value);
    tableOptions.update(o => ({
      ...o,
      state: { ...o.state, pagination: { pageIndex: 0, pageSize: currentPageSize } },
    }));
  }

  // State turunan untuk render
  $: rows = $table.getRowModel().rows;
  $: filteredCount = $table.getFilteredRowModel().rows.length;
  $: pageIdx = $table.getState().pagination.pageIndex;
  $: pageFrom = filteredCount === 0 ? 0 : pageIdx * pageSize + 1;
  $: pageTo = Math.min((pageIdx + 1) * pageSize, filteredCount);
  $: pageInfoText = filteredCount === 0
    ? '0 data'
    : `${pageFrom} - ${pageTo} dari ${filteredCount} data`;

  // State seleksi checkbox
  $: allChecked = rows.length > 0 && rows.every(r => selectedIds.includes(r.original.id));
  $: someChecked = !allChecked && rows.some(r => selectedIds.includes(r.original.id));

  function setIndeterminate(node, value) {
    node.indeterminate = value;
    return { update(v) { node.indeterminate = v; } };
  }

  // Action untuk force-sync DOM property .checked (bypass Svelte attribute diffing)
  function syncChecked(node, value) {
    node.checked = value;
    return { update(v) { node.checked = v; } };
  }

  function toggleAll() {
    const pageIds = rows.map(r => r.original.id);
    if (allChecked || someChecked) {
      selectedIds = selectedIds.filter(id => !pageIds.includes(id));
    } else {
      selectedIds = [...new Set([...selectedIds, ...pageIds])];
    }
    dispatch('selectionChange', selectedIds);
  }

  function toggleRow(id) {
    if (selectedIds.includes(id)) {
      selectedIds = selectedIds.filter(i => i !== id);
    } else {
      selectedIds = [...selectedIds, id];
    }
    dispatch('selectionChange', selectedIds);
  }
</script>

<!-- Tabel utama -->
<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  {:else}
    <table class="min-w-full">
      <thead>
        <tr class="border-b border-gray-200 bg-white">
          <!-- Kolom checkbox pilih semua -->
          <th class="w-12 px-4 py-3 text-left">
            <input
              type="checkbox"
              use:setIndeterminate={someChecked}
              use:syncChecked={allChecked}
              on:change={toggleAll}
              class="w-4 h-4 rounded border-gray-300 accent-blue-600"
            />
          </th>
          <!-- Header kolom data dengan dukungan pengurutan -->
          {#each $table.getHeaderGroups()[0]?.headers ?? [] as header}
            {@const col = columns.find(c => c.key === header.id)}
            {#if col}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <th
                class="px-4 py-3 text-left text-sm font-medium text-gray-600 {col.sortable !== false ? 'cursor-pointer select-none' : ''}"
                on:click={col.sortable !== false ? header.column.getToggleSortingHandler() : undefined}
              >
                {col.label}
                {#if col.sortable !== false}
                  <span class="text-gray-400 ml-1">
                    {header.column.getIsSorted() === 'asc' ? '↑' : header.column.getIsSorted() === 'desc' ? '↓' : '↕'}
                  </span>
                {/if}
              </th>
            {/if}
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        {#if rows.length === 0}
          <tr>
            <td
              colspan={columns.length + 1}
              class="px-4 py-16 text-center text-gray-400 text-sm"
            >
              {emptyText}
            </td>
          </tr>
        {:else}
          {#each rows as row (row.id)}
            <tr
              class="hover:bg-gray-50 {selectedIds.includes(row.original.id) ? 'bg-blue-50' : ''} {getRowClass(row.original)}"
            >
              <!-- Checkbox per baris -->
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  use:syncChecked={selectedIds.includes(row.original.id)}
                  on:change={() => toggleRow(row.original.id)}
                  class="w-4 h-4 rounded border-gray-300 accent-blue-600"
                />
              </td>
              <!-- Konten sel dirender oleh tiap halaman melalui slot -->
              <slot name="row" {row} />
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  {/if}
</div>

<!-- Paginasi -->
<div class="flex items-center justify-between mt-4">
  <!-- Kiri: page size selector -->
  <div class="flex items-center gap-2">
    <span class="text-sm text-gray-500">Tampilkan</span>
    <select
      value={currentPageSize}
      on:change={onPageSizeChange}
      class="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
    >
      {#each pageSizeOptions as opt}
        <option value={opt}>{opt}</option>
      {/each}
    </select>
    <span class="text-sm text-gray-500">data per halaman</span>
  </div>

  <!-- Tengah: info -->
  <span class="text-sm text-gray-500">{pageInfoText}</span>

  <!-- Kanan: navigasi halaman -->
  <div class="flex gap-2">
    <button
      on:click={() => $table.previousPage()}
      disabled={!$table.getCanPreviousPage()}
      class="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      Sebelumnya
    </button>
    <button
      on:click={() => $table.nextPage()}
      disabled={!$table.getCanNextPage()}
      class="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      Berikutnya
    </button>
  </div>
</div>
