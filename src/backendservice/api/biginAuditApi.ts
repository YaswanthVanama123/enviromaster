

import { apiClient } from '../utils/apiClient';

export interface BiginAuditLog {
  _id: string;
  biginId: string | null;
  timestamp: string;
  user: string;
  userEmail: string | null;
  action: string;
  module: string | null;
  recordName: string | null;
  recordId: string | null;
  details: string | null;
  ipAddress: string | null;
  rawData: Record<string, unknown>;
  scrapeSessionId: string | null;
  scrapedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeStatus {
  isRunning: boolean;
  lastScrapeAt: string | null;
  lastScrapeResult: 'success' | 'failed' | null;
  progress: number;
  message: string;
  currentSessionId: string | null;
  totalLogs: number;
  latestLogTimestamp: string | null;
  lastSession: {
    sessionId: string;
    status: string;
    logsScraped: number;
    completedAt: string | null;
  } | null;
}

export interface AuditStats {
  total: number;
  storageSize: number;
  uniqueUsers: number;
  uniqueActions: number;
  uniqueModules: number;
  last24Hours: number;
  last7Days: number;
  users: string[];
  actions: string[];
  modules: string[];
  pipelines: string[];
  actionBreakdown: Array<{ action: string; count: number }>;
  userBreakdown: Array<{ user: string; count: number }>;
}

export interface ScrapeSession {
  _id: string;
  sessionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  progressMessage: string;
  logsScraped: number;
  logsStored: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  triggeredBy: string;
  createdAt: string;
}

const BASE_PATH = '/api/bigin-audit';

export const biginAuditApi = {
  
  async getAll(params?: {
    search?: string;
    user?: string;
    action?: string;
    module?: string;
    pipeline?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    data: BiginAuditLog[];
    pagination: { total: number; limit: number; skip: number; hasMore: boolean };
  } | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.user) queryParams.set('user', params.user);
      if (params?.action) queryParams.set('action', params.action);
      if (params?.module) queryParams.set('module', params.module);
      if (params?.pipeline) queryParams.set('pipeline', params.pipeline);
      if (params?.startDate) queryParams.set('startDate', params.startDate);
      if (params?.endDate) queryParams.set('endDate', params.endDate);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await apiClient.get<{
        success: boolean;
        data: BiginAuditLog[];
        pagination: { total: number; limit: number; skip: number; hasMore: boolean };
      }>(`${BASE_PATH}?${queryParams.toString()}`);

      const result = response.data;
      return result?.success ? { data: result.data, pagination: result.pagination } : null;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return null;
    }
  },

  async getById(id: string): Promise<BiginAuditLog | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: BiginAuditLog }>(
        `${BASE_PATH}/${id}`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching audit log:', error);
      return null;
    }
  },

  async getScrapeStatus(): Promise<ScrapeStatus | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: ScrapeStatus }>(
        `${BASE_PATH}/scrape/status`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching scrape status:', error);
      return null;
    }
  },

  async startScrape(): Promise<{ success: boolean; message: string; sessionId?: string } | null> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string; sessionId?: string }>(
        `${BASE_PATH}/scrape/start`,
        {}
      );
      const result = response.data;
      return result?.success ? result : null;
    } catch (error) {
      console.error('Error starting scrape:', error);
      return null;
    }
  },

  async getStats(): Promise<AuditStats | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: AuditStats }>(
        `${BASE_PATH}/stats`
      );
      const result = response.data;
      return result?.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      return null;
    }
  },

  async getScrapeHistory(params?: {
    limit?: number;
    skip?: number;
  }): Promise<{
    data: ScrapeSession[];
    pagination: { total: number; limit: number; skip: number; hasMore: boolean };
  } | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await apiClient.get<{
        success: boolean;
        data: ScrapeSession[];
        pagination: { total: number; limit: number; skip: number; hasMore: boolean };
      }>(`${BASE_PATH}/scrape/history?${queryParams.toString()}`);

      const result = response.data;
      return result?.success ? { data: result.data, pagination: result.pagination } : null;
    } catch (error) {
      console.error('Error fetching scrape history:', error);
      return null;
    }
  },

  async uploadCsv(file: File): Promise<{
    success: boolean;
    message: string;
    data?: {
      totalRows: number;
      saved: number;
      skipped: number;
      errors: number;
      sessionId: string;
    };
  } | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.postFormData<{
        success: boolean;
        message: string;
        data: {
          totalRows: number;
          saved: number;
          skipped: number;
          errors: number;
          sessionId: string;
        };
      }>(`${BASE_PATH}/upload-csv`, formData);

      const result = response.data;
      return result?.success ? result : null;
    } catch (error) {
      console.error('Error uploading CSV:', error);
      return null;
    }
  },

  async deleteAll(): Promise<{
    success: boolean;
    message: string;
    data?: { deletedCount: number; previousCount: number };
  } | null> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
        data: { deletedCount: number; previousCount: number };
      }>(`${BASE_PATH}/delete-all`);
      const result = response.data;
      return result?.success ? result : null;
    } catch (error) {
      console.error('Error deleting all audit logs:', error);
      return null;
    }
  },

  async deleteUnnecessary(): Promise<{
    success: boolean;
    message: string;
    data?: { deletedCount: number; keptCount: number; previousTotal: number };
  } | null> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
        data: { deletedCount: number; keptCount: number; previousTotal: number };
      }>(`${BASE_PATH}/delete-unnecessary`);
      const result = response.data;
      return result?.success ? result : null;
    } catch (error) {
      console.error('Error deleting unnecessary audit logs:', error);
      return null;
    }
  },

  async checkInsideSalesEligibility(salespersonName: string): Promise<{
    success: boolean;
    data?: {
      salespersonName: string;
      isInsideSales: boolean;
      matchCount: number;
      matchDetails: Array<{
        recordName: string;
        action: string;
        timestamp: string;
        module: string;
      }>;
    };
  } | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          salespersonName: string;
          isInsideSales: boolean;
          matchCount: number;
          matchDetails: Array<{
            recordName: string;
            action: string;
            timestamp: string;
            module: string;
          }>;
        };
      }>(`${BASE_PATH}/check-inside-sales?salespersonName=${encodeURIComponent(salespersonName)}`);
      const result = response.data;
      return result?.success ? result : null;
    } catch (error) {
      console.error('Error checking inside sales eligibility:', error);
      return null;
    }
  },
};

export default biginAuditApi;
