import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AccessorialDto, AppointmentDto, ChassisDto, ChassisStatus, DispatchBoardDto,
  DriverAvailability, DriverDto, EquipmentKind, EquipmentMaintDto,
  JobAvailabilityStatus, JobDetailDto, JobListDto, MaintStatus, TruckDto, TruckStatus,
} from './trucking-types';

@Injectable({ providedIn: 'root' })
export class TruckingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/trucking`;

  // Drivers
  listDrivers(availability?: DriverAvailability): Promise<DriverDto[]> {
    let p = new HttpParams();
    if (availability) p = p.set('availability', availability);
    return firstValueFrom(this.http.get<DriverDto[]>(`${this.base}/drivers`, { params: p }));
  }
  setDriverAvailability(id: number, availability: DriverAvailability): Promise<DriverDto> {
    return firstValueFrom(this.http.post<DriverDto>(`${this.base}/drivers/${id}/availability`, { availability }));
  }

  // Fleet
  listTrucks(status?: TruckStatus): Promise<TruckDto[]> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return firstValueFrom(this.http.get<TruckDto[]>(`${this.base}/trucks`, { params: p }));
  }
  listChassis(status?: ChassisStatus): Promise<ChassisDto[]> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return firstValueFrom(this.http.get<ChassisDto[]>(`${this.base}/chassis`, { params: p }));
  }
  listMaintenance(kind?: EquipmentKind, status?: MaintStatus): Promise<EquipmentMaintDto[]> {
    let p = new HttpParams();
    if (kind) p = p.set('kind', kind);
    if (status) p = p.set('status', status);
    return firstValueFrom(this.http.get<EquipmentMaintDto[]>(`${this.base}/maintenance`, { params: p }));
  }

  // Jobs
  listJobs(status?: JobAvailabilityStatus): Promise<JobListDto[]> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return firstValueFrom(this.http.get<JobListDto[]>(`${this.base}/jobs`, { params: p }));
  }
  getJob(id: number): Promise<JobDetailDto> {
    return firstValueFrom(this.http.get<JobDetailDto>(`${this.base}/jobs/${id}`));
  }
  advanceStatus(id: number, toStatus: JobAvailabilityStatus, notes?: string): Promise<JobListDto> {
    return firstValueFrom(this.http.post<JobListDto>(`${this.base}/jobs/${id}/advance-status`, { toStatus, notes }));
  }
  assignDispatch(id: number, driverId: number, truckId?: number, chassisId?: number): Promise<JobListDto> {
    return firstValueFrom(this.http.post<JobListDto>(`${this.base}/jobs/${id}/assign-dispatch`, { driverId, truckId, chassisId }));
  }
  listJobAccessorials(jobId: number): Promise<import('./trucking-types').JobAccessorialDto[]> {
    return firstValueFrom(this.http.get<import('./trucking-types').JobAccessorialDto[]>(`${this.base}/jobs/${jobId}/accessorials`));
  }
  addAccessorial(jobId: number, req: { accessorialId: number; occurredAt: string; quantity: number; rateOverride?: number; notes?: string }): Promise<import('./trucking-types').JobAccessorialDto> {
    return firstValueFrom(this.http.post<import('./trucking-types').JobAccessorialDto>(`${this.base}/jobs/${jobId}/accessorials`, req));
  }

  // Accessorial master
  listAccessorials(): Promise<AccessorialDto[]> {
    return firstValueFrom(this.http.get<AccessorialDto[]>(`${this.base}/accessorials`));
  }

  // Appointments
  listAppointments(from?: string, to?: string): Promise<AppointmentDto[]> {
    let p = new HttpParams();
    if (from) p = p.set('from', from);
    if (to) p = p.set('to', to);
    return firstValueFrom(this.http.get<AppointmentDto[]>(`${this.base}/appointments`, { params: p }));
  }

  // Dispatch board
  dispatchBoard(day?: string): Promise<DispatchBoardDto> {
    let p = new HttpParams();
    if (day) p = p.set('day', day);
    return firstValueFrom(this.http.get<DispatchBoardDto>(`${this.base}/dispatch-board`, { params: p }));
  }
}
