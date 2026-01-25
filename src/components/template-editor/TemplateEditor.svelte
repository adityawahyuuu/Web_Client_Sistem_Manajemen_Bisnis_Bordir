<script>
  import { onMount, onDestroy } from 'svelte';
  import { SvelteToast, toast } from '@zerodevx/svelte-toast';
  import TemplateRenderer from './TemplateRenderer.svelte';
  import TemplateSidebar from './TemplateSidebar.svelte';
  import TemplateToolbar from './TemplateToolbar.svelte';
  import TemplatePresetModal from './TemplatePresetModal.svelte';
  import {
    workingSchema,
    currentTemplate,
    editorMode,
    selectedSection,
    isDirty,
    isSaving,
    isPublishing,
    isLoading,
    templateStatus,
    canUndo,
    canRedo,
    validationResult,
    lastSaved,
    initializeEditor,
    resetEditor,
    enterEditMode,
    exitEditMode,
    undo,
    redo,
    saveNow,
    publishTemplate,
    validateTemplate,
    discardChanges,
    loadPresets,
    loadCompanyTemplates,
    loadTemplate,
    clonePreset,
    presets,
    companyTemplates,
    deleteTemplate
  } from '../../stores/templateEditor.js';
  import templateService from '../../services/template.service.js';
  import { getDefaultSchema } from '../../lib/schemaValidator.js';

  export let companyId = null;
  export let templateId = null;

  let showPresetModal = false;
  let previewMode = 'desktop'; // 'desktop' | 'print'

  // Keyboard shortcuts
  function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (e.shiftKey) {
        e.preventDefault();
        redo();
      } else {
        e.preventDefault();
        undo();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveNow();
    }
    if (e.key === 'Escape' && $editorMode === 'edit') {
      exitEditMode();
    }
  }

  onMount(async () => {
    document.addEventListener('keydown', handleKeydown);

    if (companyId) {
      // Load in parallel: company templates and presets
      await Promise.all([
        loadCompanyTemplates(companyId),
        loadPresets()
      ]);

      // If templateId provided, load it directly from API
      if (templateId) {
        await loadTemplate(companyId, templateId);
      }
    }
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
    resetEditor();
  });

  async function handleSelectPreset(preset) {
    showPresetModal = false;
    try {
      const result = await clonePreset(preset.id, {
        company_id: companyId,
        name: `${preset.name} - Custom`,
        description: preset.description || ''
      });
      if (result) {
        await loadCompanyTemplates(companyId);
        initializeEditor(result);
        enterEditMode();
      }
    } catch (err) {
      console.error('Failed to clone preset:', err);
    }
  }

  function handleSelectTemplate(template) {
    initializeEditor(template);
  }

  function handleNewTemplate() {
    showPresetModal = true;
  }

  async function handlePublish() {
    await publishTemplate();
  }

  async function handleValidate() {
    await validateTemplate();
  }

  function handleDiscard() {
    if (confirm('Yakin ingin membuang semua perubahan?')) {
      discardChanges();
    }
  }

  let deletingTemplateId = null;

  async function handleDeleteTemplate(e, template) {
    e.stopPropagation();
    if (!confirm(`Yakin ingin menghapus template "${template.name}"?`)) return;

    deletingTemplateId = template.id;
    try {
      await templateService.deleteTemplate(companyId, template.id);
      await loadCompanyTemplates(companyId);
    } catch (err) {
      console.error('Failed to delete template:', err);
    } finally {
      deletingTemplateId = null;
    }
  }

  function getStatusLabel(status) {
    const labels = {
      draft: 'Draft',
      published: 'Published',
      unsaved: 'Belum Disimpan',
      saving: 'Menyimpan...',
      none: '-'
    };
    return labels[status] || status;
  }

  function getStatusColor(status) {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      unsaved: 'bg-orange-100 text-orange-800',
      saving: 'bg-blue-100 text-blue-800',
      none: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }
</script>

<SvelteToast />

