// src/backendservice/types/serviceConfig.types.ts

export interface ServiceImage {
  url: string;
  caption?: string;
}

export interface ServiceLink {
  label: string;
  url: string;
}

export interface ServiceConfig {
  _id?: string;
  serviceId: string;
  version: string;
  label: string;
  description: string;
  config: Record<string, any>;
  defaultFormState?: Record<string, any>;
  isActive: boolean;
  adminByDisplay?: boolean;
  tags?: string[];
  images?: ServiceImage[];
  links?: ServiceLink[];
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
  images?: ServiceImage[];
  links?: ServiceLink[];
}

export interface UpdateServiceConfigPayload {
  serviceId?: string;
  version?: string;
  label?: string;
  description?: string;
  config?: Record<string, any>;
  defaultFormState?: Record<string, any>;
  isActive?: boolean;
  adminByDisplay?: boolean;
  tags?: string[];
  images?: ServiceImage[];
  links?: ServiceLink[];
}
