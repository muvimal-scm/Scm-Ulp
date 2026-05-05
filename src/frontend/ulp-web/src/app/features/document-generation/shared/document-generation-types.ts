/**
 * M6 Doc Generation â€” DTOs that mirror src/backend/.../Ulp.DocumentGeneration.Application/Contracts.cs.
 * Phase 2.0 supports HTML rendering via Scriban; PDF lands in Phase 2.1.
 */

export type TemplateType    = 'HTML' | 'PDF' | 'TEXT' | 'XLSX' | 'CSV';
export type RenderingEngine = 'SCRIBAN' | 'HANDLEBARS';
export type RenderStatus    = 'Queued' | 'Rendering' | 'Completed' | 'Failed';
export type TemplateFieldType = 'STRING' | 'NUMBER' | 'BOOL' | 'DATE' | 'CURRENCY' | 'OBJECT';

export interface TemplateDto {
  id: number;
  tenantId: number | null;
  code: string;
  countryCode: string | null;
  name: string;
  description: string | null;
  templateType: TemplateType;
  renderingEngine: RenderingEngine;
  isActive: boolean;
  version: number;
  createdAt: string;
  modifiedAt: string;
}

export interface TemplateVersionDto {
  id: number;
  versionNumber: number;
  body: string;
  layoutJson: string | null;
  createdBy: number;
  createdAt: string;
  comment: string | null;
}

export interface TemplateFieldDto {
  fieldName: string;
  fieldType: TemplateFieldType;
  isRequired: boolean;
  defaultValue: string | null;
  sourceModule: string | null;
  sourcePath: string | null;
}

export interface TemplateDetailDto {
  template: TemplateDto;
  versions: TemplateVersionDto[];
  fields:   TemplateFieldDto[];
}

export interface RenderApiRequest {
  code:           string;
  countryCode:    string | null;
  sourceModule:   string;
  sourceEntityId: number | null;
  payload:        Record<string, unknown>;
}

/* ===================== Request DTOs (mirror Ulp.DocumentGeneration.Application) ===================== */

export interface CreateTemplateRequest {
  code: string;
  countryCode?: string | null;
  name: string;
  description?: string | null;
  templateType: TemplateType;
  renderingEngine: RenderingEngine;
  body: string;
}

export interface AddVersionRequest {
  body: string;
  layoutJson?: string | null;
  comment?: string | null;
}

export interface RenderResponseDto {
  ulid:         string;
  status:       RenderStatus;
  outputFormat: TemplateType;
  body:         string | null;
  durationMs:   number | null;
  error:        string | null;
}

export interface RenderRequestDto {
  id:             number;
  ulid:           string;
  templateId:     number;
  sourceModule:   string;
  sourceEntityId: number | null;
  outputFormat:   TemplateType;
  status:         RenderStatus;
  durationMs:     number | null;
  requestedAt:    string;
  completedAt:    string | null;
}
