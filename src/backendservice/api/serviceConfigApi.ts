// src/backendservice/api/serviceConfigApi.ts

import { apiClient } from "../utils/apiClient";
import type {
  ServiceConfig,
  CreateServiceConfigPayload,
  UpdateServiceConfigPayload,
} from "../types/serviceConfig.types";

export const serviceConfigApi = {
  /**
   * Create a new service config
   */
  async create(payload: CreateServiceConfigPayload) {
    return apiClient.post<ServiceConfig>("/api/service-configs", payload);
  },

  /**
   * Get all service configs
   * @param serviceId - Optional filter by serviceId
   */
  async getAll(serviceId?: string) {
    const endpoint = serviceId
      ? `/api/service-configs?serviceId=${serviceId}`
      : "/api/service-configs";
    return apiClient.get<ServiceConfig[]>(endpoint);
  },

  /**
   * Get all active service configs
   * @param serviceId - Optional filter by serviceId
   */
  async getActive(serviceId?: string) {
    const endpoint = serviceId
      ? `/api/service-configs/active?serviceId=${serviceId}`
      : "/api/service-configs/active";

    console.log(`🌐 [API] GET ${endpoint}`);

    try {
      const result = await apiClient.get<ServiceConfig | ServiceConfig[]>(endpoint);
      console.log(`✅ [API] Response from ${endpoint}:`, result);
      return result;  // ✅ Return the full response object
    } catch (error) {
      console.error(`❌ [API] Error fetching ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Get all service pricing data (both active and inactive)
   * This provides complete pricing information for all services,
   * allowing inactive services to use real backend data instead of static fallbacks
   */
  async getAllPricing() {
    const endpoint = "/api/service-configs/pricing";
    console.log(`🌐 [API] GET ${endpoint} (fetching all service pricing data)`);

    try {
      const result = await apiClient.get<ServiceConfig[]>(endpoint);
      console.log(`✅ [API] Response from ${endpoint}: ${result.length} services with pricing data`);
      return result;
    } catch (error) {
      console.error(`❌ [API] Error fetching ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Get service config by ID
   */
  async getById(id: string) {
    return apiClient.get<ServiceConfig>(`/api/service-configs/${id}`);
  },

  /**
   * Get latest config for a service
   */
  async getLatest(serviceId: string) {
    return apiClient.get<ServiceConfig>(`/api/service-configs/service/${serviceId}/latest`);
  },

  /**
   * Full replace of service config
   */
  async replace(id: string, payload: CreateServiceConfigPayload) {
    return apiClient.put<ServiceConfig>(`/api/service-configs/${id}`, payload);
  },

  /**
   * Partial update of service config
   */
  async update(id: string, payload: UpdateServiceConfigPayload) {
    return apiClient.put<ServiceConfig>(`/api/service-configs/${id}/partial`, payload);
  },
};