<div class="template-editor h-screen flex flex-col bg-gray-100">
  <!-- Header -->
  <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <h1 class="text-lg font-semibold text-gray-900">Template Editor</h1>
      {#if $currentTemplate}
        <span class="text-sm text-gray-500">{$currentTemplate.name}</span>
        <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor($templateStatus)}">
          {getStatusLabel($templateStatus)}
        </span>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if $lastSaved}
        <span class="text-xs text-gray-400">
          Terakhir disimpan: {new Date($lastSaved).toLocaleTimeString('id-ID')}
        </span>
      {/if}

      {#if $editorMode === 'edit'}
        <button
          class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
          on:click={undo}
          disabled={!$canUndo}
          title="Undo (Ctrl+Z)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
          on:click={redo}
          disabled={!$canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
        <div class="w-px h-6 bg-gray-200"></div>
      {/if}

      {#if !$currentTemplate}
        <button class="btn-primary" on:click={handleNewTemplate}>
          Pilih Template
        </button>
      {:else if $editorMode === 'view'}
        <button class="btn-secondary" on:click={enterEditMode}>
          Edit Template
        </button>
      {:else}
        <button
          class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
          on:click={handleDiscard}
          disabled={!$isDirty}
        >
          Buang Perubahan
        </button>
        <button
          class="btn-secondary"
          on:click={handleValidate}
          disabled={$isLoading}
        >
          Validasi
        </button>
        <button
          class="btn-primary"
          on:click={handlePublish}
          disabled={$isPublishing || !$isDirty}
        >
          {$isPublishing ? 'Publishing...' : 'Publish'}
        </button>
        <button
          class="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          on:click={exitEditMode}
        >
          Selesai
        </button>
      {/if}
    </div>
  </header>

  <!-- Main Content -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Template List (Left Panel) -->
    {#if !$currentTemplate}
      <div class="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h2 class="text-sm font-semibold text-gray-700 mb-3">Template Perusahaan</h2>
        {#if $companyTemplates.length > 0}
          <div class="space-y-2">
            {#each $companyTemplates as template}
              <div class="flex items-center gap-2">
                <button
                  class="flex-1 p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  on:click={() => handleSelectTemplate(template)}
                >
                  <div class="font-medium text-gray-900">{template.name}</div>
                  <div class="text-xs text-gray-500 mt-1">
                    Status: {template.status} | v{template.version || 1}
                  </div>
                </button>
                <button
                  class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  on:click={(e) => handleDeleteTemplate(e, template)}
                  disabled={deletingTemplateId === template.id}
                  title="Hapus template"
                >
                  {#if deletingTemplateId === template.id}
                    <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  {:else}
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-gray-500">Belum ada template.</p>
        {/if}

        <button
          class="w-full mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
          on:click={handleNewTemplate}
        >
          + Buat dari Preset
        </button>
      </div>
    {/if}

    <!-- Preview Area -->
    <div class="flex-1 p-4 overflow-auto bg-gray-200">
      {#if $workingSchema}
        <div class="flex justify-center mb-4">
          <div class="inline-flex rounded-lg bg-white p-1 shadow-sm">
            <button
              class="px-3 py-1 text-sm rounded {previewMode === 'desktop' ? 'bg-blue-500 text-white' : 'text-gray-600'}"
              on:click={() => previewMode = 'desktop'}
            >
              Desktop
            </button>
            <button
              class="px-3 py-1 text-sm rounded {previewMode === 'print' ? 'bg-blue-500 text-white' : 'text-gray-600'}"
              on:click={() => previewMode = 'print'}
            >
              Print (A4)
            </button>
          </div>
        </div>

        <div
          class="mx-auto bg-white shadow-lg transition-all duration-300"
          style="{previewMode === 'print' ? 'width: 210mm; min-height: 297mm;' : 'max-width: 900px;'}"
        >
          <TemplateRenderer
            schema={$workingSchema}
            editable={$editorMode === 'edit'}
            selectedSection={$selectedSection}
          />
        </div>
      {:else}
        <div class="flex items-center justify-center h-full">
          <div class="text-center text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Pilih template untuk memulai</p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Sidebar (Right Panel) -->
    {#if $editorMode === 'edit' && $workingSchema}
      <TemplateSidebar />
    {/if}
  </div>

  <!-- Validation Results -->
  {#if $validationResult && !$validationResult.valid}
    <div class="absolute bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-red-200 p-4">
      <div class="flex items-center gap-2 text-red-600 font-medium mb-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        Validasi Gagal
      </div>
      {#if $validationResult.errors?.length}
        <ul class="text-sm text-red-600 space-y-1">
          {#each $validationResult.errors as error}
            <li>- {error}</li>
          {/each}
        </ul>
      {/if}
      {#if $validationResult.warnings?.length}
        <ul class="text-sm text-yellow-600 space-y-1 mt-2">
          {#each $validationResult.warnings as warning}
            <li>- {warning}</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  <!-- Autosave Loading Indicator -->
  {#if $isSaving}
    <div class="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm font-medium">Menyimpan...</span>
    </div>
  {/if}
</div>

<!-- Preset Modal -->
<TemplatePresetModal
  bind:show={showPresetModal}
  presets={$presets}
  on:select={(e) => handleSelectPreset(e.detail)}
/>

<style>
  .template-editor {
    --toast-width: 320px;
  }
</style>
