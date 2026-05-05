import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  GrnDto, InvoiceMatchDto, PoDetailDto, PoDto, PoStatus,
  PrDetailDto, PrDto, PrStatus, RfqDetailDto, RfqDto,
} from './m7-types';

@Injectable({ providedIn: 'root' })
export class M7ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/m7`;

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

  /* RFQs */
  listRfqs(): Promise<RfqDto[]> {
    return firstValueFrom(this.http.get<RfqDto[]>(`${this.base}/rfqs`));
  }

  getRfq(id: number): Promise<RfqDetailDto> {
    return firstValueFrom(this.http.get<RfqDetailDto>(`${this.base}/rfqs/${id}`));
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

  /* GRNs */
  listGrns(poId?: number): Promise<GrnDto[]> {
    let p = new HttpParams();
    if (poId) p = p.set('poId', String(poId));
    return firstValueFrom(this.http.get<GrnDto[]>(`${this.base}/grns`, { params: p }));
  }

  /* Invoice matches */
  listMatches(poId?: number): Promise<InvoiceMatchDto[]> {
    let p = new HttpParams();
    if (poId) p = p.set('poId', String(poId));
    return firstValueFrom(this.http.get<InvoiceMatchDto[]>(`${this.base}/invoice-matches`, { params: p }));
  }
}
