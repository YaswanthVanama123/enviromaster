// src/backendservice/hooks/useProductCatalog.ts

import { useState, useEffect, useCallback } from "react";
import { productCatalogApi } from "../api";
import type { ProductCatalog, CreateProductCatalogPayload, UpdateProductCatalogPayload } from "../types/productCatalog.types";

export function useProductCatalog() {
  const [catalogs, setCatalogs] = useState<ProductCatalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await productCatalogApi.getAll();

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setCatalogs(response.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const createCatalog = async (payload: CreateProductCatalogPayload) => {
    setLoading(true);
    setError(null);

    const response = await productCatalogApi.create(payload);

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return { success: false, error: response.error };
    }

    await fetchCatalogs();
    setLoading(false);
    return { success: true, data: response.data };
  };

  const updateCatalog = async (id: string, payload: UpdateProductCatalogPayload) => {
    setLoading(true);
    setError(null);

    const response = await productCatalogApi.update(id, payload);

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return { success: false, error: response.error };
    }

    await fetchCatalogs();
    setLoading(false);
    return { success: true, data: response.data };
  };

  return {
    catalogs,
    loading,
    error,
    fetchCatalogs,
    createCatalog,
    updateCatalog,
  };
}

export function useActiveProductCatalog() {
  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await productCatalogApi.getActive();

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setCatalog(response.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActiveCatalog();
  }, [fetchActiveCatalog]);

  return {
    catalog,
    loading,
    error,
    refetch: fetchActiveCatalog,
  };
}
