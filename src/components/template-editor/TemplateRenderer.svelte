<script>
  import { createEventDispatcher } from 'svelte';
  import SectionWrapper from './SectionWrapper.svelte';
  import HeaderSection from './sections/HeaderSection.svelte';
  import DocumentInfoSection from './sections/DocumentInfoSection.svelte';
  import CustomerInfoSection from './sections/CustomerInfoSection.svelte';
  import TableSection from './sections/TableSection.svelte';
  import SummarySection from './sections/SummarySection.svelte';
  import NotesSection from './sections/NotesSection.svelte';
  import TermsSection from './sections/TermsSection.svelte';
  import BankInfoSection from './sections/BankInfoSection.svelte';
  import SignatureSection from './sections/SignatureSection.svelte';
  import FooterSection from './sections/FooterSection.svelte';

  export let schema = {};
  export let editable = false;
  export let selectedSection = null;
  export let sampleData = null;

  const dispatch = createEventDispatcher();

  // Sample data for preview
  const defaultSampleData = {
    company: {
      name: 'PT Bordir Sejahtera',
      address: 'Jl. Industri No. 123, Surabaya',
      phone: '(031) 123-4567',
      email: 'info@bordirsejahtera.com',
      website: 'www.bordirsejahtera.com',
      logo: null
    },
    document: {
      invoice_number: 'INV-2025-0001',
      date: '15/01/2025',
      due_date: '29/01/2025',
      status: 'Pending'
    },
    customer: {
      name: 'CV Maju Terus',
      address: 'Jl. Raya No. 456, Jakarta',
      phone: '(021) 987-6543',
      email: 'order@majuterus.com'
    },
    items: [
      { no: 1, description: 'Bordir Logo Perusahaan (5x5cm)', quantity: 100, unit: 'pcs', price: 15000, total: 1500000 },
      { no: 2, description: 'Bordir Nama Karyawan', quantity: 100, unit: 'pcs', price: 8000, total: 800000 },
      { no: 3, description: 'Bordir Badge Divisi', quantity: 50, unit: 'pcs', price: 12000, total: 600000 }
    ],
    summary: {
      subtotal: 2900000,
      discount: 290000,
      tax: 287100,
      total: 2897100
    }
  };

  $: data = sampleData || defaultSampleData;
  $: styles = schema.styles || {};

  function handleSectionClick(sectionId) {
    dispatch('sectionClick', sectionId);
  }
</script>

<div
  class="template-renderer p-8"
  style="
    font-family: {styles.fontFamily || 'Inter, sans-serif'};
    font-size: {typeof styles.fontSize === 'number' ? styles.fontSize + 'px' : (styles.fontSize || '12px')};
    --primary-color: {styles.primaryColor || '#2563eb'};
    --secondary-color: {styles.secondaryColor || '#64748b'};
  "
>
  <!-- Header -->
  {#if schema.header?.enabled !== false}
    <SectionWrapper
      sectionId="header"
      {editable}
      selected={selectedSection === 'header'}
      on:click={() => handleSectionClick('header')}
    >
      <HeaderSection
        config={schema.header}
        company={data.company}
        {styles}
      />
    </SectionWrapper>
  {/if}

  <!-- Document Info -->
  {#if schema.documentInfo?.enabled !== false}
    <SectionWrapper
      sectionId="documentInfo"
      {editable}
      selected={selectedSection === 'documentInfo'}
      on:click={() => handleSectionClick('documentInfo')}
    >
      <DocumentInfoSection
        config={schema.documentInfo}
        document={data.document}
      />
    </SectionWrapper>
  {/if}

  <!-- Customer Info -->
  {#if schema.customerInfo?.enabled !== false}
    <SectionWrapper
      sectionId="customerInfo"
      {editable}
      selected={selectedSection === 'customerInfo'}
      on:click={() => handleSectionClick('customerInfo')}
    >
      <CustomerInfoSection
        config={schema.customerInfo}
        customer={data.customer}
      />
    </SectionWrapper>
  {/if}

  <!-- Table -->
  {#if schema.table?.enabled !== false}
    <SectionWrapper
      sectionId="table"
      {editable}
      selected={selectedSection === 'table'}
      on:click={() => handleSectionClick('table')}
    >
      <TableSection
        config={schema.table}
        items={data.items}
        {styles}
      />
    </SectionWrapper>
  {/if}

  <!-- Summary -->
  {#if schema.summary?.enabled !== false}
    <SectionWrapper
      sectionId="summary"
      {editable}
      selected={selectedSection === 'summary'}
      on:click={() => handleSectionClick('summary')}
    >
      <SummarySection
        config={schema.summary}
        summary={data.summary}
        {styles}
      />
    </SectionWrapper>
  {/if}

  <!-- Notes -->
  {#if schema.notes?.enabled !== false}
    <SectionWrapper
      sectionId="notes"
      {editable}
      selected={selectedSection === 'notes'}
      on:click={() => handleSectionClick('notes')}
    >
      <NotesSection config={schema.notes} />
    </SectionWrapper>
  {/if}

  <!-- Terms -->
  {#if schema.terms?.enabled !== false}
    <SectionWrapper
      sectionId="terms"
      {editable}
      selected={selectedSection === 'terms'}
      on:click={() => handleSectionClick('terms')}
    >
      <TermsSection config={schema.terms} />
    </SectionWrapper>
  {/if}

  <!-- Bank Info -->
  {#if schema.bankInfo?.enabled !== false}
    <SectionWrapper
      sectionId="bankInfo"
      {editable}
      selected={selectedSection === 'bankInfo'}
      on:click={() => handleSectionClick('bankInfo')}
    >
      <BankInfoSection config={schema.bankInfo} />
    </SectionWrapper>
  {/if}

  <!-- Signature -->
  {#if schema.signature?.enabled !== false}
    <SectionWrapper
      sectionId="signature"
      {editable}
      selected={selectedSection === 'signature'}
      on:click={() => handleSectionClick('signature')}
    >
      <SignatureSection config={schema.signature} />
    </SectionWrapper>
  {/if}

  <!-- Footer -->
  {#if schema.footer?.enabled !== false}
    <SectionWrapper
      sectionId="footer"
      {editable}
      selected={selectedSection === 'footer'}
      on:click={() => handleSectionClick('footer')}
    >
      <FooterSection config={schema.footer} />
    </SectionWrapper>
  {/if}
</div>

<style>
  .template-renderer {
    min-height: 100%;
    background: white;
  }

  .template-renderer :global(.primary-text) {
    color: var(--primary-color);
  }

  .template-renderer :global(.secondary-text) {
    color: var(--secondary-color);
  }

  .template-renderer :global(.primary-bg) {
    background-color: var(--primary-color);
  }

  .template-renderer :global(.primary-border) {
    border-color: var(--primary-color);
  }
</style>
