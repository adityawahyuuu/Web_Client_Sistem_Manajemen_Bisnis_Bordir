<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-routing';
  import TemplateEditor from '../components/template-editor/TemplateEditor.svelte';
  import { selectedCompany, currentCompanyId, hasCompanies, loadCompanies } from '../stores/company.js';
  import { loadTemplate, resetEditor } from '../stores/templateEditor.js';

  export let templateId = null;
  export let documentType = 'invoice';

  // Get templateId from URL if provided
  onMount(async () => {
    await loadCompanies();

    const urlParams = new URLSearchParams(window.location.search);
    const urlTemplateId = urlParams.get('templateId');
    if (urlTemplateId) {
      templateId = parseInt(urlTemplateId, 10);
    }

    const urlDocType = urlParams.get('type');
    if (urlDocType) {
      documentType = urlDocType;
    }

    // Load template if templateId is provided
    if (templateId && $currentCompanyId) {
      await loadTemplate($currentCompanyId, templateId);
    }

    return () => {
      resetEditor();
    };
  });
</script>

<svelte:head>
  <title>Template Editor - Sistem Manajemen Invoice</title>
</svelte:head>

{#if !$hasCompanies}
  <!-- No Company State -->
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center max-w-md">
      <div class="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Belum Ada Perusahaan</h2>
      <p class="text-gray-500 mb-6">
        Anda perlu membuat perusahaan terlebih dahulu sebelum dapat mengedit template dokumen.
      </p>
      <a
        href="/companies"
        use:link
        class="btn-primary inline-flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Buat Perusahaan
      </a>
    </div>
  </div>
{:else if !$selectedCompany}
  <!-- No Selected Company -->
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="text-gray-500 mt-4">Memuat data perusahaan...</p>
    </div>
  </div>
{:else}
  <!-- Template Editor -->
  <div class="template-editor-page -m-8">
    <TemplateEditor
      companyId={$currentCompanyId}
      {documentType}
      {templateId}
    />
  </div>
{/if}

<style>
  .template-editor-page {
    height: calc(100vh - 0px);
  }
</style>
