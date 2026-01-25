<script>
  import { onMount } from 'svelte';
  import Sortable from 'sortablejs';
  import {
    workingSchema,
    selectedSection,
    updateSchema,
    updateSectionProperty,
    toggleSectionVisibility,
    updateStyle,
    reorderColumns,
    clearSelection
  } from '../../stores/templateEditor.js';
  import ColorPicker from './ColorPicker.svelte';
  import RichTextEditor from './RichTextEditor.svelte';

  let activeTab = 'section'; // 'section' | 'styles' | 'all'

  // Section configuration
  const sectionConfig = {
    header: {
      label: 'Header',
      properties: [
        { key: 'layout', type: 'select', label: 'Layout', options: ['split', 'center', 'left', 'right'] },
        { key: 'logo.enabled', type: 'toggle', label: 'Tampilkan Logo' },
        { key: 'logo.maxWidth', type: 'number', label: 'Lebar Logo (px)', condition: 'logo.enabled' },
        { key: 'logo.maxHeight', type: 'number', label: 'Tinggi Logo (px)', condition: 'logo.enabled' },
        { key: 'companyInfo.enabled', type: 'toggle', label: 'Tampilkan Info Perusahaan' },
        { key: 'companyInfo.showName', type: 'toggle', label: 'Nama Perusahaan', nested: true },
        { key: 'companyInfo.showAddress', type: 'toggle', label: 'Alamat', nested: true },
        { key: 'companyInfo.showPhone', type: 'toggle', label: 'Telepon', nested: true },
        { key: 'companyInfo.showEmail', type: 'toggle', label: 'Email', nested: true },
        { key: 'companyInfo.showWebsite', type: 'toggle', label: 'Website', nested: true },
        { key: 'title.enabled', type: 'toggle', label: 'Tampilkan Judul' },
        { key: 'title.text', type: 'text', label: 'Teks Judul', condition: 'title.enabled' },
        { key: 'title.fontSize', type: 'text', label: 'Ukuran Font', condition: 'title.enabled' }
      ]
    },
    documentInfo: {
      label: 'Info Dokumen',
      properties: [
        { key: 'layout', type: 'select', label: 'Layout', options: ['horizontal', 'vertical', 'grid'] }
      ],
      hasFields: true,
      fieldsKey: 'fields'
    },
    customerInfo: {
      label: 'Info Pelanggan',
      properties: [
        { key: 'title', type: 'text', label: 'Judul Seksi' }
      ],
      hasFields: true,
      fieldsKey: 'fields'
    },
    table: {
      label: 'Tabel Item',
      properties: [
        { key: 'showHeader', type: 'toggle', label: 'Tampilkan Header' },
        { key: 'showBorders', type: 'toggle', label: 'Tampilkan Border' },
        { key: 'stripedRows', type: 'toggle', label: 'Baris Bergaris' }
      ],
      hasColumns: true
    },
    summary: {
      label: 'Ringkasan',
      properties: [
        { key: 'position', type: 'select', label: 'Posisi', options: ['left', 'right'] }
      ],
      hasFields: true,
      fieldsKey: 'fields'
    },
    notes: {
      label: 'Catatan',
      properties: [
        { key: 'title', type: 'text', label: 'Judul' },
        { key: 'content', type: 'richtext', label: 'Konten' }
      ]
    },
    terms: {
      label: 'Syarat & Ketentuan',
      properties: [
        { key: 'title', type: 'text', label: 'Judul' },
        { key: 'content', type: 'richtext', label: 'Konten' }
      ]
    },
    bankInfo: {
      label: 'Info Bank',
      properties: [
        { key: 'title', type: 'text', label: 'Judul' }
      ],
      hasAccounts: true
    },
    signature: {
      label: 'Tanda Tangan',
      properties: [
        { key: 'layout', type: 'select', label: 'Layout', options: ['single', 'double', 'triple'] }
      ],
      hasSignatureFields: true
    },
    footer: {
      label: 'Footer',
      properties: [
        { key: 'content', type: 'text', label: 'Teks Footer' },
        { key: 'showPageNumber', type: 'toggle', label: 'Tampilkan Nomor Halaman' },
        { key: 'pageNumberFormat', type: 'text', label: 'Format Nomor', condition: 'showPageNumber' }
      ]
    }
  };

  // All sections for visibility toggles
  const allSections = [
    { key: 'header', label: 'Header' },
    { key: 'documentInfo', label: 'Info Dokumen' },
    { key: 'customerInfo', label: 'Info Pelanggan' },
    { key: 'table', label: 'Tabel Item' },
    { key: 'summary', label: 'Ringkasan' },
    { key: 'notes', label: 'Catatan' },
    { key: 'terms', label: 'Syarat & Ketentuan' },
    { key: 'bankInfo', label: 'Info Bank' },
    { key: 'signature', label: 'Tanda Tangan' },
    { key: 'footer', label: 'Footer' }
  ];

  $: currentConfig = $selectedSection ? sectionConfig[$selectedSection] : null;
  $: sectionData = $selectedSection && $workingSchema ? $workingSchema[$selectedSection] || {} : {};

  function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  function setNestedValue(path, value) {
    if (!$selectedSection) return;

    updateSchema((draft) => {
      const parts = path.split('.');
      if (!draft[$selectedSection]) {
        draft[$selectedSection] = {};
      }
      let target = draft[$selectedSection];
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = value;
    });
  }

  function handlePropertyChange(prop, value) {
    setNestedValue(prop.key, value);
  }

  function handleFieldToggle(fieldIndex) {
    if (!$selectedSection) return;

    updateSchema((draft) => {
      const section = draft[$selectedSection];
      if (section?.fields?.[fieldIndex]) {
        section.fields[fieldIndex].enabled = !section.fields[fieldIndex].enabled;
      }
    });
  }

  function handleColumnToggle(colIndex) {
    if (!$selectedSection) return;

    updateSchema((draft) => {
      const section = draft[$selectedSection];
      if (section?.columns?.[colIndex]) {
        section.columns[colIndex].enabled = !section.columns[colIndex].enabled;
      }
    });
  }

  function handleSectionVisibilityToggle(sectionKey) {
    toggleSectionVisibility(sectionKey);
  }

  function handleStyleChange(property, value) {
    updateStyle(property, value);
  }

  function handleColumnReorder(oldIndex, newIndex) {
    reorderColumns($selectedSection, oldIndex, newIndex);
  }

  // Initialize sortable for columns
  let columnListEl;

  $: if (columnListEl && currentConfig?.hasColumns) {
    Sortable.create(columnListEl, {
      animation: 150,
      handle: '.drag-handle',
      onEnd: (evt) => {
        handleColumnReorder(evt.oldIndex, evt.newIndex);
      }
    });
  }

  function shouldShowProperty(prop) {
    if (!prop.condition) return true;
    return getNestedValue(sectionData, prop.condition);
  }
