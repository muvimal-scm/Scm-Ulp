import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BookingDetailDto, BookingDto, BookingStatus, ChargeLineDto, ConsolDto,
  ContainerDto, DemurrageEventDto, HoldType, ReminderKind, ReminderStatus,
  RemindersFiredDto, ShipmentDetailDto, ShipmentDto, ShipmentHoldDto,
  ShipmentMemoDto, ShipmentReminderDto, ShipmentStatus,
  TradeDirection, TransportMode, MilestoneDto,
} from './m5-types';

@Injectable({ providedIn: 'root' })
export class M5ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/m5`;

  /* Bookings */
  listBookings(opts: {
    status?: BookingStatus; customerPartyId?: number; mode?: TransportMode;
    countryCode?: string; page?: number; pageSize?: number;
  } = {}): Promise<BookingDto[]> {
    let p = new HttpParams();
    if (opts.status)          p = p.set('status', opts.status);
    if (opts.customerPartyId) p = p.set('customerPartyId', String(opts.customerPartyId));
    if (opts.mode)            p = p.set('mode', opts.mode);
    if (opts.countryCode)     p = p.set('countryCode', opts.countryCode);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<BookingDto[]>(`${this.base}/bookings`, { params: p }));
  }

  getBooking(id: number): Promise<BookingDetailDto> {
    return firstValueFrom(this.http.get<BookingDetailDto>(`${this.base}/bookings/${id}`));
  }

  changeBookingStatus(id: number, newStatus: BookingStatus): Promise<BookingDto> {
    return firstValueFrom(this.http.post<BookingDto>(`${this.base}/bookings/${id}/status`, { newStatus }));
  }

  /* Shipments — Control Tower passes the rich filter set; basic callers pass status+mode */
  listShipments(opts: {
    status?: ShipmentStatus; mode?: TransportMode;
    countryCode?: string;
    direction?: TradeDirection;
    shipmentNumber?: string; mblNumber?: string; hblNumber?: string; containerNumber?: string;
    customerPartyId?: number;
    originPortId?: number; destinationPortId?: number;
    etaFrom?: string; etaTo?: string;     // ISO yyyy-MM-dd
    starredOnly?: boolean;                // SCM Milestone 1+2 watchlist filter
    page?: number; pageSize?: number;
  } = {}): Promise<ShipmentDto[]> {
    let p = new HttpParams();
    if (opts.status)            p = p.set('status', opts.status);
    if (opts.mode)              p = p.set('mode', opts.mode);
    if (opts.countryCode)       p = p.set('countryCode', opts.countryCode);
    if (opts.direction)         p = p.set('direction', opts.direction);
    if (opts.shipmentNumber)    p = p.set('shipmentNumber', opts.shipmentNumber);
    if (opts.mblNumber)         p = p.set('mblNumber', opts.mblNumber);
    if (opts.hblNumber)         p = p.set('hblNumber', opts.hblNumber);
    if (opts.containerNumber)   p = p.set('containerNumber', opts.containerNumber);
    if (opts.customerPartyId)   p = p.set('customerPartyId', String(opts.customerPartyId));
    if (opts.originPortId)      p = p.set('originPortId', String(opts.originPortId));
    if (opts.destinationPortId) p = p.set('destinationPortId', String(opts.destinationPortId));
    if (opts.etaFrom)           p = p.set('etaFrom', opts.etaFrom);
    if (opts.etaTo)             p = p.set('etaTo', opts.etaTo);
    if (opts.starredOnly)       p = p.set('starredOnly', 'true');
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<ShipmentDto[]>(`${this.base}/shipments`, { params: p }));
  }

  /* SCM Milestone 1+2 — watchlist (current user) */
  starShipment(id: number): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/shipments/${id}/star`, {}));
  }

  unstarShipment(id: number): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.base}/shipments/${id}/star`));
  }

  listWatchlistIds(): Promise<number[]> {
    return firstValueFrom(this.http.get<number[]>(`${this.base}/shipments/watchlist/ids`));
  }

  /* SCM Milestone 1+2 — Holds */
  listShipmentHolds(shipmentId: number, includeCleared = false): Promise<ShipmentHoldDto[]> {
    let p = new HttpParams();
    if (includeCleared) p = p.set('includeCleared', 'true');
    return firstValueFrom(this.http.get<ShipmentHoldDto[]>(`${this.base}/shipments/${shipmentId}/holds`, { params: p }));
  }
  placeShipmentHold(shipmentId: number, holdType: HoldType, reason: string): Promise<ShipmentHoldDto> {
    return firstValueFrom(this.http.post<ShipmentHoldDto>(`${this.base}/shipments/${shipmentId}/holds`, { holdType, reason }));
  }
  clearShipmentHold(holdId: number, resolutionNote: string | null): Promise<ShipmentHoldDto> {
    return firstValueFrom(this.http.post<ShipmentHoldDto>(`${this.base}/shipments/holds/${holdId}/clear`, { resolutionNote }));
  }

  /* SCM Milestone 1+2 — Reminders */
  listShipmentReminders(shipmentId: number): Promise<ShipmentReminderDto[]> {
    return firstValueFrom(this.http.get<ShipmentReminderDto[]>(`${this.base}/shipments/${shipmentId}/reminders`));
  }
  addShipmentReminder(shipmentId: number, body: {
    reminderKind: ReminderKind; title: string; notes?: string;
    dueAt: string; containerId?: number; assignedUserSub?: string;
  }): Promise<ShipmentReminderDto> {
    return firstValueFrom(this.http.post<ShipmentReminderDto>(`${this.base}/shipments/${shipmentId}/reminders`, body));
  }
  listReminders(opts: {
    status?: ReminderStatus; dueNow?: boolean; assignedUserSub?: string;
    page?: number; pageSize?: number;
  } = {}): Promise<ShipmentReminderDto[]> {
    let p = new HttpParams();
    if (opts.status)          p = p.set('status', opts.status);
    if (opts.dueNow)          p = p.set('dueNow', 'true');
    if (opts.assignedUserSub) p = p.set('assignedUserSub', opts.assignedUserSub);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 100));
    return firstValueFrom(this.http.get<ShipmentReminderDto[]>(`${this.base}/reminders`, { params: p }));
  }
  changeReminderStatus(id: number, newStatus: ReminderStatus, snoozeUntilUtc?: string): Promise<ShipmentReminderDto> {
    const body: any = { newStatus };
    if (snoozeUntilUtc) body.snoozeUntilUtc = snoozeUntilUtc;
    return firstValueFrom(this.http.post<ShipmentReminderDto>(`${this.base}/reminders/${id}/status`, body));
  }
  runDueReminders(): Promise<RemindersFiredDto> {
    return firstValueFrom(this.http.post<RemindersFiredDto>(`${this.base}/reminders/run-due`, {}));
  }

  getShipment(id: number): Promise<ShipmentDetailDto> {
    return firstValueFrom(this.http.get<ShipmentDetailDto>(`${this.base}/shipments/${id}`));
  }

  changeShipmentStatus(id: number, newStatus: ShipmentStatus): Promise<ShipmentDto> {
    return firstValueFrom(this.http.post<ShipmentDto>(`${this.base}/shipments/${id}/status`, { newStatus }));
  }

  listShipmentContainers(id: number): Promise<ContainerDto[]> {
    return firstValueFrom(this.http.get<ContainerDto[]>(`${this.base}/shipments/${id}/containers`));
  }

  listShipmentMilestones(id: number): Promise<MilestoneDto[]> {
    return firstValueFrom(this.http.get<MilestoneDto[]>(`${this.base}/shipments/${id}/milestones`));
  }

  listShipmentCharges(id: number): Promise<ChargeLineDto[]> {
    return firstValueFrom(this.http.get<ChargeLineDto[]>(`${this.base}/shipments/${id}/charges`));
  }

  /* SCM Milestone 1 — internal memo notes per shipment */
  listShipmentMemos(id: number): Promise<ShipmentMemoDto[]> {
    return firstValueFrom(this.http.get<ShipmentMemoDto[]>(`${this.base}/shipments/${id}/memos`));
  }

  addShipmentMemo(id: number, body: string, isPinned = false): Promise<ShipmentMemoDto> {
    return firstValueFrom(this.http.post<ShipmentMemoDto>(`${this.base}/shipments/${id}/memos`, { body, isPinned }));
  }

  /* Read-only roll-ups */
  listConsols(): Promise<ConsolDto[]> {
    return firstValueFrom(this.http.get<ConsolDto[]>(`${this.base}/consols`));
  }

  listDemurrage(containerId?: number): Promise<DemurrageEventDto[]> {
    let p = new HttpParams();
    if (containerId) p = p.set('containerId', String(containerId));
    return firstValueFrom(this.http.get<DemurrageEventDto[]>(`${this.base}/demurrage`, { params: p }));
  }
}
