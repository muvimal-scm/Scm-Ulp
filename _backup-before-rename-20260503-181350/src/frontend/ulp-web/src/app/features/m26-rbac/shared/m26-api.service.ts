import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiKeyRow, BriefUser, CreatedApiKeyResponse, CreateApiKeyRequest, CreateRoleRequest,
  InviteUserRequest, PermissionDto, RoleDto, UserDto,
} from './m26-types';

@Injectable({ providedIn: 'root' })
export class M26ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/m26`;

  /* /me — current user + effective permissions */
  me(): Promise<UserDto> {
    return firstValueFrom(this.http.get<UserDto>(`${this.base}/me`));
  }

  /* Users */
  listUsers(opts: { search?: string; page?: number; pageSize?: number } = {}): Promise<{
    items: BriefUser[]; page: number; pageSize: number; totalCount: number;
  }> {
    let p = new HttpParams();
    if (opts.search) p = p.set('search', opts.search);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<any>(`${this.base}/users`, { params: p }));
  }

  getUser(id: number): Promise<UserDto> {
    return firstValueFrom(this.http.get<UserDto>(`${this.base}/users/${id}`));
  }

  inviteUser(req: InviteUserRequest): Promise<BriefUser> {
    return firstValueFrom(this.http.post<BriefUser>(`${this.base}/users/invite`, req));
  }

  updateUserRoles(userId: number, roleIds: number[]): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.base}/users/${userId}/roles`, { roleIds }));
  }

  deactivateUser(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/users/${id}/deactivate`, {}));
  }

  /* Roles */
  listRoles(): Promise<RoleDto[]> {
    return firstValueFrom(this.http.get<RoleDto[]>(`${this.base}/roles`));
  }

  getRole(id: number): Promise<RoleDto> {
    return firstValueFrom(this.http.get<RoleDto>(`${this.base}/roles/${id}`));
  }

  createRole(req: CreateRoleRequest): Promise<{ id: number }> {
    return firstValueFrom(this.http.post<{ id: number }>(`${this.base}/roles`, req));
  }

  updateRolePermissions(id: number, permissionIds: number[]): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.base}/roles/${id}/permissions`, { permissionIds }));
  }

  /* Permissions catalog */
  listPermissions(): Promise<PermissionDto[]> {
    return firstValueFrom(this.http.get<PermissionDto[]>(`${this.base}/permissions`));
  }

  /* API keys */
  listApiKeys(): Promise<ApiKeyRow[]> {
    return firstValueFrom(this.http.get<ApiKeyRow[]>(`${this.base}/api-keys`));
  }

  createApiKey(req: CreateApiKeyRequest): Promise<CreatedApiKeyResponse> {
    return firstValueFrom(this.http.post<CreatedApiKeyResponse>(`${this.base}/api-keys`, req));
  }

  revokeApiKey(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/api-keys/${id}`));
  }
}
