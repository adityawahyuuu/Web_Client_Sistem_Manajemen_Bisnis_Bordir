<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import { whatsappLoading, checkWhatsAppNumber } from '../stores/whatsapp.js';
  import { error as showError } from '../stores/notifications.js';

  export let show = false;
  export let documentType = 'invoice'; // invoice, receipt, waybill
  export let documentNumber = '';
  export let customerPhones = []; // Array of phone numbers

  const dispatch = createEventDispatcher();

  let phoneNumbers = '';
  let message = '';
  let isChecking = false;
  let checkResults = {};
  let wasOpened = false;

  // Only set phone numbers when modal first opens
  $: if (show && !wasOpened) {
    wasOpened = true;
    if (customerPhones.length > 0) {
      phoneNumbers = customerPhones.join(', ');
    }
    checkResults = {};
  }

  // Reset when modal closes
  $: if (!show && wasOpened) {
    wasOpened = false;
  }

  $: documentLabel = {
    invoice: 'Invoice',
    receipt: 'Kwitansi',
    waybill: 'Surat Jalan'
  }[documentType] || 'Dokumen';

  $: defaultMessage = `Berikut ${documentLabel} ${documentNumber} dari kami. Terima kasih atas kerjasamanya.`;

  $: phoneList = phoneNumbers
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  async function checkNumbers() {
    if (phoneList.length === 0) return;
    isChecking = true;
    checkResults = {};

    try {
      for (const phone of phoneList) {
        try {
          const result = await checkWhatsAppNumber(phone);
          checkResults[phone] = result.registered;
        } catch (err) {
          checkResults[phone] = null;
        }
      }
      checkResults = checkResults; // Trigger reactivity
    } catch (err) {
      showError('Gagal memeriksa nomor WhatsApp: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      isChecking = false;
    }
  }

  function handleSend() {
    if (phoneList.length === 0) return;
    dispatch('send', {
      phoneNumbers: phoneList,
      message: message || defaultMessage
    });
    resetForm();
  }

  function handleClose() {
    show = false;
    resetForm();
  }

  function resetForm() {
    phoneNumbers = '';
    message = '';
    checkResults = {};
  }
</script>

<Modal bind:show title="Kirim via WhatsApp" size="md">
  <div class="space-y-4">
    <p class="text-gray-600">
      Kirim <strong>{documentNumber}</strong> via WhatsApp
    </p>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Nomor WhatsApp * <span class="text-gray-500 font-normal">(pisahkan dengan koma untuk broadcast)</span>
      </label>
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={phoneNumbers}
          placeholder="628xxxxxxxxxx, 628yyyyyyyyy"
          class="input-field flex-1"
        />
        <button
          type="button"
          on:click={checkNumbers}
          disabled={isChecking || phoneList.length === 0}
          class="btn-secondary text-sm"
        >
          {isChecking ? 'Cek...' : 'Cek'}
        </button>
      </div>

      {#if Object.keys(checkResults).length > 0}
        <div class="mt-2 space-y-1">
          {#each Object.entries(checkResults) as [phone, valid]}
            <div class="flex items-center gap-2 text-sm">
              <span class="w-3 h-3 rounded-full {valid === true ? 'bg-green-500' : valid === false ? 'bg-red-500' : 'bg-gray-300'}"></span>
              <span class="{valid === true ? 'text-green-600' : valid === false ? 'text-red-600' : 'text-gray-500'}">
                {phone} - {valid === true ? 'Terdaftar' : valid === false ? 'Tidak terdaftar' : 'Gagal cek'}
              </span>
            </div>
          {/each}
        </div>
      {/if}

      {#if phoneList.length > 1}
        <p class="text-blue-600 text-sm mt-1">
          Akan dikirim ke {phoneList.length} nomor
        </p>
      {/if}
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Pesan (opsional)</label>
      <textarea
        bind:value={message}
        placeholder={defaultMessage}
        class="input-field"
        rows="3"
      ></textarea>
    </div>

    <div class="flex justify-end gap-3 pt-4">
      <button type="button" class="btn-secondary" on:click={handleClose}>
        Batal
      </button>
      <button
        type="button"
        class="btn-success"
        on:click={handleSend}
        disabled={phoneList.length === 0 || $whatsappLoading}
      >
        {$whatsappLoading ? 'Mengirim...' : phoneList.length > 1 ? `Kirim ke ${phoneList.length} nomor` : 'Kirim'}
      </button>
    </div>
  </div>
</Modal>