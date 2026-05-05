import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AddVersionRequest, CreateTemplateRequest,
  RenderApiRequest, RenderRequestDto, RenderResponseDto,
  TemplateDetailDto, TemplateDto, TemplateVersionDto,
} from './document-generation-types';

@Injectable({ providedIn: 'root' })
export class DocumentGenerationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/document-generation`;

  listTemplates(channel?: string): Promise<TemplateDto[]> {
    let p = new HttpParams();
    if (channel) p = p.set('channel', channel);
    return firstValueFrom(this.http.get<TemplateDto[]>(`${this.base}/templates`, { params: p }));
  }

  getTemplate(id: number): Promise<TemplateDetailDto> {
    return firstValueFrom(this.http.get<TemplateDetailDto>(`${this.base}/templates/${id}`));
  }

  createTemplate(req: CreateTemplateRequest): Promise<TemplateDto> {
    return firstValueFrom(this.http.post<TemplateDto>(`${this.base}/templates`, req));
  }

  addVersion(templateId: number, req: AddVersionRequest): Promise<TemplateVersionDto> {
    return firstValueFrom(this.http.post<TemplateVersionDto>(`${this.base}/templates/${templateId}/versions`, req));
  }

  render(req: RenderApiRequest): Promise<RenderResponseDto> {
    return firstValueFrom(this.http.post<RenderResponseDto>(`${this.base}/render`, req));
  }

  listRenderRequests(page = 1, pageSize = 50): Promise<RenderRequestDto[]> {
    const p = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    return firstValueFrom(this.http.get<RenderRequestDto[]>(`${this.base}/render/requests`, { params: p }));
  }
}
