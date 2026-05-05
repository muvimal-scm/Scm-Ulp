import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ActivityDto, CampaignDto, LeadDto, LeadSource, LeadStage,
  OpportunityDetailDto, OpportunityDto, OppStage, PipelineStageDto,
  RelatedTo, RfqRequestDetailDto, RfqRequestDto,
} from './m2-types';

@Injectable({ providedIn: 'root' })
export class M2ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/m2`;

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

  /* Campaigns */
  listCampaigns(): Promise<CampaignDto[]> {
    return firstValueFrom(this.http.get<CampaignDto[]>(`${this.base}/campaigns`));
  }

  /* RFQs */
  listRfqs(): Promise<RfqRequestDto[]> {
    return firstValueFrom(this.http.get<RfqRequestDto[]>(`${this.base}/rfqs`));
  }

  getRfq(id: number): Promise<RfqRequestDetailDto> {
    return firstValueFrom(this.http.get<RfqRequestDetailDto>(`${this.base}/rfqs/${id}`));
  }

  /* Read-only */
  listPipelineStages(): Promise<PipelineStageDto[]> {
    return firstValueFrom(this.http.get<PipelineStageDto[]>(`${this.base}/pipeline-stages`));
  }
}