</script>

<aside class="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
  <!-- Tabs -->
  <div class="flex border-b border-gray-200">
    <button
      class="flex-1 px-4 py-2 text-sm font-medium {activeTab === 'section' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}"
      on:click={() => activeTab = 'section'}
    >
      Seksi
    </button>
    <button
      class="flex-1 px-4 py-2 text-sm font-medium {activeTab === 'styles' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}"
      on:click={() => activeTab = 'styles'}
    >
      Gaya
    </button>
    <button
      class="flex-1 px-4 py-2 text-sm font-medium {activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}"
      on:click={() => activeTab = 'all'}
    >
      Semua
    </button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if activeTab === 'section'}
      {#if currentConfig}
        <div class="mb-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-gray-900">{currentConfig.label}</h3>
            <button
              class="text-sm text-gray-400 hover:text-gray-600"
              on:click={clearSelection}
            >
              Tutup
            </button>
          </div>

          <!-- Visibility toggle -->
          <label class="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={sectionData.enabled !== false}
              on:change={() => setNestedValue('enabled', sectionData.enabled === false)}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm">Tampilkan seksi ini</span>
          </label>

          <!-- Properties -->
          <div class="space-y-4">
            {#each currentConfig.properties as prop}
              {#if shouldShowProperty(prop)}
                <div class:ml-4={prop.nested}>
                  <label class="block text-xs font-medium text-gray-500 mb-1">{prop.label}</label>

                  {#if prop.type === 'text'}
                    <input
                      type="text"
                      value={getNestedValue(sectionData, prop.key) || ''}
                      on:input={(e) => handlePropertyChange(prop, e.target.value)}
                      class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  {:else if prop.type === 'number'}
                    <input
                      type="number"
                      value={getNestedValue(sectionData, prop.key) || ''}
                      on:input={(e) => handlePropertyChange(prop, parseInt(e.target.value) || 0)}
                      class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  {:else if prop.type === 'select'}
                    <select
                      value={getNestedValue(sectionData, prop.key) || prop.options[0]}
                      on:change={(e) => handlePropertyChange(prop, e.target.value)}
                      class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {#each prop.options as opt}
                        <option value={opt}>{opt}</option>
                      {/each}
                    </select>
                  {:else if prop.type === 'toggle'}
                    <label class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={getNestedValue(sectionData, prop.key) !== false}
                        on:change={(e) => handlePropertyChange(prop, e.target.checked)}
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span class="text-sm text-gray-600">Aktif</span>
                    </label>
                  {:else if prop.type === 'richtext'}
                    <RichTextEditor
                      content={getNestedValue(sectionData, prop.key) || ''}
                      on:update={(e) => handlePropertyChange(prop, e.detail)}
                    />
                  {/if}
                </div>
              {/if}
            {/each}
          </div>

          <!-- Fields list (for documentInfo, customerInfo, summary) -->
          {#if currentConfig.hasFields && sectionData.fields}
            <div class="mt-4">
              <h4 class="text-xs font-medium text-gray-500 mb-2">Field yang ditampilkan</h4>
              <div class="space-y-1">
                {#each sectionData.fields as field, i}
                  <label class="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <input
                      type="checkbox"
                      checked={field.enabled !== false}
                      on:change={() => handleFieldToggle(i)}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{field.label}</span>
                  </label>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Columns list (for table) -->
          {#if currentConfig.hasColumns && sectionData.columns}
            <div class="mt-4">
              <h4 class="text-xs font-medium text-gray-500 mb-2">Kolom (drag untuk mengurutkan)</h4>
              <div class="space-y-1" bind:this={columnListEl}>
                {#each sectionData.columns as column, i}
                  <div class="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <span class="drag-handle cursor-move text-gray-400">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                      </svg>
                    </span>
                    <input
                      type="checkbox"
                      checked={column.enabled !== false}
                      on:change={() => handleColumnToggle(i)}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="flex-1">{column.label}</span>
                    <select
                      value={column.align || 'left'}
                      on:change={(e) => {
                        updateSchema((draft) => {
                          draft[$selectedSection].columns[i].align = e.target.value;
                        });
                      }}
                      class="text-xs border border-gray-200 rounded px-1 py-0.5"
                    >
                      <option value="left">Kiri</option>
                      <option value="center">Tengah</option>
                      <option value="right">Kanan</option>
                    </select>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Bank accounts (for bankInfo) -->
          {#if currentConfig.hasAccounts && sectionData.accounts}
            <div class="mt-4">
              <h4 class="text-xs font-medium text-gray-500 mb-2">Rekening Bank</h4>
              <div class="space-y-2">
                {#each sectionData.accounts as account, i}
                  <div class="p-2 bg-gray-50 rounded border border-gray-100">
                    <label class="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={account.enabled !== false}
                        on:change={() => {
                          updateSchema((draft) => {
                            draft[$selectedSection].accounts[i].enabled = !draft[$selectedSection].accounts[i].enabled;
                          });
                        }}
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span class="text-sm font-medium">Aktif</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Bank"
                      value={account.bankName || ''}
                      on:input={(e) => {
                        updateSchema((draft) => {
                          draft[$selectedSection].accounts[i].bankName = e.target.value;
                        });
                      }}
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded mb-1"
                    />
                    <input
                      type="text"
                      placeholder="No. Rekening"
                      value={account.accountNumber || ''}
                      on:input={(e) => {
                        updateSchema((draft) => {
                          draft[$selectedSection].accounts[i].accountNumber = e.target.value;
                        });
                      }}
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded mb-1"
                    />
                    <input
                      type="text"
                      placeholder="Nama Pemilik"
                      value={account.accountName || ''}
                      on:input={(e) => {
                        updateSchema((draft) => {
                          draft[$selectedSection].accounts[i].accountName = e.target.value;
                        });
                      }}
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                    />
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Signature fields -->
          {#if currentConfig.hasSignatureFields && sectionData.fields}
            <div class="mt-4">
              <h4 class="text-xs font-medium text-gray-500 mb-2">Field Tanda Tangan</h4>
              <div class="space-y-2">
                {#each sectionData.fields as field, i}
                  <div class="p-2 bg-gray-50 rounded border border-gray-100">
                    <label class="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={field.enabled !== false}
                        on:change={() => {
                          updateSchema((draft) => {
                            draft[$selectedSection].fields[i].enabled = !draft[$selectedSection].fields[i].enabled;
                          });
                        }}
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span class="text-sm font-medium">Aktif</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Label"
                      value={field.label || ''}
                      on:input={(e) => {
                        updateSchema((draft) => {
                          draft[$selectedSection].fields[i].label = e.target.value;
                        });
                      }}
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded mb-1"
                    />
                    <label class="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={field.showDate !== false}
                        on:change={() => {
                          updateSchema((draft) => {
                            draft[$selectedSection].fields[i].showDate = !draft[$selectedSection].fields[i].showDate;
                          });
                        }}
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Tampilkan tanggal
                    </label>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="text-center text-gray-500 py-8">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <p class="text-sm">Klik pada seksi di preview untuk mengeditnya</p>
        </div>
      {/if}
    {:else if activeTab === 'styles'}
      <!-- Global Styles -->
      <div class="space-y-4">
        <h3 class="font-semibold text-gray-900 mb-3">Gaya Global</h3>

        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Warna Utama</label>
          <ColorPicker
            value={$workingSchema?.styles?.primaryColor || '#2563eb'}
            on:change={(e) => handleStyleChange('primaryColor', e.detail)}
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Warna Sekunder</label>
          <ColorPicker
            value={$workingSchema?.styles?.secondaryColor || '#64748b'}
            on:change={(e) => handleStyleChange('secondaryColor', e.detail)}
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Font Family</label>
          <select
            value={$workingSchema?.styles?.fontFamily || 'Inter, sans-serif'}
            on:change={(e) => handleStyleChange('fontFamily', e.target.value)}
            class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Inter, sans-serif">Inter</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Helvetica, sans-serif">Helvetica</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Times New Roman, serif">Times New Roman</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Ukuran Font</label>
          <select
            value={$workingSchema?.styles?.fontSize || 12}
            on:change={(e) => handleStyleChange('fontSize', parseInt(e.target.value, 10))}
            class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={10}>10px</option>
            <option value={11}>11px</option>
            <option value={12}>12px</option>
            <option value={13}>13px</option>
            <option value={14}>14px</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Ukuran Kertas</label>
          <select
            value={$workingSchema?.styles?.pageSize || 'A4'}
            on:change={(e) => handleStyleChange('pageSize', e.target.value)}
            class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Orientasi</label>
          <select
            value={$workingSchema?.styles?.pageOrientation || 'portrait'}
            on:change={(e) => handleStyleChange('pageOrientation', e.target.value)}
            class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
      </div>
    {:else if activeTab === 'all'}
      <!-- All Sections Toggle -->
      <div class="space-y-2">
        <h3 class="font-semibold text-gray-900 mb-3">Visibilitas Seksi</h3>
        {#each allSections as section}
          <label class="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
            <span class="text-sm">{section.label}</span>
            <input
              type="checkbox"
              checked={$workingSchema?.[section.key]?.enabled !== false}
              on:change={() => handleSectionVisibilityToggle(section.key)}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        {/each}
      </div>
    {/if}
  </div>
</aside>
