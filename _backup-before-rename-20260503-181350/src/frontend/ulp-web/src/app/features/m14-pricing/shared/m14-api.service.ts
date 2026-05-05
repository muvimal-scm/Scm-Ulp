import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ContractDto, CreateQuoteLineRequest, CreateQuoteRequest, CreateRateCardLineRequest,
  CreateRateCardRequest, QuoteDto, QuoteLineDto, QuoteStatus,
  RateCardDto, RateCardLineDto, RateCardStatus, RateCardType, SurchargeDto,
} from './m14-types';

@Injectable({ providedIn: 'root' })
export class M14ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/m14`;

  /* Rate cards */
  listRateCards(opts: {
    status?: RateCardStatus; cardType?: RateCardType; countryCode?: string;
    page?: number; pageSize?: number;
  } = {}): Promise<RateCardDto[]> {
    let p = new HttpParams();
    if (opts.status)      p = p.set('status', opts.status);
    if (opts.cardType)    p = p.set('cardType', opts.cardType);
    if (opts.countryCode) p = p.set('countryCode', opts.countryCode);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<RateCardDto[]>(`${this.base}/rate-cards`, { params: p }));
  }

  getRateCard(id: number): Promise<RateCardDto> {
    return firstValueFrom(this.http.get<RateCardDto>(`${this.base}/rate-cards/${id}`));
  }

  createRateCard(req: CreateRateCardRequest): Promise<RateCardDto> {
    return firstValueFrom(this.http.post<RateCardDto>(`${this.base}/rate-cards`, req));
  }

  approveRateCard(id: number): Promise<RateCardDto> {
    return firstValueFrom(this.http.post<RateCardDto>(`${this.base}/rate-cards/${id}/approve`, {}));
  }

  getRateCardLines(rateCardId: number): Promise<RateCardLineDto[]> {
    return firstValueFrom(this.http.get<RateCardLineDto[]>(`${this.base}/rate-cards/${rateCardId}/lines`));
  }

  addRateCardLine(rateCardId: number, req: CreateRateCardLineRequest): Promise<RateCardLineDto> {
    return firstValueFrom(this.http.post<RateCardLineDto>(`${this.base}/rate-cards/${rateCardId}/lines`, req));
  }

  /* Quotes */
  listQuotes(opts: {
    status?: QuoteStatus; customerPartyId?: number;
    page?: number; pageSize?: number;
  } = {}): Promise<QuoteDto[]> {
    let p = new HttpParams();
    if (opts.status)          p = p.set('status', opts.status);
    if (opts.customerPartyId) p = p.set('customerPartyId', String(opts.customerPartyId));
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<QuoteDto[]>(`${this.base}/quotes`, { params: p }));
  }

  getQuote(id: number): Promise<QuoteDto> {
    return firstValueFrom(this.http.get<QuoteDto>(`${this.base}/quotes/${id}`));
  }

  createQuote(req: CreateQuoteRequest): Promise<QuoteDto> {
    return firstValueFrom(this.http.post<QuoteDto>(`${this.base}/quotes`, req));
  }

  getQuoteLines(quoteId: number): Promise<QuoteLineDto[]> {
    return firstValueFrom(this.http.get<QuoteLineDto[]>(`${this.base}/quotes/${quoteId}/lines`));
  }

  addQuoteLine(quoteId: number, req: CreateQuoteLineRequest): Promise<QuoteLineDto> {
    return firstValueFrom(this.http.post<QuoteLineDto>(`${this.base}/quotes/${quoteId}/lines`, req));
  }

  changeQuoteStatus(id: number, newStatus: QuoteStatus): Promise<QuoteDto> {
    return firstValueFrom(this.http.post<QuoteDto>(`${this.base}/quotes/${id}/status`, { newStatus }));
  }

  /* Read-only */
  listSurcharges(): Promise<SurchargeDto[]> {
    return firstValueFrom(this.http.get<SurchargeDto[]>(`${this.base}/surcharges`));
  }

  listContracts(): Promise<ContractDto[]> {
    return firstValueFrom(this.http.get<ContractDto[]>(`${this.base}/contracts`));
  }
}
