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
  // =========================================
  // Commission Rules Endpoints
  // =========================================

  /**
   * Get the currently active commission rules
   */
  async getActiveRules() {
    return apiClient.get<CommissionRules>("/api/commission/rules/active");
  },

  /**
   * Get all commission rules (admin only)
   */
  async getAllRules() {
    return apiClient.get<CommissionRules[]>("/api/commission/rules");
  },

  /**
   * Update commission rules (admin only)
   */
  async updateRules(id: string, payload: Partial<CommissionRules>) {
    return apiClient.put<CommissionRules>(`/api/commission/rules/${id}`, payload);
  },

  /**
   * Create new commission rules (admin only)
   */
  async createRules(payload: Omit<CommissionRules, "_id" | "createdAt" | "updatedAt">) {
    return apiClient.post<CommissionRules>("/api/commission/rules", payload);
  },

  // =========================================
  // Commission Calculation Endpoints
  // =========================================

  /**
   * Calculate commission based on input
   */
  async calculate(input: CommissionCalculationInput) {
    return apiClient.post<CommissionCalculationResult>("/api/commission/calculate", input);
  },

  // =========================================
  // Commission Records Endpoints
  // =========================================

  /**
   * Save a commission calculation as a record
   */
  async saveRecord(
    record: Omit<CommissionRecord, "_id" | "createdAt" | "createdBy">
  ) {
    return apiClient.post<CommissionRecord>("/api/commission/records", record);
  },

  /**
   * Get commission records with optional filters
   */
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

  /**
   * Get a single commission record by ID
   */
  async getRecordById(id: string) {
    return apiClient.get<CommissionRecord>(`/api/commission/records/${id}`);
  },

  /**
   * Update commission record status (admin only)
   */
  async updateRecordStatus(
    id: string,
    status: CommissionRecord["status"]
  ) {
    return apiClient.patch<CommissionRecord>(
      `/api/commission/records/${id}/status`,
      { status }
    );
  },

  /**
   * Delete a commission record (admin only)
   */
  async deleteRecord(id: string) {
    return apiClient.delete(`/api/commission/records/${id}`);
  },
};
