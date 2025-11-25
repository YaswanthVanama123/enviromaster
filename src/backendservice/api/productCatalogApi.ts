// src/backendservice/api/productCatalogApi.ts

import { apiClient } from "../utils/apiClient";
import type {
  ProductCatalog,
  CreateProductCatalogPayload,
  UpdateProductCatalogPayload,
} from "../types/productCatalog.types";

export const productCatalogApi = {
  /**
   * Create a new product catalog
   */
  async create(payload: CreateProductCatalogPayload) {
    return apiClient.post<ProductCatalog>("/api/product-catalog", payload);
  },

  /**
   * Get active product catalog
   */
  async getActive() {
    return apiClient.get<ProductCatalog>("/api/product-catalog/active");
  },

  /**
   * Get all product catalogs
   */
  async getAll() {
    return apiClient.get<ProductCatalog[]>("/api/product-catalog");
  },

  /**
   * Get product catalog by ID
   */
  async getById(id: string) {
    return apiClient.get<ProductCatalog>(`/api/product-catalog/${id}`);
  },

  /**
   * Update product catalog
   */
  async update(id: string, payload: UpdateProductCatalogPayload) {
    return apiClient.put<ProductCatalog>(`/api/product-catalog/${id}`, payload);
  },

  /**
   * Full replace of product catalog
   */
  async replace(id: string, payload: CreateProductCatalogPayload) {
    return apiClient.put<ProductCatalog>(`/api/product-catalog/${id}`, payload);
  },
};
