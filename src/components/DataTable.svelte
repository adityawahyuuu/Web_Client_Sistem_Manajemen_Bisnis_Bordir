<script>
  import { writable } from 'svelte/store';
  import { createEventDispatcher, afterUpdate } from 'svelte';
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

  let tbodyEl;
  let sorting = [];

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

  function filterGlobal(row, columnId, filterValue) {
    if (!filterValue) return true;
    const val = row.getValue(columnId);
    const teks = Array.isArray(val) ? val.join(' ') : String(val ?? '');
    return teks.toLowerCase().includes(String(filterValue).toLowerCase());
  }

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

  $: rows = $table.getRowModel().rows;
  $: filteredCount = $table.getFilteredRowModel().rows.length;
  $: pageIdx = $table.getState().pagination.pageIndex;
  $: pageFrom = filteredCount === 0 ? 0 : pageIdx * pageSize + 1;
  $: pageTo = Math.min((pageIdx + 1) * pageSize, filteredCount);
  $: pageInfoText = filteredCount === 0
    ? '0 data'
    : `${pageFrom}–${pageTo} dari ${filteredCount}`;

  $: allChecked = rows.length > 0 && rows.every(r => selectedIds.includes(r.original.id));
  $: someChecked = !allChecked && rows.some(r => selectedIds.includes(r.original.id));

  function setIndeterminate(node, value) {
    node.indeterminate = value;
    return { update(v) { node.indeterminate = v; } };
  }

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

  // Inject data-label on each <td> for the mobile stacked card layout.
  // td[0] = checkbox (skipped), td[1..n] = data columns.
  afterUpdate(() => {
    if (!tbodyEl) return;
    tbodyEl.querySelectorAll('tr').forEach(tr => {
      tr.querySelectorAll('td').forEach((td, i) => {
        if (i === 0) return;
        const col = columns[i - 1];
        if (col) td.dataset.label = col.label;
      });
    });
  });
</script>

