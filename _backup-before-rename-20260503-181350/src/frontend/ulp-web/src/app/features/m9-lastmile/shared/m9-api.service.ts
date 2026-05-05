import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CodDto, CodSettledStatus, CourierBookingDetailDto, CourierBookingDto,
  CourierBookingStatus, CourierType, DeliveryAttemptDto, ManifestDto,
  PodDto, RouteDetailDto, RouteDto, ZoneRateDto,
} from './m9-types';

@Injectable({ providedIn: 'root' })
export class M9ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/m9`;

  listBookings(opts: {
    status?: CourierBookingStatus; courierType?: CourierType;
    countryCode?: string; page?: number; pageSize?: number;
  } = {}): Promise<CourierBookingDto[]> {
    let p = new HttpParams();
    if (opts.status)      p = p.set('status', opts.status);
    if (opts.courierType) p = p.set('courierType', opts.courierType);
    if (opts.countryCode) p = p.set('countryCode', opts.countryCode);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<CourierBookingDto[]>(`${this.base}/bookings`, { params: p }));
  }

  getBooking(id: number): Promise<CourierBookingDetailDto> {
    return firstValueFrom(this.http.get<CourierBookingDetailDto>(`${this.base}/bookings/${id}`));
  }

  listRoutes(): Promise<RouteDto[]> {
    return firstValueFrom(this.http.get<RouteDto[]>(`${this.base}/routes`));
  }

  getRoute(id: number): Promise<RouteDetailDto> {
    return firstValueFrom(this.http.get<RouteDetailDto>(`${this.base}/routes/${id}`));
  }

  listManifests(): Promise<ManifestDto[]> {
    return firstValueFrom(this.http.get<ManifestDto[]>(`${this.base}/manifests`));
  }

  listPods(bookingId?: number): Promise<PodDto[]> {
    let p = new HttpParams();
    if (bookingId) p = p.set('bookingId', String(bookingId));
    return firstValueFrom(this.http.get<PodDto[]>(`${this.base}/pods`, { params: p }));
  }

  listCod(status?: CodSettledStatus): Promise<CodDto[]> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return firstValueFrom(this.http.get<CodDto[]>(`${this.base}/cod`, { params: p }));
  }

  listAttempts(bookingId: number): Promise<DeliveryAttemptDto[]> {
    const p = new HttpParams().set('bookingId', String(bookingId));
    return firstValueFrom(this.http.get<DeliveryAttemptDto[]>(`${this.base}/attempts`, { params: p }));
  }

  listZoneRates(opts: { countryCode?: string; courierType?: CourierType } = {}): Promise<ZoneRateDto[]> {
    let p = new HttpParams();
    if (opts.countryCode) p = p.set('countryCode', opts.countryCode);
    if (opts.courierType) p = p.set('courierType', opts.courierType);
    return firstValueFrom(this.http.get<ZoneRateDto[]>(`${this.base}/zone-rates`, { params: p }));
  }
}
