import { apiClient } from "../utils/apiClient";

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
  skipFileUpload?: boolean;
}

export interface UpdateUploadRequest {
  noteText: string;
  dealId?: string;
  skipNoteCreation?: boolean;
  versionId?: string;
  versionFileName?: string;
  skipFileUpload?: boolean;
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

export interface ZohoUser {
  id: string;
  name: string;
  email: string;
}

export interface ZohoCreateTaskPayload {
  subject: string;
  dueDate?: string;
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Waiting' | 'Deferred';
  priority?: 'High' | 'Medium' | 'Low';
  description?: string;
  ownerId?: string;
  seModule?: string;
  reminder?: boolean;
  reminderWhen?: string;
  reminderTime?: string;
  repeat?: boolean;
  repeatFrequency?: string;
  repeatUntil?: string;
}

export interface ZohoTask {
  id: string;
  subject: string;
  dueDate?: string;
  status: string;
  priority: string;
}

export const zohoApi = {
  async getUploadStatus(agreementId: string): Promise<ZohoUploadStatus> {
    const res = await apiClient.get<ZohoUploadStatus>(
      `/api/zoho-upload/${agreementId}/status`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async getCompanies(
    page = 1,
    search?: string
  ): Promise<ZohoCompaniesResponse> {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    if (search && search.trim()) {
      params.set("search", search.trim());
    }

    const res = await apiClient.get<ZohoCompaniesResponse>(
      `/api/zoho-upload/companies?${params}`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async createCompany(companyData: CreateCompanyRequest): Promise<{
    success: boolean;
    company?: ZohoCompany;
    error?: string;
  }> {
    const res = await apiClient.post<{
      success: boolean;
      company?: ZohoCompany;
      error?: string;
    }>(
      `/api/zoho-upload/companies`,
      companyData
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async getCompanyDeals(
    companyId: string,
    page = 1,
    perPage = 20
  ): Promise<ZohoDealsResponse> {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("per_page", perPage.toString());

    const res = await apiClient.get<ZohoDealsResponse>(
      `/api/zoho-upload/companies/${companyId}/deals?${params}`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async getCompanyPipelineOptions(companyId: string): Promise<ZohoPipelineOptions & {
    companyId: string;
    message?: string;
  }> {
    const res = await apiClient.get<ZohoPipelineOptions & {
      companyId: string;
      message?: string;
    }>(
      `/api/zoho-upload/companies/${companyId}/pipeline-options`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async getPipelineOptions(): Promise<ZohoPipelineOptions> {
    const res = await apiClient.get<ZohoPipelineOptions>(
      `/api/zoho-upload/pipeline-options`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async validateDealFields(pipelineName: string, stage: string): Promise<{
    success: boolean;
    valid: boolean;
    correctedPipeline?: string;
    correctedStage?: string;
    error?: string;
    validPipelines?: Array<{ label: string; value: string }>;
    validStages?: Array<{ label: string; value: string }>;
  }> {
    const res = await apiClient.post<{
      success: boolean;
      valid: boolean;
      correctedPipeline?: string;
      correctedStage?: string;
      error?: string;
      validPipelines?: Array<{ label: string; value: string }>;
      validStages?: Array<{ label: string; value: string }>;
    }>(
      `/api/zoho-upload/validate-deal-fields`,
      { pipelineName, stage }
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async firstTimeUpload(
    agreementId: string,
    uploadData: FirstTimeUploadRequest
  ): Promise<ZohoUploadResult> {
    const res = await apiClient.post<ZohoUploadResult>(
      `/api/zoho-upload/${agreementId}/first-time`,
      uploadData
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async updateUpload(
    agreementId: string,
    updateData: UpdateUploadRequest
  ): Promise<ZohoUploadResult> {
    const res = await apiClient.post<ZohoUploadResult>(
      `/api/zoho-upload/${agreementId}/update`,
      updateData
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async batchUpdateUpload(
    agreementId: string,
    versionIds: string[],
    noteText: string,
    dealId?: string
  ): Promise<ZohoUploadResult> {
    const res = await apiClient.post<ZohoUploadResult>(
      `/api/zoho-upload/${agreementId}/batch-update`,
      {
        versionIds,
        noteText,
        dealId
      }
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async uploadAttachedFile(
    fileId: string,
    dealData: { dealId: string; noteText: string; dealName: string; skipNoteCreation?: boolean; fileType?: string }
  ): Promise<ZohoUploadResult> {
    const res = await apiClient.post<ZohoUploadResult>(
      `/api/zoho-upload/attached-file/${fileId}/add-to-deal`,
      dealData
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async batchUploadAttachedFiles(
    fileIds: Array<string | { fileId: string; fileType: string }>,
    dealId: string,
    noteText: string,
    dealName?: string
  ): Promise<ZohoUploadResult> {
    const res = await apiClient.post<ZohoUploadResult>(
      `/api/zoho-upload/batch-attached-files/add-to-deal`,
      {
        fileIds,
        dealId,
        noteText,
        dealName
      }
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async getUploadHistory(agreementId: string): Promise<ZohoUploadHistory> {
    const res = await apiClient.get<ZohoUploadHistory>(
      `/api/zoho-upload/${agreementId}/history`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async getUsers(): Promise<{ success: boolean; users: ZohoUser[]; error?: string }> {
    const res = await apiClient.get<{ success: boolean; users: ZohoUser[]; error?: string }>(
      `/api/zoho-upload/users`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

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
    const res = await apiClient.get<{
      success: boolean;
      modules?: Array<{
        apiName: string;
        displayLabel: string;
        creatable: boolean;
        editable: boolean;
      }>;
      error?: string;
    }>(`/api/zoho-upload/modules`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async createTaskForAgreement(
    agreementId: string,
    payload: ZohoCreateTaskPayload
  ): Promise<{ success: boolean; task?: ZohoTask; error?: string }> {
    const res = await apiClient.post<{ success: boolean; task?: ZohoTask; error?: string }>(
      `/api/zoho-upload/${agreementId}/tasks`,
      payload
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async createTaskForCompany(
    companyId: string,
    payload: ZohoCreateTaskPayload
  ): Promise<{ success: boolean; task?: ZohoTask; error?: string }> {
    const res = await apiClient.post<{ success: boolean; task?: ZohoTask; error?: string }>(
      `/api/zoho-upload/companies/${companyId}/tasks`,
      payload
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },
};
