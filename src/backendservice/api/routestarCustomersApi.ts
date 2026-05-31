

import { apiClient } from '../utils/apiClient';

export interface RouteStarCustomer {
  _id: string;
  routeStarId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  company: string;
  isActive: boolean;
  isPaperless: boolean;
  grouping: string;
  onRoute: string;
  createdInRouteStar: string;
  account: string;
  salesRep: string;
  customerType: string;
  balance: number;
  detailUrl: string;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSyncStatus {
  isRunning: boolean;
  lastSyncAt: string | null;
  lastSyncResult: 'success' | 'partial' | 'failed' | null;
  progress: number;
  message: string;
  totalCustomers: number;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  uniqueCities: number;
  uniqueStates: number;
  recentlyAdded: number;
  states: string[];
}

const BASE_PATH = '/api/routestar-customers';

export const routestarCustomersApi = {
  
  async getAll(params?: {
    search?: string;
    city?: string;
    state?: string;
    isActive?: boolean;
    limit?: number;
    skip?: number;
  }): Promise<{
    data: RouteStarCustomer[];
    pagination: { total: number; limit: number; skip: number; hasMore: boolean };
  } | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.city) queryParams.set('city', params.city);
      if (params?.state) queryParams.set('state', params.state);
      if (params?.isActive !== undefined) queryParams.set('isActive', String(params.isActive));
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await apiClient.get<{
        success: boolean;
        data: RouteStarCustomer[];
        pagination: { total: number; limit: number; skip: number; hasMore: boolean };
      }>(`${BASE_PATH}?${queryParams.toString()}`);

      const result = response.data;
      return result?.success ? { data: result.data, pagination: result.pagination } : null;
    } catch (error) {
      console.error('Error fetching customers:', error);
      return null;
    }
  },

  async getById(id: string): Promise<RouteStarCustomer | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: RouteStarCustomer }>(
        `${BASE_PATH}/${id}`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching customer:', error);
      return null;
    }
  },

  async getSyncStatus(): Promise<CustomerSyncStatus | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: CustomerSyncStatus }>(
        `${BASE_PATH}/sync/status`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return null;
    }
  },

  async startSync(): Promise<{ success: boolean; message: string } | null> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `${BASE_PATH}/sync/start`,
        {}
      );
      const result = response.data;
      return result?.success ? result : null;
    } catch (error) {
      console.error('Error starting sync:', error);
      return null;
    }
  },

  async getStats(): Promise<CustomerStats | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: CustomerStats }>(
        `${BASE_PATH}/stats`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
  },
};

export default routestarCustomersApi;
