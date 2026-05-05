import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DocumentDto, StorageQuotaDto, UploadCompleteRequest,
  UploadInitRequest, UploadInitResponse,
} from './document-management-types';

@Injectable({ providedIn: 'root' })
export class DocumentManagementApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/document-management`;

  list(opts: {
    moduleCode?: string;
    moduleEntityType?: string;
    moduleEntityId?: number;
    classCode?: string;
    includeDeleted?: boolean;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ items: DocumentDto[]; total: number }> {
    let p = new HttpParams();
    if (opts.moduleCode)        p = p.set('moduleCode', opts.moduleCode);
    if (opts.moduleEntityType)  p = p.set('moduleEntityType', opts.moduleEntityType);
    if (opts.moduleEntityId)    p = p.set('moduleEntityId', String(opts.moduleEntityId));
    if (opts.classCode)         p = p.set('classCode', opts.classCode);
    if (opts.includeDeleted)    p = p.set('includeDeleted', 'true');
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<any>(`${this.base}/documents`, { params: p }));
  }

  initUpload(req: UploadInitRequest): Promise<UploadInitResponse> {
    return firstValueFrom(this.http.post<UploadInitResponse>(`${this.base}/documents/upload-init`, req));
  }

  completeUpload(ulid: string, req: UploadCompleteRequest): Promise<DocumentDto> {
    return firstValueFrom(this.http.post<DocumentDto>(`${this.base}/documents/${ulid}/upload-complete`, req));
  }

  getDownloadUrl(ulid: string, expireSeconds = 300): Promise<{ url: string }> {
    const p = new HttpParams().set('expireSeconds', String(expireSeconds));
    return firstValueFrom(this.http.get<{ url: string }>(`${this.base}/documents/${ulid}/download`, { params: p }));
  }

  softDelete(ulid: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/documents/${ulid}`));
  }

  restore(ulid: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/documents/${ulid}/restore`, {}));
  }

  getQuota(): Promise<StorageQuotaDto> {
    return firstValueFrom(this.http.get<StorageQuotaDto>(`${this.base}/storage/quota`));
  }

  /**
   * Direct PUT to MinIO via the presigned URL. Does NOT go through HttpClient
   * because we don't want the auth interceptor adding our JWT to a presigned URL.
   * Computes SHA-256 of the file before send so the server can verify on complete.
   */
  async uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!res.ok) throw new Error(`MinIO upload failed: ${res.status} ${res.statusText}`);
  }

  async sha256Hex(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
