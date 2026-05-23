/**
 * Map Distance API
 * API client for fetching map distance from RouteStar
 */

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
  data: MapDistanceResult[];
  customerName: string;
  fetchedAt: string;
  error?: string;
}

const BASE_PATH = '/api/map-distance';

export const mapDistanceApi = {
  /**
   * Get all RouteStar customers for dropdown
   */
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

  /**
   * Fetch map distance for a customer
   */
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
        data: [],
        customerName,
        fetchedAt: new Date().toISOString(),
        error: response.error || 'Failed to fetch distance'
      };
    } catch (error) {
      console.error('Error fetching map distance:', error);
      return {
        success: false,
        data: [],
        customerName,
        fetchedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

export default mapDistanceApi;
