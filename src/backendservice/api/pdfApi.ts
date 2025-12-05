// src/backendservice/api/pdfApi.ts

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface CustomerHeader {
  _id: string;
  id?: string;
  payload?: any;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerHeadersResponse {
  items: CustomerHeader[];
}

export interface ProductItem {
  displayName: string;
  qty: number;
  frequency?: string;
  total: number;
  unitPrice?: number;      // For small products
  warrantyRate?: number;   // For dispensers
  replacementRate?: number;// For dispensers
  amount?: number;         // For big products
}

export interface ProductsPayload {
  smallProducts: ProductItem[];
  dispensers: ProductItem[];
  bigProducts: ProductItem[];
}

export interface FormPayload {
  headerTitle: string;
  headerRows: any[];
  products: ProductsPayload;
  services: any;
  agreement: any;
}

/**
 * PDF API Service
 * Handles all PDF-related operations: customer headers, admin templates, downloads
 */
export const pdfApi = {
  /**
   * Get all customer headers
   */
  async getCustomerHeaders(): Promise<CustomerHeadersResponse> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/customer-headers`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Get a specific customer header by ID
   */
  async getCustomerHeaderById(id: string): Promise<{ payload: FormPayload }> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/customer-headers/${id}`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Get a specific customer header by ID in edit-friendly format
   * This endpoint converts backend data structure for proper edit mode mapping
   */
  async getCustomerHeaderForEdit(id: string): Promise<{ payload: FormPayload }> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/customer-headers/${id}/edit-format`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Get admin template header by ID
   */
  async getAdminHeaderById(id: string): Promise<{ payload: FormPayload }> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/admin-headers/${id}`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Create a new customer header with PDF generation
   */
  async createCustomerHeader(payload: FormPayload): Promise<{
    status: number;
    headers: any;
    data: any;
  }> {
    const res = await axios.post(
      `${API_BASE_URL}/api/pdf/customer-header`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return {
      status: res.status,
      headers: res.headers,
      data: res.data,
    };
  },

  /**
   * Update existing customer header (draft only)
   */
  async updateCustomerHeader(id: string, payload: FormPayload): Promise<void> {
    await axios.put(
      `${API_BASE_URL}/api/pdf/customer-headers/${id}`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },

  /**
   * Update existing customer header and recompile PDF
   */
  async updateAndRecompileCustomerHeader(
    id: string,
    payload: FormPayload
  ): Promise<void> {
    await axios.put(
      `${API_BASE_URL}/api/pdf/customer-headers/${id}?recompile=true`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },

  /**
   * Update document status
   */
  async updateDocumentStatus(id: string, status: string): Promise<void> {
    await axios.patch(
      `${API_BASE_URL}/api/pdf/customer-headers/${id}/status`,
      { status },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },

  /**
   * Download PDF as blob
   */
  async downloadPdf(documentId: string): Promise<Blob> {
    const res = await axios.get(
      `${API_BASE_URL}/api/pdf/viewer/download/${documentId}`,
      {
        responseType: "blob",
      }
    );
    return res.data;
  },

  /**
   * Get PDF download URL
   */
  getPdfDownloadUrl(documentId: string): string {
    return `${API_BASE_URL}/api/pdf/viewer/download/${documentId}`;
  },
};
