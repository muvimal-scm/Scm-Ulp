import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BankAccountDto, BankReconDetailDto, BankReconDto, BankStatementDetailDto, BankStatementDto,
  CheckPrintBatchDto, ComparativeProfitDto, CreateGeneralExpenseRequest, CreditCardPaymentDto, DepositDto,
  EmailTemplateCategory, EmailTemplateDto, FundTransferDto, GeneralExpenseDto, GeneralExpenseKind,
  InvoicePrintBatchDto, PastDueNoticeDto, PastDueStatus, SettlementLinkDto, SettlementLinkStatus,
  VoidedCheckDto,
} from './accounting-ext-types';

@Injectable({ providedIn: 'root' })
export class AccountingExtApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/accounting`;

  /* settlement */
  listSettlementLinks(status?: SettlementLinkStatus): Promise<SettlementLinkDto[]> {
    let p = new HttpParams(); if (status) p = p.set('status', status);
    return firstValueFrom(this.http.get<SettlementLinkDto[]>(`${this.base}/settlement-links`, { params: p }));
  }
  reverseSettlementLink(id: number, reason: string): Promise<SettlementLinkDto> {
    return firstValueFrom(this.http.post<SettlementLinkDto>(`${this.base}/settlement-links/${id}/reverse`, { reason }));
  }

  /* banking */
  listBankAccounts(): Promise<BankAccountDto[]> {
    return firstValueFrom(this.http.get<BankAccountDto[]>(`${this.base}/bank-accounts`));
  }
  listDeposits(): Promise<DepositDto[]> {
    return firstValueFrom(this.http.get<DepositDto[]>(`${this.base}/deposits`));
  }
  reverseDeposit(id: number, reason: string): Promise<DepositDto> {
    return firstValueFrom(this.http.post<DepositDto>(`${this.base}/deposits/${id}/reverse`, { reason }));
  }
  listBankStatements(bankAccountId?: number): Promise<BankStatementDto[]> {
    let p = new HttpParams(); if (bankAccountId) p = p.set('bankAccountId', String(bankAccountId));
    return firstValueFrom(this.http.get<BankStatementDto[]>(`${this.base}/bank-statements`, { params: p }));
  }
  getBankStatement(id: number): Promise<BankStatementDetailDto> {
    return firstValueFrom(this.http.get<BankStatementDetailDto>(`${this.base}/bank-statements/${id}`));
  }
  listBankRecons(): Promise<BankReconDto[]> {
    return firstValueFrom(this.http.get<BankReconDto[]>(`${this.base}/bank-recons`));
  }
  getBankRecon(id: number): Promise<BankReconDetailDto> {
    return firstValueFrom(this.http.get<BankReconDetailDto>(`${this.base}/bank-recons/${id}`));
  }
  listFundTransfers(): Promise<FundTransferDto[]> {
    return firstValueFrom(this.http.get<FundTransferDto[]>(`${this.base}/fund-transfers`));
  }
  listVoidedChecks(): Promise<VoidedCheckDto[]> {
    return firstValueFrom(this.http.get<VoidedCheckDto[]>(`${this.base}/voided-checks`));
  }

  /* print batches */
  listCheckPrintBatches(): Promise<CheckPrintBatchDto[]> {
    return firstValueFrom(this.http.get<CheckPrintBatchDto[]>(`${this.base}/check-print-batches`));
  }
  listInvoicePrintBatches(): Promise<InvoicePrintBatchDto[]> {
    return firstValueFrom(this.http.get<InvoicePrintBatchDto[]>(`${this.base}/invoice-print-batches`));
  }

  /* past-due */
  listPastDueNotices(status?: PastDueStatus): Promise<PastDueNoticeDto[]> {
    let p = new HttpParams(); if (status) p = p.set('status', status);
    return firstValueFrom(this.http.get<PastDueNoticeDto[]>(`${this.base}/past-due-notices`, { params: p }));
  }
  sendPastDueNotice(id: number): Promise<PastDueNoticeDto> {
    return firstValueFrom(this.http.post<PastDueNoticeDto>(`${this.base}/past-due-notices/${id}/send`, {}));
  }

  /* email templates */
  listEmailTemplates(category?: EmailTemplateCategory): Promise<EmailTemplateDto[]> {
    let p = new HttpParams(); if (category) p = p.set('category', category);
    return firstValueFrom(this.http.get<EmailTemplateDto[]>(`${this.base}/email-templates`, { params: p }));
  }

  /* credit card */
  listCreditCardPayments(): Promise<CreditCardPaymentDto[]> {
    return firstValueFrom(this.http.get<CreditCardPaymentDto[]>(`${this.base}/credit-card-payments`));
  }

  /* general expense */
  listGeneralExpenses(kind?: GeneralExpenseKind): Promise<GeneralExpenseDto[]> {
    let p = new HttpParams(); if (kind) p = p.set('kind', kind);
    return firstValueFrom(this.http.get<GeneralExpenseDto[]>(`${this.base}/general-expenses`, { params: p }));
  }
  createGeneralExpense(req: CreateGeneralExpenseRequest): Promise<GeneralExpenseDto> {
    return firstValueFrom(this.http.post<GeneralExpenseDto>(`${this.base}/general-expenses`, req));
  }

  /* reports */
  comparativeProfit(year: number): Promise<ComparativeProfitDto> {
    const p = new HttpParams().set('year', String(year));
    return firstValueFrom(this.http.get<ComparativeProfitDto>(`${this.base}/reports-ext/comparative-profit`, { params: p }));
  }
}
