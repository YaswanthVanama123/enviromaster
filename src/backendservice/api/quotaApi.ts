

import { apiClient } from '../utils/apiClient';
import type {
  SalesPerson,
  CreateSalesPersonInput,
  UpdateSalesPersonInput,
  UpdateQuotaInput,
  Agreement,
  CreateAgreementInput,
  AgreementStatus,
  QuotaPeriod,
  QuotaStatusResponse,
  QuotaLevelResponse,
  LeaderboardResponse,
} from '../types/quota.types';

const BASE_PATH = '/api/quota';

export const salesPersonApi = {
  
  async getAll(params?: {
    active?: boolean;
    role?: string;
    search?: string;
  }): Promise<{ data: SalesPerson[]; count: number } | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.active !== undefined) queryParams.set('active', String(params.active));
      if (params?.role) queryParams.set('role', params.role);
      if (params?.search) queryParams.set('search', params.search);

      const response = await apiClient.get<{ success: boolean; data: SalesPerson[]; count: number }>(
        `${BASE_PATH}/sales-persons?${queryParams.toString()}`
      );

      const result = response.data;
      return result?.success ? { data: result.data, count: result.count } : null;
    } catch (error) {
      console.error('Error fetching sales persons:', error);
      return null;
    }
  },

  async getById(id: string): Promise<SalesPerson | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: SalesPerson }>(
        `${BASE_PATH}/sales-persons/${id}`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching sales person:', error);
      return null;
    }
  },

  async create(input: CreateSalesPersonInput): Promise<SalesPerson | null> {
    try {
      const response = await apiClient.post<{ success: boolean; data: SalesPerson }>(
        `${BASE_PATH}/sales-persons`,
        input
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error creating sales person:', error);
      return null;
    }
  },

  async update(id: string, input: UpdateSalesPersonInput): Promise<SalesPerson | null> {
    try {
      const response = await apiClient.put<{ success: boolean; data: SalesPerson }>(
        `${BASE_PATH}/sales-persons/${id}`,
        input
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error updating sales person:', error);
      return null;
    }
  },

  async updateQuota(id: string, input: UpdateQuotaInput): Promise<SalesPerson | null> {
    try {
      const response = await apiClient.put<{ success: boolean; data: SalesPerson }>(
        `${BASE_PATH}/sales-persons/${id}/quota`,
        input
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error updating quota:', error);
      return null;
    }
  },
};

export const agreementApi = {
  
  async getAll(params?: {
    salesPersonId?: string;
    status?: AgreementStatus;
    startDate?: string;
    endDate?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    data: Agreement[];
    pagination: { total: number; limit: number; skip: number; hasMore: boolean };
  } | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.salesPersonId) queryParams.set('salesPersonId', params.salesPersonId);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.startDate) queryParams.set('startDate', params.startDate);
      if (params?.endDate) queryParams.set('endDate', params.endDate);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await apiClient.get<{
        success: boolean;
        data: Agreement[];
        pagination: { total: number; limit: number; skip: number; hasMore: boolean };
      }>(`${BASE_PATH}/agreements?${queryParams.toString()}`);

      const result = response.data;
      return result?.success ? { data: result.data, pagination: result.pagination } : null;
    } catch (error) {
      console.error('Error fetching agreements:', error);
      return null;
    }
  },

  async getById(id: string): Promise<Agreement | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Agreement }>(
        `${BASE_PATH}/agreements/${id}`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching agreement:', error);
      return null;
    }
  },

  async create(input: CreateAgreementInput): Promise<{
    agreement: Agreement;
    quotaPeriod: {
      actualSales: number;
      quotaTarget: number;
      quotaPercentage: number;
      quotaLevel: string;
    };
  } | null> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          agreement: Agreement;
          quotaPeriod: {
            actualSales: number;
            quotaTarget: number;
            quotaPercentage: number;
            quotaLevel: string;
          };
        };
      }>(`${BASE_PATH}/agreements`, input);

      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error creating agreement:', error);
      return null;
    }
  },

  async updateStatus(
    id: string,
    status: AgreementStatus,
    approvedBy?: string
  ): Promise<Agreement | null> {
    try {
      const response = await apiClient.put<{ success: boolean; data: Agreement }>(
        `${BASE_PATH}/agreements/${id}/status`,
        { status, approvedBy }
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error updating agreement status:', error);
      return null;
    }
  },
};

export const quotaApi = {
  
  async getStatus(
    salesPersonId: string,
    params?: { periodType?: 'monthly' | 'quarterly' | 'annual'; date?: string }
  ): Promise<QuotaStatusResponse | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.periodType) queryParams.set('periodType', params.periodType);
      if (params?.date) queryParams.set('date', params.date);

      const response = await apiClient.get<{ success: boolean; data: QuotaStatusResponse }>(
        `${BASE_PATH}/status/${salesPersonId}?${queryParams.toString()}`
      );

      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching quota status:', error);
      return null;
    }
  },

  async getHistory(salesPersonId: string, limit?: number): Promise<QuotaPeriod[] | null> {
    try {
      const queryParams = new URLSearchParams();
      if (limit) queryParams.set('limit', String(limit));

      const response = await apiClient.get<{ success: boolean; data: QuotaPeriod[] }>(
        `${BASE_PATH}/history/${salesPersonId}?${queryParams.toString()}`
      );

      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching quota history:', error);
      return null;
    }
  },

  async getCurrentLevel(salesPersonId: string): Promise<QuotaLevelResponse | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: QuotaLevelResponse }>(
        `${BASE_PATH}/level/${salesPersonId}`
      );

      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching quota level:', error);
      return null;
    }
  },

  async getLeaderboard(params?: {
    periodType?: 'monthly' | 'quarterly' | 'annual';
    date?: string;
  }): Promise<LeaderboardResponse | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.periodType) queryParams.set('periodType', params.periodType);
      if (params?.date) queryParams.set('date', params.date);

      const response = await apiClient.get<{ success: boolean; data: LeaderboardResponse }>(
        `${BASE_PATH}/leaderboard?${queryParams.toString()}`
      );

      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return null;
    }
  },
};

export default {
  salesPerson: salesPersonApi,
  agreement: agreementApi,
  quota: quotaApi,
};
