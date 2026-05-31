

import { apiClient } from '../utils/apiClient';

export interface RouteStarCustomerOption {
  _id: string;
  routeStarId: string;
  name: string;
  company: string | null;
  city: string | null;
  state: string | null;
}

export interface MapDistanceResult {
  assignedTo: string;
  frequency: string;
  date: string;
  customer: string;
  day: string;
  stop: string;
  distance: string;
}

export interface MapDistanceResponse {
  success: boolean;
  jobId?: string;
  customerName?: string;
  message?: string;
  error?: string;
}

export interface MapDistanceSyncJob {
  _id: string;
  jobType: 'single_fetch' | 'full_sync' | 'update_sync';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  totalCustomers: number;
  processedCustomers: number;
  successfulCustomers: number;
  failedCustomers: number;
  currentCustomerName: string | null;
  recordsCreated: number;
  fetchedData: MapDistanceResult[] | null;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  customerIds: string[];
  processedCustomerIds: string[];
  errors: Array<{
    customerName: string;
    error: string;
    timestamp: string;
  }>;
  startedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MapDistanceRecord {
  _id: string;
  customerId: {
    _id: string;
    name: string;
    company: string;
    city: string;
  };
  destinationCustomerName: string;
  assignedTo: string;
  frequency: string;
  serviceDate: string | null;
  dayOfWeek: string;
  stopNumber: number | null;
  distanceMiles: number | null;
  distanceRaw: string;
  createdAt: string;
}

export interface MapDistanceStats {
  totalRecords: number;
  customersWithData: number;
  lastSyncAt: string | null;
  lastSyncRecords: number;
  storageSizeBytes: number;
  storageSizeFormatted: string;
  avgBytesPerRecord: number;
}

export interface AccountTypeDetectionResult {
  success: boolean;
  accountType: 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';
  confidence: 'high' | 'low';
  reason: string;
  distanceMiles: number | null;
  drivingTimeMinutes: number | null;
  nearestAnchor: string | null;
  customerName?: string;
  thresholds?: {
    anchorMinRevenue: number;
    anchorMinRevenueGreenline: number;
    bread5MaxMiles: number;
    bread15MaxMiles: number;
    milesPerMinute: number;
  };
  error?: string;
}

const BASE_PATH = '/api/map-distance';

export const mapDistanceApi = {
  
  async getCustomers(search?: string): Promise<RouteStarCustomerOption[]> {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);

      const response = await apiClient.get<{
        success: boolean;
        data: RouteStarCustomerOption[];
        total: number;
      }>(`${BASE_PATH}/customers?${queryParams.toString()}`);

      const result = response.data;
      return result?.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching RouteStar customers:', error);
      return [];
    }
  },

  async fetchDistance(customerName: string): Promise<MapDistanceResponse> {
    try {
      const response = await apiClient.post<MapDistanceResponse>(
        `${BASE_PATH}/fetch`,
        { customerName }
      );

      if (response.data) {
        return response.data;
      }

      return {
        success: false,
        customerName,
        error: response.error || 'Failed to start fetch'
      };
    } catch (error) {
      console.error('Error starting map distance fetch:', error);
      return {
        success: false,
        customerName,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async startSync(): Promise<{ success: boolean; jobId?: string; totalCustomers?: number; error?: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        jobId: string;
        totalCustomers: number;
        message: string;
      }>(`${BASE_PATH}/sync/start`, {});

      if (response.data) {
        return {
          success: true,
          jobId: response.data.jobId,
          totalCustomers: response.data.totalCustomers
        };
      }

      return { success: false, error: response.error || 'Failed to start sync' };
    } catch (error) {
      console.error('Error starting sync:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async startUpdateSync(): Promise<{ success: boolean; jobId?: string; totalCustomers?: number; error?: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        jobId: string;
        totalCustomers: number;
        message: string;
      }>(`${BASE_PATH}/sync/update`, {});

      if (response.data) {
        return {
          success: true,
          jobId: response.data.jobId,
          totalCustomers: response.data.totalCustomers
        };
      }

      return { success: false, error: response.error || 'Failed to start update sync' };
    } catch (error) {
      console.error('Error starting update sync:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getSyncStatus(): Promise<{ success: boolean; isRunning: boolean; isInterrupted: boolean; isPaused: boolean; job: MapDistanceSyncJob | null }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        isRunning: boolean;
        isInterrupted: boolean;
        isPaused: boolean;
        job: MapDistanceSyncJob | null;
      }>(`${BASE_PATH}/sync/status`);

      if (response.data) {
        return response.data;
      }

      return { success: false, isRunning: false, isInterrupted: false, isPaused: false, job: null };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { success: false, isRunning: false, isInterrupted: false, isPaused: false, job: null };
    }
  },

  async cancelSync(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `${BASE_PATH}/sync/cancel`,
        {}
      );

      return { success: response.data?.success ?? false };
    } catch (error) {
      console.error('Error cancelling sync:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async pauseSync(): Promise<{ success: boolean; processedCustomers?: number; totalCustomers?: number; error?: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        processedCustomers: number;
        totalCustomers: number;
      }>(`${BASE_PATH}/sync/pause`, {});

      if (response.data) {
        return {
          success: true,
          processedCustomers: response.data.processedCustomers,
          totalCustomers: response.data.totalCustomers
        };
      }

      return { success: false, error: response.error || 'Failed to pause sync' };
    } catch (error) {
      console.error('Error pausing sync:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async resetStuckJobs(): Promise<{ success: boolean; modifiedCount?: number; error?: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        modifiedCount: number;
      }>(`${BASE_PATH}/sync/reset`, {});

      if (response.data) {
        return {
          success: true,
          modifiedCount: response.data.modifiedCount
        };
      }

      return { success: false, error: response.error || 'Failed to reset jobs' };
    } catch (error) {
      console.error('Error resetting stuck jobs:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async resumeSync(jobId?: string): Promise<{ success: boolean; jobId?: string; remainingCustomers?: number; error?: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        jobId: string;
        remainingCustomers: number;
      }>(`${BASE_PATH}/sync/resume`, { jobId });

      if (response.data) {
        return {
          success: true,
          jobId: response.data.jobId,
          remainingCustomers: response.data.remainingCustomers
        };
      }

      return { success: false, error: response.error || 'Failed to resume sync' };
    } catch (error) {
      console.error('Error resuming sync:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getSyncHistory(): Promise<MapDistanceSyncJob[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: MapDistanceSyncJob[];
      }>(`${BASE_PATH}/sync/history`);

      return response.data?.data || [];
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  },

  async getStoredRecords(params?: { customerId?: string; page?: number; limit?: number }): Promise<{
    records: MapDistanceRecord[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.customerId) queryParams.set('customerId', params.customerId);
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());

      const response = await apiClient.get<{
        success: boolean;
        data: MapDistanceRecord[];
        total: number;
        page: number;
        totalPages: number;
      }>(`${BASE_PATH}/records?${queryParams.toString()}`);

      if (response.data) {
        return {
          records: response.data.data,
          total: response.data.total,
          page: response.data.page,
          totalPages: response.data.totalPages
        };
      }

      return { records: [], total: 0, page: 1, totalPages: 0 };
    } catch (error) {
      console.error('Error getting stored records:', error);
      return { records: [], total: 0, page: 1, totalPages: 0 };
    }
  },

  async getCustomersWithData(search?: string): Promise<RouteStarCustomerOption[]> {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);

      const response = await apiClient.get<{
        success: boolean;
        data: RouteStarCustomerOption[];
        total: number;
      }>(`${BASE_PATH}/customers-with-data?${queryParams.toString()}`);

      const result = response.data;
      return result?.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching customers with data:', error);
      return [];
    }
  },

  async getStats(): Promise<MapDistanceStats | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        stats: MapDistanceStats;
      }>(`${BASE_PATH}/stats`);

      return response.data?.stats || null;
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  },

  async deleteAllRecords(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
        deletedCount: number;
      }>(`${BASE_PATH}/records`);

      if (response.data) {
        return {
          success: true,
          deletedCount: response.data.deletedCount
        };
      }

      return { success: false, error: response.error || 'Failed to delete records' };
    } catch (error) {
      console.error('Error deleting records:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async detectAccountType(params: {
    biginCompanyId?: string;
    routeStarCustomerId?: string;
    perVisitRevenue?: number;
    isGreenline?: boolean;
  }): Promise<AccountTypeDetectionResult> {
    try {
      const response = await apiClient.post<AccountTypeDetectionResult>(
        `${BASE_PATH}/detect-account-type`,
        params
      );

      if (response.data) {
        return response.data;
      }

      return {
        success: false,
        accountType: 'Pit',
        confidence: 'low',
        reason: response.error || 'Failed to detect account type',
        distanceMiles: null,
        drivingTimeMinutes: null,
        nearestAnchor: null
      };
    } catch (error) {
      console.error('Error detecting account type:', error);
      return {
        success: false,
        accountType: 'Pit',
        confidence: 'low',
        reason: error instanceof Error ? error.message : 'Unknown error',
        distanceMiles: null,
        drivingTimeMinutes: null,
        nearestAnchor: null
      };
    }
  }
};

export default mapDistanceApi;
