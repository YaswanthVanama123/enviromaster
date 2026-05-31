

import { apiClient, ApiResponse } from '../utils/apiClient';
import type {
  AccountTypeDetectionInput,
  AccountTypeDetectionResponse,
  BatchDetectionInput,
  BatchDetectionResponse,
  ThresholdsResponse,
  AccountType,
} from '../types/accountType.types';

export type { AccountType } from '../types/accountType.types';

const BASE_PATH = '/api/account-type';
const MAP_DISTANCE_PATH = '/api/map-distance';

export interface DestinationResult {
  destination: string;
  address?: string;
  storedDistanceMiles?: number;
  mapboxDistanceMiles?: number;
  drivingTimeMinutes?: number;
  error?: string;
}

export interface MapboxDetectionResult {
  success: boolean;
  biginCompany?: string;
  routeStarCustomer?: string;
  fromAddress?: string;
  destinations?: DestinationResult[];
  accountType?: AccountType;
  shortestDrivingTime?: number | null;
  nearestDestination?: string | null;
  reason?: string;
  error?: string;
  thresholds?: {
    bread5MaxMinutes: number;
    bread15MaxMinutes: number;
  };
}

export interface FrequencyDetectionResult {
  accountType: AccountType;
  confidence: 'high' | 'low';
  reason: string;
  drivingTimeMinutes: number | null;
  nearestDestination: string | null;
  destinations?: DestinationResult[];
  usedFallback?: boolean;
  fallbackReason?: string;
  error?: string;
}

export interface BatchFrequencyDetectionResult {
  success: boolean;
  biginCompany?: string;
  routeStarCustomer?: string;
  fromAddress?: string;
  results?: Record<number, FrequencyDetectionResult>;
  error?: string;
  thresholds?: {
    bread5MaxMinutes: number;
    bread15MaxMinutes: number;
  };
}

export const accountTypeApi = {
  
  async getThresholds(): Promise<ApiResponse<ThresholdsResponse>> {
    return apiClient.get<ThresholdsResponse>(`${BASE_PATH}/thresholds`);
  },

  async detect(input: AccountTypeDetectionInput): Promise<ApiResponse<AccountTypeDetectionResponse>> {
    return apiClient.post<AccountTypeDetectionResponse>(`${BASE_PATH}/detect`, input);
  },

  async detectBatch(locations: AccountTypeDetectionInput[]): Promise<ApiResponse<BatchDetectionResponse>> {
    const input: BatchDetectionInput = { locations };
    return apiClient.post<BatchDetectionResponse>(`${BASE_PATH}/detect-batch`, input);
  },

  async detectWithMapbox(biginCompanyId: string, frequency?: number): Promise<MapboxDetectionResult> {
    try {
      const payload: { biginCompanyId: string; frequency?: number } = { biginCompanyId };
      if (frequency !== undefined) {
        payload.frequency = frequency;
      }
      const response = await apiClient.post<MapboxDetectionResult>(
        `${MAP_DISTANCE_PATH}/detect-account-type-mapbox`,
        payload
      );
      return response.data || { success: false, error: 'No response data' };
    } catch (error) {
      console.error('Error detecting account type with Mapbox:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect account type'
      };
    }
  },

  async detectWithMapboxBatch(
    biginCompanyId: string,
    frequencies: number[]
  ): Promise<BatchFrequencyDetectionResult> {
    try {
      const response = await apiClient.post<BatchFrequencyDetectionResult>(
        `${MAP_DISTANCE_PATH}/detect-account-type-batch`,
        { biginCompanyId, frequencies }
      );
      return response.data || { success: false, error: 'No response data' };
    } catch (error) {
      console.error('Error detecting batch account types with Mapbox:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect account types'
      };
    }
  },
};

export default accountTypeApi;
