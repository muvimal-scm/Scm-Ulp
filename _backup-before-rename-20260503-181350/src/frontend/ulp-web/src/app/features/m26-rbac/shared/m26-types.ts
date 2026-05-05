// Mirrors Ulp.M26.Application contract DTOs.

export interface UserDto {
  id: number;
  tenantId: number;
  email: string;
  displayName: string;
  countryCode: string;
  status: 'Active' | 'Invited' | 'Suspended' | 'Deactivated';
  roles: string[];
  permissions: string[];
}

export interface BriefUser {
  id: number;
  tenantId: number;
  email: string;
  displayName: string;
  countryCode: string;
  status: string;
  preferredLocale?: string | null;
  preferredTimezone?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface RoleDto {
  id: number;
  tenantId: number | null;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: string[];
}

export interface PermissionDto {
  id: number;
  code: string;
  description: string;
}

export interface InviteUserRequest {
  email: string;
  displayName: string;
  countryCode: string;
  roleIds: number[];
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
  permissionIds: number[];
}

export interface ApiKeyRow {
  id: number;
  name: string;
  keyPrefix: string;
  isRevoked: boolean;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expiresAt?: string | null;
}

export interface CreatedApiKeyResponse {
  id: number;
  name: string;
  rawKey: string;          // shown ONCE; never returned again
  prefix: string;
  expiresAt: string | null;
}
