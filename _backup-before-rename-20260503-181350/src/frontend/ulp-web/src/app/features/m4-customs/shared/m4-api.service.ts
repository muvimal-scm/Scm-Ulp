import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AbiMessageDto, AbiStatus, AtmDto, BondDto, EntryDetailDto, EntryDto,
  HoldExamDto, InBondDto, IsfDto, PgaHoldDto, ReleaseOrderDto,
} from './m4-types';

@Injectable({ providedIn: 'root' })
export class M4ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/m4`;

  listEntries(opts: { status?: AbiStatus; pgaHoldOnly?: boolean; page?: number; pageSize?: number } = {}): Promise<EntryDto[]> {
    let p = new HttpParams();
    if (opts.status) p = p.set('status', opts.status);
    if (opts.pgaHoldOnly !== undefined) p = p.set('pgaHoldOnly', String(opts.pgaHoldOnly));
    p = p.set('page', String(opts.page ?? 1)).set('pageSize', String(opts.pageSize ?? 100));
    return firstValueFrom(this.http.get<EntryDto[]>(`${this.base}/entries`, { params: p }));
  }
  getEntry(id: number): Promise<EntryDetailDto> {
    return firstValueFrom(this.http.get<EntryDetailDto>(`${this.base}/entries/${id}`));
  }
  listBonds(): Promise<BondDto[]>                { return firstValueFrom(this.http.get<BondDto[]>(`${this.base}/bonds`)); }
  listAtm(): Promise<AtmDto[]>                   { return firstValueFrom(this.http.get<AtmDto[]>(`${this.base}/atm`)); }
  listReleaseOrders(entryId?: number): Promise<ReleaseOrderDto[]> {
    let p = new HttpParams(); if (entryId) p = p.set('entryId', String(entryId));
    return firstValueFrom(this.http.get<ReleaseOrderDto[]>(`${this.base}/release-orders`, { params: p }));
  }
  listIsf(): Promise<IsfDto[]>                   { return firstValueFrom(this.http.get<IsfDto[]>(`${this.base}/isf`)); }
  listPgaHolds(activeOnly = true): Promise<PgaHoldDto[]> {
    const p = new HttpParams().set('activeOnly', String(activeOnly));
    return firstValueFrom(this.http.get<PgaHoldDto[]>(`${this.base}/pga-holds`, { params: p }));
  }
  listHoldExams(openOnly = true): Promise<HoldExamDto[]> {
    const p = new HttpParams().set('openOnly', String(openOnly));
    return firstValueFrom(this.http.get<HoldExamDto[]>(`${this.base}/hold-exams`, { params: p }));
  }
  listInBondMoves(): Promise<InBondDto[]>        { return firstValueFrom(this.http.get<InBondDto[]>(`${this.base}/in-bond`)); }
  listAbiMessages(entryId?: number): Promise<AbiMessageDto[]> {
    let p = new HttpParams(); if (entryId) p = p.set('entryId', String(entryId));
    return firstValueFrom(this.http.get<AbiMessageDto[]>(`${this.base}/abi-messages`, { params: p }));
  }
}
