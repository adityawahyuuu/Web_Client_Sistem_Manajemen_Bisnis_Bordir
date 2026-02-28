import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, verbose: true });

// Template schema definition
const templateSchemaDefinition = {
  type: 'object',
  properties: {
    styles: {
      type: 'object',
      properties: {
        primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        secondaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        fontFamily: { type: 'string' },
        fontSize: { type: 'string' },
        pageSize: { type: 'string', enum: ['A4', 'Letter', 'Legal'] },
        pageOrientation: { type: 'string', enum: ['portrait', 'landscape'] },
        margins: {
          type: 'object',
          properties: {
            top: { type: 'number' },
            right: { type: 'number' },
            bottom: { type: 'number' },
            left: { type: 'number' }
          }
        }
      }
    },
    header: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        layout: { type: 'string', enum: ['left', 'center', 'right', 'split'] },
        logo: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            position: { type: 'string', enum: ['left', 'center', 'right'] },
            maxWidth: { type: 'number' },
            maxHeight: { type: 'number' }
          }
        },
        companyInfo: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            showName: { type: 'boolean' },
            showAddress: { type: 'boolean' },
            showPhone: { type: 'boolean' },
            showEmail: { type: 'boolean' },
            showWebsite: { type: 'boolean' }
          }
        },
        title: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            text: { type: 'string' },
            fontSize: { type: 'string' },
            fontWeight: { type: 'string' }
          }
        },
        documentInfo: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            showTitle: { type: 'boolean' },
            titleText: { type: 'string' },
            fontSize: { type: 'string' },
            fontWeight: { type: 'string' },
            showNumber: { type: 'boolean' },
            showDate: { type: 'boolean' },
            showDueDate: { type: 'boolean' },
            showStatus: { type: 'boolean' }
          }
        }
      }
    },
    documentInfo: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        layout: { type: 'string', enum: ['horizontal', 'vertical', 'grid'] },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              enabled: { type: 'boolean' },
              format: { type: 'string' }
            },
            required: ['key', 'label']
          }
        }
      }
    },
    customerInfo: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        title: { type: 'string' },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              enabled: { type: 'boolean' }
            },
            required: ['key', 'label']
          }
        }
      }
    },
    table: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        showHeader: { type: 'boolean' },
        showBorders: { type: 'boolean' },
        stripedRows: { type: 'boolean' },
        columns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              enabled: { type: 'boolean' },
              width: { type: 'string' },
              align: { type: 'string', enum: ['left', 'center', 'right'] },
              format: { type: 'string' }
            },
            required: ['key', 'label']
          }
        }
      }
    },
    summary: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        position: { type: 'string', enum: ['left', 'right'] },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              enabled: { type: 'boolean' },
              format: { type: 'string' },
              highlight: { type: 'boolean' }
            },
            required: ['key', 'label']
          }
        }
      }
    },
    notes: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        title: { type: 'string' },
        content: { type: 'string' }
      }
    },
    terms: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        title: { type: 'string' },
        content: { type: 'string' }
      }
    },
    bankInfo: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        title: { type: 'string' },
        accounts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bankName: { type: 'string' },
              accountName: { type: 'string' },
              accountNumber: { type: 'string' },
              enabled: { type: 'boolean' }
            }
          }
        }
      }
    },
    signature: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        layout: { type: 'string', enum: ['single', 'double', 'triple'] },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              enabled: { type: 'boolean' },
              showDate: { type: 'boolean' },
              showLine: { type: 'boolean' }
            }
          }
        }
      }
    },
    footer: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        content: { type: 'string' },
        showPageNumber: { type: 'boolean' },
        pageNumberFormat: { type: 'string' }
      }
    }
  }
};

const validateSchema = ajv.compile(templateSchemaDefinition);

/**
 * Validate template schema
 * @param {object} schema
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTemplateSchema(schema) {
  const valid = validateSchema(schema);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validateSchema.errors || []).map(err => {
    const path = err.instancePath || '';
    return `${path} ${err.message}`;
  });

  return { valid: false, errors };
}

/**
 * Get default template schema
 * @returns {object}
 */
