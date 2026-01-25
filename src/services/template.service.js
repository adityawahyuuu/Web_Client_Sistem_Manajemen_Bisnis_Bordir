import api from './api.js';
import { error as errorNotify } from '../stores/notifications.js';

const templateService = {
  // =============================================================================
  // PRESET TEMPLATES (System Templates)
  // =============================================================================

  /**
   * Get available preset templates
   * GET /templates/presets?document_type=invoice|receipt|waybill
   * @param {string} documentType - e.g., 'invoice', 'waybill', 'receipt' (optional)
   */
  async getPresets(documentType = null) {
    try {
      const query = documentType ? `?document_type=${documentType}` : '';
      const response = await api.get(`/templates/presets${query}`);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat preset template');
      throw err;
    }
  },

  /**
   * Clone a preset template to company
   * POST /templates/presets/:id/clone
   * @param {number} presetId
   * @param {object} data - { company_id, name, description }
   */
  async clonePreset(presetId, data) {
    try {
      const response = await api.post(`/templates/presets/${presetId}/clone`, data);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal meng-clone template');
      throw err;
    }
  },

  // =============================================================================
  // COMPANY TEMPLATES
  // =============================================================================

  /**
   * Get company templates
   * GET /templates/:companyId?page=1&limit=10&document_type=invoice&status=draft|published&search=keyword
   * @param {number} companyId
   * @param {object} params - { page, limit, document_type, status, search }
   */
  async getCompanyTemplates(companyId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.document_type) queryParams.append('document_type', params.document_type);
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);

      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await api.get(`/templates/${companyId}${query}`);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat template perusahaan');
      throw err;
    }
  },

  /**
   * Create a new template
   * POST /templates/:companyId
   * @param {number} companyId
   * @param {object} data - { name, description, document_type, template_schema, is_default }
   */
  async createTemplate(companyId, data) {
    try {
      const response = await api.post(`/templates/${companyId}`, data);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal membuat template');
      throw err;
    }
  },

  /**
   * Get single template by ID
   * GET /templates/:companyId/:id
   * @param {number} companyId
   * @param {number} templateId
   */
  async getTemplate(companyId, templateId) {
    try {
      const response = await api.get(`/templates/${companyId}/${templateId}`);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat template');
      throw err;
    }
  },

  /**
   * Update template
   * PUT /templates/:companyId/:id
   * @param {number} companyId
   * @param {number} templateId
   * @param {object} data - { name, description, template_schema, is_default }
   */
  async updateTemplate(companyId, templateId, data) {
    try {
      const response = await api.put(`/templates/${companyId}/${templateId}`, data);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal mengupdate template');
      throw err;
    }
  },

  /**
   * Delete template (soft delete)
   * DELETE /templates/:companyId/:id
   * @param {number} companyId
   * @param {number} templateId
   */
  async deleteTemplate(companyId, templateId) {
    try {
      const response = await api.delete(`/templates/${companyId}/${templateId}`);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus template');
      throw err;
    }
  },

  /**
   * Autosave template changes (draft)
   * PATCH /templates/:companyId/:id/autosave
   * @param {number} companyId
   * @param {number} templateId
   * @param {object} templateSchema - partial schema to merge
   */
  async autosave(companyId, templateId, templateSchema) {
    if (!companyId || !templateId) {
      throw new Error('Company ID and Template ID are required for autosave');
    }

    try {
      const response = await api.request(`/templates/${companyId}/${templateId}/autosave`, {
        method: 'PATCH',
        body: { template_schema: templateSchema }
      });
      return response;
    } catch (err) {
      errorNotify(err.message || 'Autosave gagal');
      throw err;
    }
  },

  /**
   * Validate template before publish
   * POST /templates/:companyId/:id/validate
   * @param {number} companyId
   * @param {number} templateId
   */
  async validate(companyId, templateId) {
    try {
      const response = await api.post(`/templates/${companyId}/${templateId}/validate`, {});
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memvalidasi template');
      throw err;
    }
  },

  /**
   * Publish template (make it active)
   * POST /templates/:companyId/:id/publish
   * @param {number} companyId
   * @param {number} templateId
   */
  async publish(companyId, templateId) {
    try {
      const response = await api.post(`/templates/${companyId}/${templateId}/publish`, {});
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal mempublish template');
      throw err;
    }
  },

  /**
   * Set template as default
   * PUT /templates/:companyId/:id with is_default: true
   * @param {number} companyId
   * @param {number} templateId
   */
  async setDefault(companyId, templateId) {
    try {
      const response = await api.put(`/templates/${companyId}/${templateId}`, {
        is_default: true
      });
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal menetapkan template sebagai default');
      throw err;
    }
  },

  // =============================================================================
  // VERSION MANAGEMENT
  // =============================================================================

  /**
   * Get template version history
   * GET /templates/:companyId/:id/versions
   * @param {number} companyId
   * @param {number} templateId
   */
  async getVersions(companyId, templateId) {
    try {
      const response = await api.get(`/templates/${companyId}/${templateId}/versions`);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat versi template');
      throw err;
    }
  },

  /**
   * Revert template to a specific version
   * POST /templates/:companyId/:id/revert/:version
   * @param {number} companyId
   * @param {number} templateId
   * @param {number} version
   */
  async revertVersion(companyId, templateId, version) {
    try {
      const response = await api.post(`/templates/${companyId}/${templateId}/revert/${version}`, {});
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal mengembalikan versi template');
      throw err;
    }
  },

  /**
   * Clone an existing company template
   * POST /templates/:companyId/:id/clone
   * @param {number} companyId
   * @param {number} templateId
   * @param {object} data - { name, description }
   */
  async cloneTemplate(companyId, templateId, data) {
    try {
      const response = await api.post(`/templates/${companyId}/${templateId}/clone`, data);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal meng-clone template');
      throw err;
    }
  }
};

export default templateService;
