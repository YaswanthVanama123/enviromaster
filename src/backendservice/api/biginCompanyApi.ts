

import { apiClient } from '../utils/apiClient';

export interface BiginCompany {
  _id: string;
  biginId: string | null;
  companyName: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  industry: string | null;
  accountType: string | null;
  owner: string | null;
  ownerEmail: string | null;
  pipeline: string | null;
  stage: string | null;
  description: string | null;
  tags: string[];
  rawData: Record<string, unknown>;
  lastSyncedAt: string;
  syncSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FetchStatus {
  isRunning: boolean;
  lastFetchAt: string | null;
  lastFetchResult: 'success' | 'failed' | null;
  progress: number;
  message: string;
  currentSessionId: string | null;
  totalCompanies: number;
  lastSyncedAt: string | null;
}

export interface CompanyStats {
  total: number;
  uniqueCities: number;
  uniqueStates: number;
  uniqueIndustries: number;
  uniqueOwners: number;
  cities: string[];
  states: string[];
  industries: string[];
  owners: string[];
  cityBreakdown: Array<{ city: string; count: number }>;
  ownerBreakdown: Array<{ owner: string; count: number }>;
}

const BASE_PATH = '/api/bigin-companies';

export const biginCompanyApi = {
  
  async getAll(params?: {
    search?: string;
    city?: string;
    state?: string;
    industry?: string;
    owner?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    data: BiginCompany[];
    pagination: { total: number; limit: number; skip: number; hasMore: boolean };
  } | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.city) queryParams.set('city', params.city);
      if (params?.state) queryParams.set('state', params.state);
      if (params?.industry) queryParams.set('industry', params.industry);
      if (params?.owner) queryParams.set('owner', params.owner);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await apiClient.get<{
        success: boolean;
        data: BiginCompany[];
        pagination: { total: number; limit: number; skip: number; hasMore: boolean };
      }>(`${BASE_PATH}?${queryParams.toString()}`);

      const result = response.data;
      return result?.success ? { data: result.data, pagination: result.pagination } : null;
    } catch (error) {
      console.error('Error fetching companies:', error);
      return null;
    }
  },

  async getById(id: string): Promise<BiginCompany | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: BiginCompany }>(
        `${BASE_PATH}/${id}`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching company:', error);
      return null;
    }
  },

  async getFetchStatus(): Promise<FetchStatus | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: FetchStatus }>(
        `${BASE_PATH}/fetch/status`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching fetch status:', error);
      return null;
    }
  },

  async startFetch(options?: { fetchDetails?: boolean }): Promise<{ success: boolean; message: string; sessionId?: string } | null> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string; sessionId?: string }>(
        `${BASE_PATH}/fetch/start`,
        options || {}
      );
      const result = response.data;
      return result?.success ? result : null;
    } catch (error) {
      console.error('Error starting fetch:', error);
      return null;
    }
  },

  async getStats(): Promise<CompanyStats | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: CompanyStats }>(
        `${BASE_PATH}/stats`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching company stats:', error);
      return null;
    }
  },

  async update(id: string, updates: Partial<BiginCompany>): Promise<BiginCompany | null> {
    try {
      const response = await apiClient.put<{ success: boolean; data: BiginCompany }>(
        `${BASE_PATH}/${id}`,
        updates
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error updating company:', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(
        `${BASE_PATH}/${id}`
      );
      const result = response.data;
      return result?.success || false;
    } catch (error) {
      console.error('Error deleting company:', error);
      return false;
    }
  },
};

export default biginCompanyApi;