<!-- ─── Tabel utama ──────────────────────────────────────────────── -->
<div class="dt-wrap bg-white rounded-lg border border-gray-200 overflow-hidden">
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50">
            <th class="w-10 px-4 py-3 text-left">
              <input
                type="checkbox"
                use:setIndeterminate={someChecked}
                use:syncChecked={allChecked}
                on:change={toggleAll}
                class="w-4 h-4 rounded border-gray-300 accent-blue-600"
              />
            </th>
            {#each $table.getHeaderGroups()[0]?.headers ?? [] as header}
              {@const col = columns.find(c => c.key === header.id)}
              {#if col}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide
                    {col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-700' : ''}"
                  on:click={col.sortable !== false ? header.column.getToggleSortingHandler() : undefined}
                >
                  <span class="flex items-center gap-1">
                    {col.label}
                    {#if col.sortable !== false}
                      <span class="text-gray-300">
                        {#if header.column.getIsSorted() === 'asc'}
                          <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>
                          </svg>
                        {:else if header.column.getIsSorted() === 'desc'}
                          <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                          </svg>
                        {:else}
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
                          </svg>
                        {/if}
                      </span>
                    {/if}
                  </span>
                </th>
              {/if}
            {/each}
          </tr>
        </thead>
        <tbody bind:this={tbodyEl} class="divide-y divide-gray-100">
          {#if rows.length === 0}
            <tr>
              <td colspan={columns.length + 1} class="px-4 py-16 text-center text-gray-400 text-sm">
                {emptyText}
              </td>
            </tr>
          {:else}
            {#each rows as row (row.id)}
              <tr class="hover:bg-gray-50 transition-colors
                {selectedIds.includes(row.original.id) ? 'bg-blue-50' : ''}
                {getRowClass(row.original)}">
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    use:syncChecked={selectedIds.includes(row.original.id)}
                    on:change={() => toggleRow(row.original.id)}
                    class="w-4 h-4 rounded border-gray-300 accent-blue-600"
                  />
                </td>
                <slot name="row" {row} />
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- ─── Paginasi ─────────────────────────────────────────────────── -->
<div class="flex items-center justify-between gap-2 mt-4 flex-wrap">
  <!-- Kiri: page size -->
  <div class="flex items-center gap-2">
    <select
      value={currentPageSize}
      on:change={onPageSizeChange}
      class="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
    >
      {#each pageSizeOptions as opt}
        <option value={opt}>{opt} / hal</option>
      {/each}
    </select>
    <span class="text-sm text-gray-400">{pageInfoText}</span>
  </div>

  <!-- Kanan: navigasi halaman -->
  <div class="flex items-center gap-1">
    <button
      on:click={() => $table.setPageIndex(0)}
      disabled={!$table.getCanPreviousPage()}
      class="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      title="Halaman pertama"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7M19 19l-7-7 7-7"/>
      </svg>
    </button>
    <button
      on:click={() => $table.previousPage()}
      disabled={!$table.getCanPreviousPage()}
      class="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      title="Halaman sebelumnya"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
      </svg>
    </button>

    <!-- Page number indicator -->
    <span class="px-3 py-1.5 text-sm text-gray-600 font-medium">
      {pageIdx + 1} / {$table.getPageCount() || 1}
    </span>

    <button
      on:click={() => $table.nextPage()}
      disabled={!$table.getCanNextPage()}
      class="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      title="Halaman berikutnya"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
    <button
      on:click={() => $table.setPageIndex($table.getPageCount() - 1)}
      disabled={!$table.getCanNextPage()}
      class="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      title="Halaman terakhir"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
      </svg>
    </button>
  </div>
</div>

<style>
  /* ── Mobile stacked-card layout ─────────────────────────────────
     Below md (768px), each table row becomes a card.
     - td[1]           = checkbox → absolute top-right of card
     - td:nth-child(2) = primary field → card header, no label prefix
     - td:nth-child(n+3) = data fields → CSS grid: label | value
       grid-template-columns: auto 1fr  guarantees the value column
       never exceeds the card boundary, even for long text.
  ─────────────────────────────────────────────────────────────── */
  @media (max-width: 767px) {
    /* Kill horizontal scroll on mobile; cards are full-width */
    .dt-wrap :global(.overflow-x-auto) {
      overflow-x: visible;
    }

    .dt-wrap :global(table) {
      display: block;
      min-width: unset;
      width: 100%;
    }
    .dt-wrap :global(thead) {
      display: none;
    }
    .dt-wrap :global(tbody) {
      display: block;
      padding: 0.625rem;
      background: #f3f4f6;
    }

    /* Each row = card */
    .dt-wrap :global(tbody tr) {
      display: block;
      position: relative;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 0.625rem;
      margin-bottom: 0.5rem;
      /* Hard overflow guard — nothing escapes the card */
      overflow: hidden;
      max-width: 100%;
      transition: box-shadow 0.15s;
    }
    .dt-wrap :global(tbody tr:last-child) {
      margin-bottom: 0;
    }
    .dt-wrap :global(tbody tr:hover) {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
    }
    .dt-wrap :global(tbody tr.bg-blue-50) {
      border-color: #93c5fd;
      background: #eff6ff;
    }

    /* Checkbox cell → absolute top-right, out of normal flow */
    .dt-wrap :global(tbody td:first-child) {
      position: absolute;
      top: 0.8rem;
      right: 0.75rem;
      padding: 0;
      border: none;
      background: transparent;
    }

    /* ── Primary field (first data col) → card header ─────────── */
    .dt-wrap :global(tbody td:nth-child(2)) {
      display: block;
      /* right padding reserves space for the absolute checkbox */
      padding: 0.75rem 2.75rem 0.6rem 0.875rem;
      border-bottom: 1px solid #f0f0f0;
      /* prevent long names from overflowing */
      overflow: hidden;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .dt-wrap :global(tbody td:nth-child(2)::before) {
      display: none;
    }

    /* ── Data fields → CSS Grid (label | value) ─────────────────
       Replaces flex+space-between which had no width guard on the
       value side. With grid-template-columns: auto 1fr:
         col 1 (auto) = label  →  takes only its content width
         col 2 (1fr)  = value  →  bounded to remaining card space
       Text nodes, spans, divs and buttons in col 2 all stay inside.
    ─────────────────────────────────────────────────────────────── */
    .dt-wrap :global(tbody td:nth-child(n+3)) {
      display: grid;
      grid-template-columns: auto 1fr;
      column-gap: 0.625rem;
      align-items: baseline;
      padding: 0.45rem 0.875rem;
      font-size: 0.8125rem;
      border-bottom: 1px solid #f5f5f5;
      overflow: hidden;
    }
    .dt-wrap :global(tbody td:last-child) {
      border-bottom: none;
      padding-bottom: 0.7rem;
    }

    /* Label (::before = grid item in col 1) */
    .dt-wrap :global(tbody td:nth-child(n+3)::before) {
      content: attr(data-label);
      color: #9ca3af;
      font-size: 0.675rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      /* align with first line of multi-line values */
      align-self: start;
      padding-top: 0.1rem;
    }

    /* Value (col 2): all direct-child elements stay in bounds */
    .dt-wrap :global(tbody td:nth-child(n+3) > *) {
      min-width: 0;
      max-width: 100%;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    /* Inline-only values (text nodes) inherit word-break from td */
    .dt-wrap :global(tbody td:nth-child(n+3)) {
      word-break: break-word;
      overflow-wrap: break-word;
    }

    /* Badge / pill elements: don't stretch, stay compact */
    .dt-wrap :global(tbody td:nth-child(n+3) > span) {
      display: inline-flex;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Empty-state row: override card styles, show centred */
    .dt-wrap :global(tbody tr td[colspan]) {
      position: static;
      display: block;
      text-align: center;
      padding: 3rem 1rem;
      border: none;
      word-break: normal;
    }
    .dt-wrap :global(tbody tr td[colspan]::before) {
      display: none;
    }
  }
</style>
