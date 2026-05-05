import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AgreementDto, CreateAgreementRequest, CreateVendorRequest, NcrDto, OnboardingStepDto,
  PerformanceScoreDto, RaiseNcrRequest, VendorCategoryCode, VendorDto, VendorStatus,
} from './vendor-management-types';

@Injectable({ providedIn: 'root' })
export class VendorManagementApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/vendor-management`;

  /* Vendors */
  list(opts: {
    status?: VendorStatus;
    countryCode?: string;
    category?: VendorCategoryCode;
    page?: number; pageSize?: number;
  } = {}): Promise<{ items: VendorDto[]; total: number }> {
    let p = new HttpParams();
    if (opts.status)      p = p.set('status', opts.status);
    if (opts.countryCode) p = p.set('countryCode', opts.countryCode);
    if (opts.category)    p = p.set('category', opts.category);
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<any>(`${this.base}/vendors`, { params: p }));
  }

  get(id: number): Promise<VendorDto> {
    return firstValueFrom(this.http.get<VendorDto>(`${this.base}/vendors/${id}`));
  }

  create(req: CreateVendorRequest): Promise<VendorDto> {
    return firstValueFrom(this.http.post<VendorDto>(`${this.base}/vendors`, req));
  }

  activate(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/vendors/${id}/activate`, {}));
  }

  suspend(id: number, reason: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/vendors/${id}/suspend`, { reason }));
  }

  /* Onboarding */
  startOnboarding(id: number): Promise<OnboardingStepDto[]> {
    return firstValueFrom(this.http.post<OnboardingStepDto[]>(`${this.base}/vendors/${id}/onboarding/start`, {}));
  }

  completeStep(id: number, stepCode: string, notes?: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(
      `${this.base}/vendors/${id}/onboarding/${stepCode}/complete`, { notes, resultJson: null }));
  }

  getOnboarding(id: number): Promise<OnboardingStepDto[]> {
    return firstValueFrom(this.http.get<OnboardingStepDto[]>(`${this.base}/vendors/${id}/onboarding`));
  }

  /* Agreements + performance + NCRs */
  listAgreements(id: number): Promise<AgreementDto[]> {
    return firstValueFrom(this.http.get<AgreementDto[]>(`${this.base}/vendors/${id}/agreements`));
  }

  createAgreement(vendorId: number, req: CreateAgreementRequest): Promise<AgreementDto> {
    return firstValueFrom(this.http.post<AgreementDto>(`${this.base}/vendors/${vendorId}/agreements`, req));
  }

  performance(id: number): Promise<PerformanceScoreDto[]> {
    return firstValueFrom(this.http.get<PerformanceScoreDto[]>(`${this.base}/vendors/${id}/performance`));
  }

  ncrs(id: number): Promise<NcrDto[]> {
    return firstValueFrom(this.http.get<NcrDto[]>(`${this.base}/vendors/${id}/ncrs`));
  }

  raiseNcr(req: RaiseNcrRequest): Promise<NcrDto> {
    return firstValueFrom(this.http.post<NcrDto>(`${this.base}/ncrs`, req));
  }
}
