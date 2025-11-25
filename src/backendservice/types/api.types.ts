// src/backendservice/types/api.types.ts

export interface AdminUser {
  id: string;
  username: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  admin: AdminUser;
}

export interface ApiError {
  message: string;
  details?: string[];
}
