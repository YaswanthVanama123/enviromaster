/**
 * Account Type Detection API
 * API client for auto-detecting account types based on revenue and distance
 */

import { apiClient, ApiResponse } from '../utils/apiClient';
import type {
  AccountTypeDetectionInput,
  AccountTypeDetectionResponse,
  BatchDetectionInput,
  BatchDetectionResponse,
  ThresholdsResponse,
  AccountType,
} from '../types/accountType.types';

// Re-export AccountType for convenience
export type { AccountType } from '../types/accountType.types';

const BASE_PATH = '/api/account-type';
const MAP_DISTANCE_PATH = '/api/map-distance';

// Mapbox-based detection types
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

// Batch detection types for form filling
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
  /**
   * Get account type detection thresholds and rules
   */
  async getThresholds(): Promise<ApiResponse<ThresholdsResponse>> {
    return apiClient.get<ThresholdsResponse>(`${BASE_PATH}/thresholds`);
  },

  /**
   * Detect account type for a single location
   * @param input - Detection input with revenue and optional distance
   */
  async detect(input: AccountTypeDetectionInput): Promise<ApiResponse<AccountTypeDetectionResponse>> {
    return apiClient.post<AccountTypeDetectionResponse>(`${BASE_PATH}/detect`, input);
  },

  /**
   * Detect account types for multiple locations
   * @param locations - Array of detection inputs
   */
  async detectBatch(locations: AccountTypeDetectionInput[]): Promise<ApiResponse<BatchDetectionResponse>> {
    const input: BatchDetectionInput = { locations };
    return apiClient.post<BatchDetectionResponse>(`${BASE_PATH}/detect-batch`, input);
  },

  /**
   * Detect account type using Mapbox for accurate driving time calculation
   * @param biginCompanyId - The Bigin company ID (biginId field)
   * @param frequency - Optional frequency filter (1=Weekly, 2=Bi-Weekly, etc.)
   */
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

  /**
   * Detect account types for multiple frequencies in a batch call
   * Optimized for form filling where multiple services have different frequencies
   * @param biginCompanyId - The Bigin company ID
   * @param frequencies - Array of frequency numbers (1=Weekly, 2=Bi-Weekly, etc.)
   */
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
