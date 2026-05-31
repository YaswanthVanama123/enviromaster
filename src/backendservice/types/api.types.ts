
export interface AdminUser {
  id: string;
  username: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface Employee {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  isActive: boolean;
  lastLoginAt?: string;
  role: UserRole;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  role: UserRole;
  
  admin?: AdminUser;
}

export interface ApiError {
  message: string;
  details?: string[];
  error?: string;
  detail?: string;
}

export interface UserListItem {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  role: UserRole;
}

export interface CreateAdminPayload {
  username: string;
  password: string;
  isActive?: boolean;
}

export interface CreateEmployeePayload {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  fullName?: string;
  email?: string;
  isActive?: boolean;
}

export interface ResetPasswordPayload {
  newPassword: string;
}

export interface UserListResponse {
  success: boolean;
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
