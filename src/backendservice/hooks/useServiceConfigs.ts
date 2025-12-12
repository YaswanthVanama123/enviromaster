// src/backendservice/hooks/useServiceConfigs.ts

import { useState, useEffect, useCallback } from "react";
import { serviceConfigApi } from "../api";
import type { ServiceConfig, CreateServiceConfigPayload, UpdateServiceConfigPayload } from "../types/serviceConfig.types";

export function useServiceConfigs(serviceId?: string) {
  const [configs, setConfigs] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await serviceConfigApi.getAll(serviceId);

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setConfigs(response.data);
    }

    setLoading(false);
  }, [serviceId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const createConfig = async (payload: CreateServiceConfigPayload) => {
    setLoading(true);
    setError(null);

    const response = await serviceConfigApi.create(payload);

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return { success: false, error: response.error };
    }

    await fetchConfigs();
    setLoading(false);
    return { success: true, data: response.data };
  };

  const updateConfig = async (id: string, payload: UpdateServiceConfigPayload) => {
    setLoading(true);
    setError(null);

    const response = await serviceConfigApi.update(id, payload);

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return { success: false, error: response.error };
    }

    await fetchConfigs();
    setLoading(false);
    return { success: true, data: response.data };
  };

  return {
    configs,
    loading,
    error,
    fetchConfigs,
    createConfig,
    updateConfig,
  };
}

export function useActiveServiceConfig(serviceId?: string) {
  const [config, setConfig] = useState<ServiceConfig | ServiceConfig[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await serviceConfigApi.getActive(serviceId);

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setConfig(response.data);
    }

    setLoading(false);
  }, [serviceId]);

  useEffect(() => {
    fetchActiveConfig();
  }, [fetchActiveConfig]);

  return {
    config,
    loading,
    error,
    refetch: fetchActiveConfig,
  };
}

/**
 * Hook to fetch all service pricing data (both active and inactive).
 * This replaces static fallback values for inactive services with real backend data.
 */
export function useAllServicePricing() {
  const [pricingData, setPricingData] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllPricing = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await serviceConfigApi.getAllPricing();

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setPricingData(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pricing data");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllPricing();
  }, [fetchAllPricing]);

  // Helper function to get pricing config for a specific service
  const getPricingForService = useCallback((serviceId: string): ServiceConfig | null => {
    return pricingData.find(config => config.serviceId === serviceId) || null;
  }, [pricingData]);

  return {
    pricingData,
    loading,
    error,
    refetch: fetchAllPricing,
    getPricingForService,
  };
}
