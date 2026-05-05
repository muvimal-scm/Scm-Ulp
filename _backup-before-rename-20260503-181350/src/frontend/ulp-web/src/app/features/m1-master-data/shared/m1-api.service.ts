import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Country, CreatePartyRequest, CreateProductRequest, Currency, Holiday,
  PagedList, Party, PartyType, Port, Product, ProductTypeKind, StateOrProvince,
  Uom, UpdatePartyRequest, UpdateProductRequest,
} from './m1-types';

/**
 * Single HTTP gateway for the M1 Master Data module.
 * Endpoints map 1:1 to /api/v1/m1/* on the .NET API.
 */
@Injectable({ providedIn: 'root' })
export class M1ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/m1`;

  /* -------- Parties -------- */

  listParties(opts: {
    partyType?: PartyType; search?: string; includeInactive?: boolean;
    page?: number; pageSize?: number;
  } = {}): Promise<PagedList<Party>> {
    let p = new HttpParams();
    if (opts.partyType) p = p.set('partyType', opts.partyType);
    if (opts.search) p = p.set('search', opts.search);
    if (opts.includeInactive) p = p.set('includeInactive', 'true');
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<PagedList<Party>>(`${this.base}/parties`, { params: p }));
  }

  getParty(id: number): Promise<Party> {
    return firstValueFrom(this.http.get<Party>(`${this.base}/parties/${id}`));
  }

  createParty(req: CreatePartyRequest): Promise<Party> {
    return firstValueFrom(this.http.post<Party>(`${this.base}/parties`, req));
  }

  updateParty(id: number, req: UpdatePartyRequest): Promise<Party> {
    return firstValueFrom(this.http.put<Party>(`${this.base}/parties/${id}`, req));
  }

  deactivateParty(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/parties/${id}`));
  }

  /* -------- Products -------- */

  listProducts(opts: {
    search?: string; countryCode?: string; productType?: ProductTypeKind;
    page?: number; pageSize?: number;
  } = {}): Promise<PagedList<Product>> {
    let p = new HttpParams();
    if (opts.search) p = p.set('search', opts.search);
    if (opts.countryCode) p = p.set('countryCode', opts.countryCode);
    if (opts.productType) p = p.set('productType', opts.productType);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<PagedList<Product>>(`${this.base}/products`, { params: p }));
  }

  getProduct(id: number): Promise<Product> {
    return firstValueFrom(this.http.get<Product>(`${this.base}/products/${id}`));
  }

  createProduct(req: CreateProductRequest): Promise<Product> {
    return firstValueFrom(this.http.post<Product>(`${this.base}/products`, req));
  }

  updateProduct(id: number, req: UpdateProductRequest): Promise<Product> {
    return firstValueFrom(this.http.put<Product>(`${this.base}/products/${id}`, req));
  }

  deleteProduct(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/products/${id}`));
  }

  /* -------- Reference -------- */

  listCountries(supportedOnly = false): Promise<Country[]> {
    const p = new HttpParams().set('supportedOnly', String(supportedOnly));
    return firstValueFrom(this.http.get<Country[]>(`${this.base}/reference/countries`, { params: p }));
  }

  listStates(countryCode: string): Promise<StateOrProvince[]> {
    return firstValueFrom(this.http.get<StateOrProvince[]>(`${this.base}/reference/countries/${countryCode}/states`));
  }

  listCurrencies(activeOnly = true): Promise<Currency[]> {
    const p = new HttpParams().set('activeOnly', String(activeOnly));
    return firstValueFrom(this.http.get<Currency[]>(`${this.base}/reference/currencies`, { params: p }));
  }

  listUoms(category?: string): Promise<Uom[]> {
    let p = new HttpParams();
    if (category) p = p.set('category', category);
    return firstValueFrom(this.http.get<Uom[]>(`${this.base}/reference/uoms`, { params: p }));
  }

  listPorts(opts: { countryCode?: string; portType?: string } = {}): Promise<Port[]> {
    let p = new HttpParams();
    if (opts.countryCode) p = p.set('countryCode', opts.countryCode);
    if (opts.portType) p = p.set('portType', opts.portType);
    return firstValueFrom(this.http.get<Port[]>(`${this.base}/reference/ports`, { params: p }));
  }

  listHolidays(countryCode: string, year: number, stateCode?: string): Promise<Holiday[]> {
    let p = new HttpParams().set('countryCode', countryCode).set('year', String(year));
    if (stateCode) p = p.set('stateCode', stateCode);
    return firstValueFrom(this.http.get<Holiday[]>(`${this.base}/reference/holidays`, { params: p }));
  }
}