export function getDefaultSchema() {
  return {
    styles: {
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      fontFamily: 'Inter, sans-serif',
      fontSize: '12px',
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    },
    header: {
      enabled: true,
      layout: 'split',
      logo: {
        enabled: true,
        position: 'left',
        maxWidth: 150,
        maxHeight: 60
      },
      companyInfo: {
        enabled: true,
        showName: true,
        showAddress: true,
        showPhone: true,
        showEmail: true,
        showWebsite: false
      },
      title: {
        enabled: true,
        text: 'INVOICE',
        fontSize: '24px',
        fontWeight: 'bold'
      },
      documentInfo: {
        enabled: true,
        showTitle: true,
        titleText: 'INVOICE',
        fontSize: '28px',
        fontWeight: 'bold',
        showNumber: true,
        showDate: true,
        showDueDate: true,
        showStatus: false
      }
    },
    documentInfo: {
      enabled: true,
      layout: 'horizontal',
      fields: [
        { key: 'invoice_number', label: 'No. Invoice', enabled: true },
        { key: 'date', label: 'Tanggal', enabled: true, format: 'DD/MM/YYYY' },
        { key: 'due_date', label: 'Jatuh Tempo', enabled: true, format: 'DD/MM/YYYY' },
        { key: 'status', label: 'Status', enabled: true }
      ]
    },
    customerInfo: {
      enabled: true,
      title: 'Kepada:',
      fields: [
        { key: 'name', label: 'Nama', enabled: true },
        { key: 'address', label: 'Alamat', enabled: true },
        { key: 'phone', label: 'Telepon', enabled: true },
        { key: 'email', label: 'Email', enabled: true }
      ]
    },
    table: {
      enabled: true,
      showHeader: true,
      showBorders: true,
      stripedRows: true,
      columns: [
        { key: 'no', label: 'No', enabled: true, width: '5%', align: 'center' },
        { key: 'description', label: 'Deskripsi', enabled: true, width: '40%', align: 'left' },
        { key: 'quantity', label: 'Qty', enabled: true, width: '10%', align: 'center' },
        { key: 'unit', label: 'Satuan', enabled: true, width: '10%', align: 'center' },
        { key: 'price', label: 'Harga', enabled: true, width: '15%', align: 'right', format: 'currency' },
        { key: 'total', label: 'Jumlah', enabled: true, width: '20%', align: 'right', format: 'currency' }
      ]
    },
    summary: {
      enabled: true,
      position: 'right',
      fields: [
        { key: 'subtotal', label: 'Subtotal', enabled: true, format: 'currency' },
        { key: 'discount', label: 'Diskon', enabled: true, format: 'currency' },
        { key: 'tax', label: 'PPN (11%)', enabled: true, format: 'currency' },
        { key: 'total', label: 'Total', enabled: true, format: 'currency', highlight: true }
      ]
    },
    notes: {
      enabled: true,
      title: 'Catatan',
      content: ''
    },
    terms: {
      enabled: true,
      title: 'Syarat & Ketentuan',
      content: '1. Pembayaran dilakukan dalam waktu 14 hari.\n2. Pembayaran dapat dilakukan melalui transfer bank.'
    },
    bankInfo: {
      enabled: true,
      title: 'Informasi Pembayaran',
      accounts: [
        {
          bankName: 'Bank BCA',
          accountName: '',
          accountNumber: '',
          enabled: true
        }
      ]
    },
    signature: {
      enabled: true,
      layout: 'double',
      fields: [
        { label: 'Penerima', enabled: true, showDate: true, showLine: true },
        { label: 'Hormat Kami', enabled: true, showDate: true, showLine: true }
      ]
    },
    footer: {
      enabled: true,
      content: 'Terima kasih atas kepercayaan Anda',
      showPageNumber: true,
      pageNumberFormat: 'Halaman {page} dari {total}'
    }
  };
}

export default {
  validateTemplateSchema,
  getDefaultSchema
};
