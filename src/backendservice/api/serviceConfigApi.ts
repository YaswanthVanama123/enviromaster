
import { apiClient } from "../utils/apiClient";
import type {
  ServiceConfig,
  CreateServiceConfigPayload,
  UpdateServiceConfigPayload,
} from "../types/serviceConfig.types";
import type { ServiceAgreementTemplate } from "./serviceAgreementTemplateApi";

export interface ServicePricingWithTemplateResponse {
  serviceConfigs: ServiceConfig[];
  serviceAgreementTemplate: ServiceAgreementTemplate;
}

export const serviceConfigApi = {
  async create(payload: CreateServiceConfigPayload) {
    return apiClient.post<ServiceConfig>("/api/service-configs", payload);
  },

  async getAll(serviceId?: string) {
    const endpoint = serviceId
      ? `/api/service-configs?serviceId=${serviceId}`
      : "/api/service-configs";
    return apiClient.get<ServiceConfig[]>(endpoint);
  },

  async getActive(serviceId?: string) {
    const endpoint = serviceId
      ? `/api/service-configs/active?serviceId=${serviceId}`
      : "/api/service-configs/active";

    console.log(`🌐 [API] GET ${endpoint}`);

    try {
      const result = await apiClient.get<ServiceConfig | ServiceConfig[]>(endpoint);
      console.log(`✅ [API] Response from ${endpoint}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ [API] Error fetching ${endpoint}:`, error);
      throw error;
    }
  },

  async getAllPricing() {
    const endpoint = "/api/service-configs/pricing";
    console.log(`⚡ [API] GET ${endpoint} (fetching all service pricing data + service agreement template)`);

    try {
      const result = await apiClient.get<ServicePricingWithTemplateResponse>(endpoint);
      console.log(`✅ [API] Response from ${endpoint}: ${result.data?.serviceConfigs?.length} services + service agreement template`);
      return result.data!;
    } catch (error) {
      console.error(`❌ [API] Error fetching ${endpoint}:`, error);
      throw error;
    }
  },

  async getById(id: string) {
    return apiClient.get<ServiceConfig>(`/api/service-configs/${id}`);
  },

  async getLatest(serviceId: string) {
    return apiClient.get<ServiceConfig>(`/api/service-configs/service/${serviceId}/latest`);
  },

  async replace(id: string, payload: CreateServiceConfigPayload) {
    return apiClient.put<ServiceConfig>(`/api/service-configs/${id}`, payload);
  },

  async update(id: string, payload: UpdateServiceConfigPayload) {
    return apiClient.put<ServiceConfig>(`/api/service-configs/${id}/partial`, payload);
  },

  async uploadImage(id: string, file: File, caption = ""): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("caption", caption);
    const token = apiClient.getToken();
    const baseUrl = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000";
    const res = await fetch(`${baseUrl}/api/service-configs/${id}/upload-image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    const json = await res.json();
    return { url: json.url };
  },
};
