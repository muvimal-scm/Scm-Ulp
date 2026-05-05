import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ActivityDto, CampaignDto, CreateActivityRequest, CreateCampaignRequest,
  CreateLeadRequest, CreateOpportunityRequest, CreateRfqLineRequest,
  CreateRfqRequest, CreateRfqResponseRequest, LeadDto, LeadSource, LeadStage,
  OpportunityDetailDto, OpportunityDto, OppStage, PipelineStageDto,
  RelatedTo, RfqLineDto, RfqRequestDetailDto, RfqRequestDto, RfqResponseDto,
  UpdateLeadRequest, UpdateOpportunityRequest,
} from './sales-types';

@Injectable({ providedIn: 'root' })
export class SalesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/sales`;

  /* Leads */
  listLeads(opts: {
    stage?: LeadStage; source?: LeadSource; countryCode?: string;
    page?: number; pageSize?: number;
  } = {}): Promise<LeadDto[]> {
    let p = new HttpParams();
    if (opts.stage)       p = p.set('stage', opts.stage);
    if (opts.source)      p = p.set('source', opts.source);
    if (opts.countryCode) p = p.set('countryCode', opts.countryCode);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<LeadDto[]>(`${this.base}/leads`, { params: p }));
  }

  getLead(id: number): Promise<LeadDto> {
    return firstValueFrom(this.http.get<LeadDto>(`${this.base}/leads/${id}`));
  }

  changeLeadStage(id: number, newStage: LeadStage): Promise<LeadDto> {
    return firstValueFrom(this.http.post<LeadDto>(`${this.base}/leads/${id}/stage`, { newStage }));
  }

  createLead(req: CreateLeadRequest): Promise<LeadDto> {
    return firstValueFrom(this.http.post<LeadDto>(`${this.base}/leads`, req));
  }

  updateLead(id: number, req: UpdateLeadRequest): Promise<LeadDto> {
    return firstValueFrom(this.http.put<LeadDto>(`${this.base}/leads/${id}`, req));
  }

  deleteLead(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/leads/${id}`));
  }

  /* Opportunities */
  listOpportunities(opts: {
    stage?: OppStage; partyId?: number; countryCode?: string;
    page?: number; pageSize?: number;
  } = {}): Promise<OpportunityDto[]> {
    let p = new HttpParams();
    if (opts.stage)       p = p.set('stage', opts.stage);
    if (opts.partyId)     p = p.set('partyId', String(opts.partyId));
    if (opts.countryCode) p = p.set('countryCode', opts.countryCode);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<OpportunityDto[]>(`${this.base}/opportunities`, { params: p }));
  }

  getOpportunity(id: number): Promise<OpportunityDetailDto> {
    return firstValueFrom(this.http.get<OpportunityDetailDto>(`${this.base}/opportunities/${id}`));
  }

  changeOpportunityStage(id: number, newStage: OppStage): Promise<OpportunityDto> {
    return firstValueFrom(this.http.post<OpportunityDto>(`${this.base}/opportunities/${id}/stage`, { newStage }));
  }

  createOpportunity(req: CreateOpportunityRequest): Promise<OpportunityDto> {
    return firstValueFrom(this.http.post<OpportunityDto>(`${this.base}/opportunities`, req));
  }

  updateOpportunity(id: number, req: UpdateOpportunityRequest): Promise<OpportunityDto> {
    return firstValueFrom(this.http.put<OpportunityDto>(`${this.base}/opportunities/${id}`, req));
  }

  deleteOpportunity(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/opportunities/${id}`));
  }

  /* Activities */
  listActivities(opts: {
    relatedTo?: RelatedTo; relatedId?: number;
    page?: number; pageSize?: number;
  } = {}): Promise<ActivityDto[]> {
    let p = new HttpParams();
    if (opts.relatedTo) p = p.set('relatedTo', opts.relatedTo);
    if (opts.relatedId) p = p.set('relatedId', String(opts.relatedId));
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<ActivityDto[]>(`${this.base}/activities`, { params: p }));
  }

  createActivity(req: CreateActivityRequest): Promise<ActivityDto> {
    return firstValueFrom(this.http.post<ActivityDto>(`${this.base}/activities`, req));
  }

  /* Campaigns */
  listCampaigns(): Promise<CampaignDto[]> {
    return firstValueFrom(this.http.get<CampaignDto[]>(`${this.base}/campaigns`));
  }

  createCampaign(req: CreateCampaignRequest): Promise<CampaignDto> {
    return firstValueFrom(this.http.post<CampaignDto>(`${this.base}/campaigns`, req));
  }

  /* RFQs */
  listRfqs(): Promise<RfqRequestDto[]> {
    return firstValueFrom(this.http.get<RfqRequestDto[]>(`${this.base}/rfqs`));
  }

  getRfq(id: number): Promise<RfqRequestDetailDto> {
    return firstValueFrom(this.http.get<RfqRequestDetailDto>(`${this.base}/rfqs/${id}`));
  }

  createRfq(req: CreateRfqRequest): Promise<RfqRequestDto> {
    return firstValueFrom(this.http.post<RfqRequestDto>(`${this.base}/rfqs`, req));
  }

  addRfqLine(rfqId: number, req: CreateRfqLineRequest): Promise<RfqLineDto> {
    return firstValueFrom(this.http.post<RfqLineDto>(`${this.base}/rfqs/${rfqId}/lines`, req));
  }

  addRfqResponse(rfqId: number, req: CreateRfqResponseRequest): Promise<RfqResponseDto> {
    return firstValueFrom(this.http.post<RfqResponseDto>(`${this.base}/rfqs/${rfqId}/responses`, req));
  }

  /* Read-only */
  listPipelineStages(): Promise<PipelineStageDto[]> {
    return firstValueFrom(this.http.get<PipelineStageDto[]>(`${this.base}/pipeline-stages`));
  }
}
