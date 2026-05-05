import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AccountClass, AccountDto, AgingBucketDto, BalanceSheetDto, BillDto, BillStatus,
  CreateBillRequest, CreateInvoiceRequest, CreatePaymentRequest, CreateReceiptRequest,
  IncomeStatementDto, InvoiceDto, InvoiceStatus, JournalDto, JournalType,
  PaymentDto, PaymentMethod, PeriodDto, ReceiptDto, TrialBalanceDto,
} from './accounting-types';

@Injectable({ providedIn: 'root' })
export class AccountingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/accounting`;

  /* ----- Chart of Accounts ----- */
  listAccounts(opts: { accountClass?: AccountClass; isActive?: boolean; page?: number; pageSize?: number } = {}): Promise<AccountDto[]> {
    let p = new HttpParams();
    if (opts.accountClass) p = p.set('accountClass', opts.accountClass);
    if (opts.isActive !== undefined) p = p.set('isActive', String(opts.isActive));
    p = p.set('page', String(opts.page ?? 1)).set('pageSize', String(opts.pageSize ?? 200));
    return firstValueFrom(this.http.get<AccountDto[]>(`${this.base}/accounts`, { params: p }));
  }

  /* ----- Periods ----- */
  listPeriods(fiscalYear?: number): Promise<PeriodDto[]> {
    let p = new HttpParams();
    if (fiscalYear) p = p.set('fiscalYear', String(fiscalYear));
    return firstValueFrom(this.http.get<PeriodDto[]>(`${this.base}/periods`, { params: p }));
  }
  closePeriod(id: number): Promise<PeriodDto> {
    return firstValueFrom(this.http.post<PeriodDto>(`${this.base}/periods/${id}/close`, {}));
  }
  reopenPeriod(id: number, reason: string): Promise<PeriodDto> {
    return firstValueFrom(this.http.post<PeriodDto>(`${this.base}/periods/${id}/reopen`, { reason }));
  }

  /* ----- Invoices ----- */
  listInvoices(opts: { customerPartyId?: number; status?: InvoiceStatus; fromDate?: string; toDate?: string; page?: number; pageSize?: number } = {}): Promise<InvoiceDto[]> {
    let p = new HttpParams();
    if (opts.customerPartyId) p = p.set('customerPartyId', String(opts.customerPartyId));
    if (opts.status)          p = p.set('status', opts.status);
    if (opts.fromDate)        p = p.set('fromDate', opts.fromDate);
    if (opts.toDate)          p = p.set('toDate', opts.toDate);
    p = p.set('page', String(opts.page ?? 1)).set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<InvoiceDto[]>(`${this.base}/invoices`, { params: p }));
  }
  getInvoice(id: number): Promise<InvoiceDto> {
    return firstValueFrom(this.http.get<InvoiceDto>(`${this.base}/invoices/${id}`));
  }
  createInvoice(req: CreateInvoiceRequest): Promise<InvoiceDto> {
    return firstValueFrom(this.http.post<InvoiceDto>(`${this.base}/invoices`, req));
  }
  postInvoice(id: number): Promise<InvoiceDto> {
    return firstValueFrom(this.http.post<InvoiceDto>(`${this.base}/invoices/${id}/post`, {}));
  }
  voidInvoice(id: number, reason: string): Promise<InvoiceDto> {
    return firstValueFrom(this.http.post<InvoiceDto>(`${this.base}/invoices/${id}/void`, { reason }));
  }

  /* ----- Bills ----- */
  listBills(opts: { vendorPartyId?: number; status?: BillStatus; fromDate?: string; toDate?: string; page?: number; pageSize?: number } = {}): Promise<BillDto[]> {
    let p = new HttpParams();
    if (opts.vendorPartyId) p = p.set('vendorPartyId', String(opts.vendorPartyId));
    if (opts.status)        p = p.set('status', opts.status);
    if (opts.fromDate)      p = p.set('fromDate', opts.fromDate);
    if (opts.toDate)        p = p.set('toDate', opts.toDate);
    p = p.set('page', String(opts.page ?? 1)).set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<BillDto[]>(`${this.base}/bills`, { params: p }));
  }
  getBill(id: number): Promise<BillDto> {
    return firstValueFrom(this.http.get<BillDto>(`${this.base}/bills/${id}`));
  }
  createBill(req: CreateBillRequest): Promise<BillDto> {
    return firstValueFrom(this.http.post<BillDto>(`${this.base}/bills`, req));
  }
  postBill(id: number): Promise<BillDto> {
    return firstValueFrom(this.http.post<BillDto>(`${this.base}/bills/${id}/post`, {}));
  }

  /* ----- Receipts ----- */
  listReceipts(): Promise<ReceiptDto[]> {
    return firstValueFrom(this.http.get<ReceiptDto[]>(`${this.base}/receipts`));
  }
  createReceipt(req: CreateReceiptRequest): Promise<ReceiptDto> {
    return firstValueFrom(this.http.post<ReceiptDto>(`${this.base}/receipts`, req));
  }

  /* ----- Payments ----- */
  listPayments(): Promise<PaymentDto[]> {
    return firstValueFrom(this.http.get<PaymentDto[]>(`${this.base}/payments`));
  }
  createPayment(req: CreatePaymentRequest): Promise<PaymentDto> {
    return firstValueFrom(this.http.post<PaymentDto>(`${this.base}/payments`, req));
  }

  /* ----- Journals ----- */
  listJournals(opts: { periodId?: number; type?: JournalType; isPosted?: boolean; page?: number; pageSize?: number } = {}): Promise<JournalDto[]> {
    let p = new HttpParams();
    if (opts.periodId)             p = p.set('periodId', String(opts.periodId));
    if (opts.type)                 p = p.set('type', opts.type);
    if (opts.isPosted !== undefined) p = p.set('isPosted', String(opts.isPosted));
    p = p.set('page', String(opts.page ?? 1)).set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<JournalDto[]>(`${this.base}/journals`, { params: p }));
  }

  /* ----- Reports ----- */
  trialBalance(periodId: number): Promise<TrialBalanceDto> {
    const p = new HttpParams().set('periodId', String(periodId));
    return firstValueFrom(this.http.get<TrialBalanceDto>(`${this.base}/reports/trial-balance`, { params: p }));
  }
  incomeStatement(fromPeriodId: number, toPeriodId: number): Promise<IncomeStatementDto> {
    const p = new HttpParams().set('fromPeriodId', String(fromPeriodId)).set('toPeriodId', String(toPeriodId));
    return firstValueFrom(this.http.get<IncomeStatementDto>(`${this.base}/reports/income-statement`, { params: p }));
  }
  balanceSheet(asOfPeriodId: number): Promise<BalanceSheetDto> {
    const p = new HttpParams().set('asOfPeriodId', String(asOfPeriodId));
    return firstValueFrom(this.http.get<BalanceSheetDto>(`${this.base}/reports/balance-sheet`, { params: p }));
  }
  arAging(asOf?: string): Promise<AgingBucketDto[]> {
    let p = new HttpParams();
    if (asOf) p = p.set('asOf', asOf);
    return firstValueFrom(this.http.get<AgingBucketDto[]>(`${this.base}/reports/ar-aging`, { params: p }));
  }
  apAging(asOf?: string): Promise<AgingBucketDto[]> {
    let p = new HttpParams();
    if (asOf) p = p.set('asOf', asOf);
    return firstValueFrom(this.http.get<AgingBucketDto[]>(`${this.base}/reports/ap-aging`, { params: p }));
  }
}
