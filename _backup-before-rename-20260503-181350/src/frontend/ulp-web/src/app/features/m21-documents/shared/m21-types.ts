export interface DocumentDto {
  ulid: string;
  id: number;
  tenantId: number;
  classCode: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  container: string;
  objectKey: string;
  versionNumber: number;
  isImmutable: boolean;
  retainUntil: string | null;
  isDeleted: boolean;
  moduleCode: string;
  moduleEntityType: string | null;
  moduleEntityId: number | null;
  createdAt: string;
  modifiedAt: string;
}

export interface UploadInitRequest {
  classCode: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  moduleCode: string;
  moduleEntityType?: string | null;
  moduleEntityId?: number | null;
}

export interface UploadInitResponse {
  ulid: string;
  container: string;
  objectKey: string;
  uploadUrl: string;
  uploadUrlExpiresAt: string;
}

export interface UploadCompleteRequest {
  checksumSha256: string;
  sizeBytes: number;
}

export interface StorageQuotaDto {
  tenantId: number;
  bytesUsed: number;
  bytesQuota: number;
  documentsCount: number;
  percentUsed: number;
  lastRecomputedAt: string;
}
