
import { apiClient } from "../utils/apiClient";
import type {
  ProductCatalog,
  CreateProductCatalogPayload,
  UpdateProductCatalogPayload,
} from "../types/productCatalog.types";

export const productCatalogApi = {
  async create(payload: CreateProductCatalogPayload) {
    return apiClient.post<ProductCatalog>("/api/product-catalog", payload);
  },

  async getActive() {
    return apiClient.get<ProductCatalog>("/api/product-catalog/active");
  },

  async getAll() {
    return apiClient.get<ProductCatalog[]>("/api/product-catalog");
  },

  async getById(id: string) {
    return apiClient.get<ProductCatalog>(`/api/product-catalog/${id}`);
  },

  async update(id: string, payload: UpdateProductCatalogPayload) {
    return apiClient.put<ProductCatalog>(`/api/product-catalog/${id}`, payload);
  },

  async replace(id: string, payload: CreateProductCatalogPayload) {
    return apiClient.put<ProductCatalog>(`/api/product-catalog/${id}`, payload);
  },
};
