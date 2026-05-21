import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateGrnRequest, CreatePoLineRequest, CreatePoRequest, CreatePrLineRequest, CreatePrRequest,
  CreateRfqRequest, GrnDto, InvoiceMatchDto, PoDetailDto, PoDto, PoLineDto, PoStatus,
  PrDetailDto, PrDto, PrLineDto, PrStatus, RfqDetailDto, RfqDto,
} from './procurement-types';

@Injectable({ providedIn: 'root' })
export class ProcurementApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/procurement`;

  /* PRs */
  listPrs(opts: { status?: PrStatus; countryCode?: string; page?: number; pageSize?: number; } = {}): Promise<PrDto[]> {
    let p = new HttpParams();
    if (opts.status)      p = p.set('status', opts.status);
    if (opts.countryCode) p = p.set('countryCode', opts.countryCode);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<PrDto[]>(`${this.base}/purchase-requests`, { params: p }));
  }

  getPr(id: number): Promise<PrDetailDto> {
    return firstValueFrom(this.http.get<PrDetailDto>(`${this.base}/purchase-requests/${id}`));
  }

  createPr(req: CreatePrRequest): Promise<PrDto> {
    return firstValueFrom(this.http.post<PrDto>(`${this.base}/purchase-requests`, req));
  }

  addPrLine(prId: number, req: CreatePrLineRequest): Promise<PrLineDto> {
    return firstValueFrom(this.http.post<PrLineDto>(`${this.base}/purchase-requests/${prId}/lines`, req));
  }

  /* RFQs */
  listRfqs(): Promise<RfqDto[]> {
    return firstValueFrom(this.http.get<RfqDto[]>(`${this.base}/rfqs`));
  }

  getRfq(id: number): Promise<RfqDetailDto> {
    return firstValueFrom(this.http.get<RfqDetailDto>(`${this.base}/rfqs/${id}`));
  }

  createRfq(req: CreateRfqRequest): Promise<RfqDto> {
    return firstValueFrom(this.http.post<RfqDto>(`${this.base}/rfqs`, req));
  }

  /* POs */
  listPos(opts: {
    status?: PoStatus; vendorPartyId?: number;
    countryCode?: string; page?: number; pageSize?: number;
  } = {}): Promise<PoDto[]> {
    let p = new HttpParams();
    if (opts.status)        p = p.set('status', opts.status);
    if (opts.vendorPartyId) p = p.set('vendorPartyId', String(opts.vendorPartyId));
    if (opts.countryCode)   p = p.set('countryCode', opts.countryCode);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<PoDto[]>(`${this.base}/purchase-orders`, { params: p }));
  }

  getPo(id: number): Promise<PoDetailDto> {
    return firstValueFrom(this.http.get<PoDetailDto>(`${this.base}/purchase-orders/${id}`));
  }

  createPo(req: CreatePoRequest): Promise<PoDto> {
    return firstValueFrom(this.http.post<PoDto>(`${this.base}/purchase-orders`, req));
  }

  addPoLine(poId: number, req: CreatePoLineRequest): Promise<PoLineDto> {
    return firstValueFrom(this.http.post<PoLineDto>(`${this.base}/purchase-orders/${poId}/lines`, req));
  }

  changePoStatus(id: number, newStatus: PoStatus): Promise<PoDto> {
    return firstValueFrom(this.http.post<PoDto>(`${this.base}/purchase-orders/${id}/status`, { newStatus }));
  }

  recordMatch(req: { poId: number; vendorInvoiceNo?: string; status: string; varianceAmount?: number; varianceCurrency?: string; notes?: string }): Promise<InvoiceMatchDto> {
    return firstValueFrom(this.http.post<InvoiceMatchDto>(`${this.base}/invoice-matches`, req));
  }

  /* GRNs */
  listGrns(poId?: number): Promise<GrnDto[]> {
    let p = new HttpParams();
    if (poId) p = p.set('poId', String(poId));
    return firstValueFrom(this.http.get<GrnDto[]>(`${this.base}/grns`, { params: p }));
  }

  createGrn(req: CreateGrnRequest): Promise<GrnDto> {
    return firstValueFrom(this.http.post<GrnDto>(`${this.base}/grns`, req));
  }

  /* Invoice matches */
  listMatches(poId?: number): Promise<InvoiceMatchDto[]> {
    let p = new HttpParams();
    if (poId) p = p.set('poId', String(poId));
    return firstValueFrom(this.http.get<InvoiceMatchDto[]>(`${this.base}/invoice-matches`, { params: p }));
  }
}
