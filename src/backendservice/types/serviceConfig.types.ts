// src/backendservice/types/serviceConfig.types.ts

export interface ServiceConfig {
  _id?: string;
  serviceId: string;
  version: string;
  label: string;
  description: string;
  config: Record<string, any>;
  defaultFormState?: Record<string, any>;
  isActive: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateServiceConfigPayload {
  serviceId: string;
  version: string;
  label: string;
  description: string;
  config: Record<string, any>;
  defaultFormState?: Record<string, any>;
  isActive?: boolean;
  tags?: string[];
}

export interface UpdateServiceConfigPayload {
  serviceId?: string;
  version?: string;
  label?: string;
  description?: string;
  config?: Record<string, any>;
  defaultFormState?: Record<string, any>;
  isActive?: boolean;
  tags?: string[];
}
