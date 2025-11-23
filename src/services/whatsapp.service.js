import api from './api.js';

export const whatsappService = {
  // Initialize WhatsApp connection (admin only)
  async initialize() {
    const response = await api.post('/whatsapp/initialize');
    return response.data || response;
  },

  // Request pairing code for mobile (admin only)
  async requestPairingCode(phoneNumber) {
    const response = await api.post('/whatsapp/pairing-code', { phoneNumber });
    return response.data || response;
  },

  // Get connection status
  async getStatus() {
    try {
      const response = await api.get('/whatsapp/status');
      return response.data || response;
    } catch (error) {
      console.error('Error getting WhatsApp status:', error);
      return { status: 'disconnected' };
    }
  },

  // Send text message
  async sendMessage(phoneNumber, message) {
    const response = await api.post('/whatsapp/send', { phoneNumber, message });
    return response.data || response;
  },

  // Send document
  async sendDocument(phoneNumber, filePath, fileName, caption = '') {
    const response = await api.post('/whatsapp/send-document', {
      phoneNumber,
      filePath,
      fileName,
      caption
    });
    return response.data || response;
  },

  // Check if phone number is on WhatsApp
  async checkNumber(phoneNumber) {
    try {
      const response = await api.get(`/whatsapp/check/${phoneNumber}`);
      return response.data || response;
    } catch (error) {
      console.error('Error checking number:', error);
      return { registered: false };
    }
  },

  // Logout from WhatsApp (admin only)
  async logout() {
    const response = await api.post('/whatsapp/logout');
    return response.data || response;
  },

  // Send invoice via WhatsApp
  async sendInvoice(invoiceId, phoneNumber = null, message = null) {
    const body = {};
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (message) body.message = message;

    const response = await api.post(`/whatsapp/send-invoice/${invoiceId}`, body);
    return response.data || response;
  },

  // Send receipt via WhatsApp
  async sendReceipt(receiptId, phoneNumber = null, message = null) {
    const body = {};
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (message) body.message = message;

    const response = await api.post(`/whatsapp/send-receipt/${receiptId}`, body);
    return response.data || response;
  },

  // Send waybill via WhatsApp
  async sendWaybill(waybillId, phoneNumber = null, message = null) {
    const body = {};
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (message) body.message = message;

    const response = await api.post(`/whatsapp/send-waybill/${waybillId}`, body);
    return response.data || response;
  }
};

export default whatsappService;