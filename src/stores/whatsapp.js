import { writable } from 'svelte/store';
import whatsappService from '../services/whatsapp.service.js';

export const whatsappStatus = writable({
  status: 'disconnected',
  qrCode: null,
  pairingCode: null,
  phoneNumber: null
});
export const whatsappLoading = writable(false);

// For mobile: pass phoneNumber to get pairing code directly
export async function initializeWhatsApp(phoneNumber = null) {
  whatsappLoading.set(true);
  try {
    const result = await whatsappService.initialize(phoneNumber);
    whatsappStatus.set({
      status: result.status || 'connecting',
      qrCode: result.qrCode || null,
      pairingCode: result.pairingCode || null,
      phoneNumber: result.phoneNumber || null
    });
    return result;
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    throw error;
  } finally {
    whatsappLoading.set(false);
  }
}

export async function getWhatsAppStatus() {
  try {
    const result = await whatsappService.getStatus();
    whatsappStatus.set({
      status: result.status || 'disconnected',
      qrCode: result.qrCode || null,
      pairingCode: result.pairingCode || null,
      phoneNumber: result.phoneNumber || null
    });
    return result;
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    return { status: 'disconnected' };
  }
}

export async function logoutWhatsApp() {
  whatsappLoading.set(true);
  try {
    await whatsappService.logout();
    whatsappStatus.set({
      status: 'disconnected',
      qrCode: null,
      pairingCode: null,
      phoneNumber: null
    });
  } catch (error) {
    console.error('Error logging out WhatsApp:', error);
    throw error;
  } finally {
    whatsappLoading.set(false);
  }
}

export async function clearWhatsAppSession() {
  whatsappLoading.set(true);
  try {
    const result = await whatsappService.clearSession();
    whatsappStatus.set({
      status: 'disconnected',
      qrCode: null,
      pairingCode: null,
      phoneNumber: null
    });
    return result;
  } catch (error) {
    console.error('Error clearing WhatsApp session:', error);
    throw error;
  } finally {
    whatsappLoading.set(false);
  }
}

export async function sendInvoiceViaWhatsApp(invoiceId, phoneNumber = null, message = null) {
  whatsappLoading.set(true);
  try {
    const result = await whatsappService.sendInvoice(invoiceId, phoneNumber, message);
    return result;
  } catch (error) {
    console.error('Error sending invoice via WhatsApp:', error);
    throw error;
  } finally {
    whatsappLoading.set(false);
  }
}

// Batch send invoice to multiple numbers
export async function sendInvoiceToMultiple(invoiceId, phoneNumbers, message = null) {
  whatsappLoading.set(true);
  const results = { success: [], failed: [] };

  try {
    for (const phoneNumber of phoneNumbers) {
      try {
        await whatsappService.sendInvoice(invoiceId, phoneNumber, message);
        results.success.push(phoneNumber);
      } catch (error) {
        console.error(`Failed to send to ${phoneNumber}:`, error);
        results.failed.push({ phoneNumber, error: error.message });
      }
    }
    return results;
  } finally {
    whatsappLoading.set(false);
  }
}

export async function sendReceiptViaWhatsApp(receiptId, phoneNumber = null, message = null) {
  whatsappLoading.set(true);
  try {
    const result = await whatsappService.sendReceipt(receiptId, phoneNumber, message);
    return result;
  } catch (error) {
    console.error('Error sending receipt via WhatsApp:', error);
    throw error;
  } finally {
    whatsappLoading.set(false);
  }
}

// Batch send receipt to multiple numbers
export async function sendReceiptToMultiple(receiptId, phoneNumbers, message = null) {
  whatsappLoading.set(true);
  const results = { success: [], failed: [] };

  try {
    for (const phoneNumber of phoneNumbers) {
      try {
        await whatsappService.sendReceipt(receiptId, phoneNumber, message);
        results.success.push(phoneNumber);
      } catch (error) {
        console.error(`Failed to send to ${phoneNumber}:`, error);
        results.failed.push({ phoneNumber, error: error.message });
      }
    }
    return results;
  } finally {
    whatsappLoading.set(false);
  }
}

export async function sendWaybillViaWhatsApp(waybillId, phoneNumber = null, message = null) {
  whatsappLoading.set(true);
  try {
    const result = await whatsappService.sendWaybill(waybillId, phoneNumber, message);
    return result;
  } catch (error) {
    console.error('Error sending waybill via WhatsApp:', error);
    throw error;
  } finally {
    whatsappLoading.set(false);
  }
}

// Batch send waybill to multiple numbers
export async function sendWaybillToMultiple(waybillId, phoneNumbers, message = null) {
  whatsappLoading.set(true);
  const results = { success: [], failed: [] };

  try {
    for (const phoneNumber of phoneNumbers) {
      try {
        await whatsappService.sendWaybill(waybillId, phoneNumber, message);
        results.success.push(phoneNumber);
      } catch (error) {
        console.error(`Failed to send to ${phoneNumber}:`, error);
        results.failed.push({ phoneNumber, error: error.message });
      }
    }
    return results;
  } finally {
    whatsappLoading.set(false);
  }
}

export async function checkWhatsAppNumber(phoneNumber) {
  try {
    const result = await whatsappService.checkNumber(phoneNumber);
    return result;
  } catch (error) {
    console.error('Error checking WhatsApp number:', error);
    return { registered: false };
  }
}