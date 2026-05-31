import { apiClient } from "../utils/apiClient";
import type {
  CommissionRules,
  CommissionCalculationInput,
  CommissionCalculationResult,
  CommissionRecord,
} from "../types/commission.types";

export interface CommissionRecordsResponse {
  records: CommissionRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const commissionApi = {

  

  async getActiveRules() {
    return apiClient.get<CommissionRules>("/api/commission/rules/active");
  },

  async getAllRules() {
    return apiClient.get<CommissionRules[]>("/api/commission/rules");
  },

  async updateRules(id: string, payload: Partial<CommissionRules>) {
    return apiClient.put<CommissionRules>(`/api/commission/rules/${id}`, payload);
  },

  async createRules(payload: Omit<CommissionRules, "_id" | "createdAt" | "updatedAt">) {
    return apiClient.post<CommissionRules>("/api/commission/rules", payload);
  },

  

  
  async calculate(input: CommissionCalculationInput) {
    return apiClient.post<CommissionCalculationResult>("/api/commission/calculate", input);
  },

  

  
  async saveRecord(
    record: Omit<CommissionRecord, "_id" | "createdAt" | "createdBy">
  ) {
    return apiClient.post<CommissionRecord>("/api/commission/records", record);
  },

  async getRecords(params?: {
    salesPersonId?: string;
    status?: string;
    limit?: number;
    page?: number;
  }) {
    const queryParams = new URLSearchParams();

    if (params?.salesPersonId) {
      queryParams.set("salesPersonId", params.salesPersonId);
    }
    if (params?.status) {
      queryParams.set("status", params.status);
    }
    if (params?.limit) {
      queryParams.set("limit", params.limit.toString());
    }
    if (params?.page) {
      queryParams.set("page", params.page.toString());
    }

    const queryString = queryParams.toString();
    const url = queryString
      ? `/api/commission/records?${queryString}`
      : "/api/commission/records";

    return apiClient.get<CommissionRecordsResponse>(url);
  },

  async getRecordById(id: string) {
    return apiClient.get<CommissionRecord>(`/api/commission/records/${id}`);
  },

  async updateRecordStatus(
    id: string,
    status: CommissionRecord["status"]
  ) {
    return apiClient.patch<CommissionRecord>(
      `/api/commission/records/${id}/status`,
      { status }
    );
  },

  async deleteRecord(id: string) {
    return apiClient.delete(`/api/commission/records/${id}`);
  },
};
