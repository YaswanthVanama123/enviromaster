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
} from '../types/accountType.types';

const BASE_PATH = '/api/account-type';

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
};

export default accountTypeApi;
