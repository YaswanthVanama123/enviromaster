// src/backendservice/api/zohoApi.ts
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Types for Zoho API responses
export interface ZohoCompany {
  id: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
}

export interface ZohoUploadStatus {
  success: boolean;
  isFirstTime: boolean;
  mapping?: {
    companyName: string;
    companyId: string;
    dealName: string;
    dealId: string;
    currentVersion: number;
    nextVersion: number;
    lastUploadedAt: string;
  };
  agreement?: {
    id: string;
    headerTitle: string;
    status: string;
  };
}

export interface ZohoPipelineOptions {
  success: boolean;
  pipelines: Array<{
    label: string;
    value: string;
  }>;
  stages: Array<{
    label: string;
    value: string;
  }>;
}

export interface ZohoUploadResult {
  success: boolean;
  message: string;
  data?: {
    deal?: {
      id: string;
      name: string;
      stage: string;
      amount: number;
    };
    note?: {
      id: string;
      title: string;
    };
    file?: {
      id: string;
      fileName: string;
    };
    mapping?: {
      id: string;
      version: number;
    };
  };
  error?: string;
}

export interface ZohoUploadHistory {
  success: boolean;
  hasHistory: boolean;
  company?: {
    id: string;
    name: string;
  };
  deal?: {
    id: string;
    name: string;
    pipelineName: string;
    stage: string;
  };
  uploads?: Array<{
    version: number;
    fileName: string;
    noteText: string;
    uploadedAt: string;
    uploadedBy: string;
  }>;
  totalVersions?: number;
  currentVersion?: number;
  lastUploadedAt?: string;
}

export interface ZohoCompaniesResponse {
  success: boolean;
  companies: ZohoCompany[];
  pagination?: {
    page: number;
    totalPages: number;
    totalRecords: number;
  };
  isSearch?: boolean;
}

export interface CreateCompanyRequest {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

export interface FirstTimeUploadRequest {
  companyId: string;
  companyName: string;
  dealName: string;
  pipelineName?: string;
  stage?: string;
  noteText: string;
}

export interface UpdateUploadRequest {
  noteText: string;
}

export interface ZohoDeal {
  id: string;
  name: string;
  stage: string;
  amount: number;
  closingDate: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
  description?: string;
  pipelineName?: string;
  contactName?: string | null;
}

export interface ZohoDealsResponse {
  success: boolean;
  companyId: string;
  deals: ZohoDeal[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    hasMore: boolean;
  };
  message: string;
  error?: string;
}

export const zohoApi = {
  /**
   * Check if agreement is first-time upload or existing
   */
  async getUploadStatus(agreementId: string): Promise<ZohoUploadStatus> {
    const res = await axios.get(
      `${API_BASE_URL}/api/zoho-upload/${agreementId}/status`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Get list of companies with optional search
   */
  async getCompanies(
    page = 1,
    search?: string
  ): Promise<ZohoCompaniesResponse> {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    if (search && search.trim()) {
      params.set("search", search.trim());
    }

    const res = await axios.get(
      `${API_BASE_URL}/api/zoho-upload/companies?${params}`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Create new company in Zoho
   */
  async createCompany(companyData: CreateCompanyRequest): Promise<{
    success: boolean;
    company?: ZohoCompany;
    error?: string;
  }> {
    const res = await axios.post(
      `${API_BASE_URL}/api/zoho-upload/companies`,
      companyData,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Get deals for a specific company
   */
  async getCompanyDeals(
    companyId: string,
    page = 1,
    perPage = 20
  ): Promise<ZohoDealsResponse> {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("per_page", perPage.toString());

    const res = await axios.get(
      `${API_BASE_URL}/api/zoho-upload/companies/${companyId}/deals?${params}`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Get pipeline and stage options for a specific company
   */
  async getCompanyPipelineOptions(companyId: string): Promise<ZohoPipelineOptions & {
    companyId: string;
    message?: string;
  }> {
    const res = await axios.get(
      `${API_BASE_URL}/api/zoho-upload/companies/${companyId}/pipeline-options`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Get pipeline and stage options (general)
   */
  async getPipelineOptions(): Promise<ZohoPipelineOptions> {
    const res = await axios.get(
      `${API_BASE_URL}/api/zoho-upload/pipeline-options`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Validate pipeline and stage values
   */
  async validateDealFields(pipelineName: string, stage: string): Promise<{
    success: boolean;
    valid: boolean;
    correctedPipeline?: string;
    correctedStage?: string;
    error?: string;
    validPipelines?: Array<{ label: string; value: string }>;
    validStages?: Array<{ label: string; value: string }>;
  }> {
    const res = await axios.post(
      `${API_BASE_URL}/api/zoho-upload/validate-deal-fields`,
      { pipelineName, stage },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * First-time upload to Zoho
   */
  async firstTimeUpload(
    agreementId: string,
    uploadData: FirstTimeUploadRequest
  ): Promise<ZohoUploadResult> {
    const res = await axios.post(
      `${API_BASE_URL}/api/zoho-upload/${agreementId}/first-time`,
      uploadData,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Update upload to existing deal
   */
  async updateUpload(
    agreementId: string,
    updateData: UpdateUploadRequest
  ): Promise<ZohoUploadResult> {
    const res = await axios.post(
      `${API_BASE_URL}/api/zoho-upload/${agreementId}/update`,
      updateData,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Get upload history for agreement
   */
  async getUploadHistory(agreementId: string): Promise<ZohoUploadHistory> {
    const res = await axios.get(
      `${API_BASE_URL}/api/zoho-upload/${agreementId}/history`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Get available Zoho modules (for debugging)
   */
  async getModules(): Promise<{
    success: boolean;
    modules?: Array<{
      apiName: string;
      displayLabel: string;
      creatable: boolean;
      editable: boolean;
    }>;
    error?: string;
  }> {
    const res = await axios.get(`${API_BASE_URL}/api/zoho-upload/modules`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },
};