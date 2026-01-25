<script>
  export let config = {};
  export let company = {};
  // eslint-disable-next-line no-unused-vars
  export let styles = {}; // Reserved for future styling options

  $: logo = config?.logo || {};
  $: companyInfo = config?.companyInfo || {};
  $: title = config?.title || {};
  $: layout = config?.layout || 'split';
</script>

<div class="header-section mb-6" class:split={layout === 'split'} class:center={layout === 'center'}>
  {#if layout === 'split'}
    <div class="flex justify-between items-start">
      <!-- Left: Logo -->
      <div class="flex-shrink-0">
        {#if logo.enabled !== false}
          <div
            class="logo-placeholder bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-400"
            style="width: {logo.maxWidth || 150}px; height: {logo.maxHeight || 60}px;"
          >
            {#if company.logo}
              <img src={company.logo} alt="Logo" class="max-w-full max-h-full object-contain" />
            {:else}
              <span class="text-xs">Logo</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Right: Company Info & Title -->
      <div class="text-right">
        {#if title.enabled !== false}
          <h1
            class="primary-text font-bold mb-2"
            style="font-size: {title.fontSize || '24px'}; font-weight: {title.fontWeight || 'bold'};"
          >
            {title.text || 'INVOICE'}
          </h1>
        {/if}

        {#if companyInfo.enabled !== false}
          <div class="text-sm text-gray-600 space-y-0.5">
            {#if companyInfo.showName !== false}
              <div class="font-semibold text-gray-900">{company.name || 'Nama Perusahaan'}</div>
            {/if}
            {#if companyInfo.showAddress !== false}
              <div>{company.address || 'Alamat Perusahaan'}</div>
            {/if}
            {#if companyInfo.showPhone !== false}
              <div>Tel: {company.phone || '-'}</div>
            {/if}
            {#if companyInfo.showEmail !== false}
              <div>{company.email || '-'}</div>
            {/if}
            {#if companyInfo.showWebsite}
              <div>{company.website || '-'}</div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {:else if layout === 'center'}
    <div class="text-center">
      {#if logo.enabled !== false}
        <div class="flex justify-center mb-3">
          <div
            class="logo-placeholder bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-400"
            style="width: {logo.maxWidth || 150}px; height: {logo.maxHeight || 60}px;"
          >
            {#if company.logo}
              <img src={company.logo} alt="Logo" class="max-w-full max-h-full object-contain" />
            {:else}
              <span class="text-xs">Logo</span>
            {/if}
          </div>
        </div>
      {/if}

      {#if title.enabled !== false}
        <h1
          class="primary-text font-bold mb-2"
          style="font-size: {title.fontSize || '24px'}; font-weight: {title.fontWeight || 'bold'};"
        >
          {title.text || 'INVOICE'}
        </h1>
      {/if}

      {#if companyInfo.enabled !== false}
        <div class="text-sm text-gray-600 space-y-0.5">
          {#if companyInfo.showName !== false}
            <div class="font-semibold text-gray-900">{company.name || 'Nama Perusahaan'}</div>
          {/if}
          {#if companyInfo.showAddress !== false}
            <div>{company.address || 'Alamat Perusahaan'}</div>
          {/if}
          {#if companyInfo.showPhone !== false && companyInfo.showEmail !== false}
            <div>Tel: {company.phone || '-'} | {company.email || '-'}</div>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <!-- Left aligned layout -->
    <div>
      <div class="flex items-center gap-4 mb-2">
        {#if logo.enabled !== false}
          <div
            class="logo-placeholder bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-400 flex-shrink-0"
            style="width: {logo.maxWidth || 150}px; height: {logo.maxHeight || 60}px;"
          >
            {#if company.logo}
              <img src={company.logo} alt="Logo" class="max-w-full max-h-full object-contain" />
            {:else}
              <span class="text-xs">Logo</span>
            {/if}
          </div>
        {/if}

        {#if title.enabled !== false}
          <h1
            class="primary-text font-bold"
            style="font-size: {title.fontSize || '24px'}; font-weight: {title.fontWeight || 'bold'};"
          >
            {title.text || 'INVOICE'}
          </h1>
        {/if}
      </div>

      {#if companyInfo.enabled !== false}
        <div class="text-sm text-gray-600 space-y-0.5">
          {#if companyInfo.showName !== false}
            <div class="font-semibold text-gray-900">{company.name || 'Nama Perusahaan'}</div>
          {/if}
          {#if companyInfo.showAddress !== false}
            <div>{company.address || 'Alamat Perusahaan'}</div>
          {/if}
          {#if companyInfo.showPhone !== false}
            <span>Tel: {company.phone || '-'}</span>
          {/if}
          {#if companyInfo.showEmail !== false}
            <span class="ml-2">{company.email || '-'}</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .header-section {
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #2563eb);
  }
</style>
