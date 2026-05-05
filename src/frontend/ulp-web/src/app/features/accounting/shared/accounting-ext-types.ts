/**
 * M17 finish — DTOs for extension service (Milestone 3 closure).
 */

export type SettlementLinkStatus = 'Active' | 'Reversed';
export type BankAccountType      = 'Checking' | 'Savings' | 'MoneyMarket' | 'Cd' | 'CreditLine';
export type DepositSource        = 'FromAr' | 'Standalone';
export type DepositStatus        = 'Pending' | 'Cleared' | 'Reversed' | 'Bounced';
export type BankStatementSource  = 'Manual' | 'Bai2' | 'Ofx' | 'Csv' | 'Mt940';
export type BankReconStatus      = 'Draft' | 'InProgress' | 'Completed' | 'Discrepancy';
export type BankReconTargetKind  = 'Receipt' | 'Payment' | 'Deposit' | 'Transfer' | 'VoidedCheck' | 'Adjustment';
export type FundTransferStatus   = 'Pending' | 'Sent' | 'Cleared' | 'Failed' | 'Cancelled';
export type VoidReason           = 'Misprint' | 'Lost' | 'Stale' | 'PrintTest' | 'UserVoid' | 'Other';
export type CheckPrintBatchStatus= 'Pending' | 'Printed' | 'Cancelled';
export type InvoicePrintBatchStatus = 'Pending' | 'Printed' | 'Sent' | 'Cancelled';
export type PrintDeliveryMethod  = 'Print' | 'Email' | 'Both';
export type PastDueLevel         = 'First' | 'Second' | 'Final' | 'LegalAction';
export type PastDueDelivery      = 'Email' | 'Print' | 'Both';
export type PastDueStatus        = 'Draft' | 'Sent' | 'Acknowledged' | 'Resolved';
export type EmailTemplateCategory= 'Invoice' | 'PastDue' | 'Statement' | 'Receipt' | 'PaymentRemittance' | 'Custom';
export type CardBrand            = 'Visa' | 'MasterCard' | 'Amex' | 'Discover' | 'Other';
export type CreditCardProofKind  = 'PhotoFromApp' | 'OnlineDocument' | 'PhysicalSlip';
export type GeneralExpenseKind   = 'General' | 'FixedGeneral';
export type ExpenseRecurrence    = 'OneTime' | 'Monthly' | 'Quarterly' | 'Yearly';

export interface SettlementLinkDto {
  id: number; tenantId: number; invoiceLineId: number; billLineId: number;
  linkedAmount: number; currency: string; notes: string | null;
  status: SettlementLinkStatus; createdAt: string; createdBy: number;
  reversedAt: string | null; reversedBy: number | null; reversalReason: string | null;
}

export interface BankAccountDto {
  id: number; accountCode: string; bankName: string; accountNumberMasked: string;
  accountType: BankAccountType; currency: string; ledgerAccountId: number | null;
  routingNumber: string | null; swiftCode: string | null; iban: string | null;
  isActive: boolean; currentBalance: number; lastReconDate: string | null; notes: string | null;
}

export interface DepositDto {
  id: number; depositNumber: string; depositDate: string; bankAccountId: number; bankName: string | null;
  amount: number; currency: string; source: DepositSource;
  receiptId: number | null; customerPartyId: number | null; customerName: string | null;
  checkNumber: string | null; notes: string | null; status: DepositStatus;
  clearedAt: string | null; reversedAt: string | null; reversalReason: string | null;
}

export interface BankStatementDto {
  id: number; bankAccountId: number; bankName: string | null;
  statementPeriod: string; statementDate: string;
  openingBalance: number; closingBalance: number; totalDebits: number; totalCredits: number;
  source: BankStatementSource; lineCount: number; uploadedAt: string;
}

export interface BankStatementLineDto {
  id: number; statementId: number; lineDate: string; description: string;
  reference: string | null; amount: number; runningBalance: number | null;
  isMatched: boolean; matchConfidence: number | null;
}

export interface BankStatementDetailDto { statement: BankStatementDto; lines: BankStatementLineDto[]; }

export interface BankReconDto {
  id: number; bankAccountId: number; bankName: string | null;
  statementId: number; statementPeriod: string; reconDate: string; status: BankReconStatus;
  bookBalance: number; bankBalance: number; difference: number;
  matchedCount: number; unmatchedCount: number; notes: string | null; completedAt: string | null;
}

export interface BankReconMatchDto {
  id: number; reconId: number; statementLineId: number;
  matchTargetKind: BankReconTargetKind; matchTargetId: number;
  matchedAmount: number; isAuto: boolean; matchedAt: string;
}

export interface BankReconDetailDto {
  recon: BankReconDto; statementLines: BankStatementLineDto[]; matches: BankReconMatchDto[];
}

export interface FundTransferDto {
  id: number; transferNumber: string; transferDate: string;
  fromBankId: number; fromBankName: string | null;
  toBankId: number; toBankName: string | null;
  amount: number; currency: string; fxRate: number; toAmount: number;
  bankReference: string | null; notes: string | null; status: FundTransferStatus;
}

export interface VoidedCheckDto {
  id: number; bankAccountId: number; bankName: string | null;
  checkNumber: string; voidDate: string;
  originalPaymentId: number | null; amount: number | null; payee: string | null;
  voidReason: VoidReason; notes: string | null; createdAt: string;
}

export interface CheckPrintBatchDto {
  id: number; batchNumber: string; bankAccountId: number; bankName: string | null;
  printDate: string; startingCheckNo: string; checkCount: number; totalAmount: number;
  paymentIds: number[]; status: CheckPrintBatchStatus; printedAt: string | null;
}

export interface InvoicePrintBatchDto {
  id: number; batchNumber: string; printDate: string; invoiceCount: number;
  invoiceIds: number[]; status: InvoicePrintBatchStatus; deliveryMethod: PrintDeliveryMethod;
  printedAt: string | null;
}

export interface PastDueNoticeDto {
  id: number; noticeNumber: string; customerPartyId: number; customerName: string | null;
  noticeLevel: PastDueLevel; totalOverdueAmount: number; currency: string;
  invoiceCount: number; invoiceIds: number[];
  generatedAt: string; sentAt: string | null; deliveryMethod: PastDueDelivery;
  status: PastDueStatus; notes: string | null;
}

export interface EmailTemplateDto {
  id: number; templateCode: string; templateName: string; category: EmailTemplateCategory;
  subjectTemplate: string; bodyTemplate: string; isActive: boolean; isPredefined: boolean;
  availablePlaceholders: string[] | null;
}

export interface CreditCardPaymentDto {
  id: number; receiptId: number | null; paymentId: number | null;
  cardBrand: CardBrand; lastFour: string;
  authorizationCode: string | null; transactionId: string;
  amount: number; currency: string;
  proofKind: CreditCardProofKind; proofDocumentId: number | null; notes: string | null; createdAt: string;
}

export interface GeneralExpenseDto {
  id: number; expenseNumber: string; expenseDate: string; expenseKind: GeneralExpenseKind;
  description: string; expenseAccountId: number; accountCode: string | null;
  amount: number; currency: string; recurrence: ExpenseRecurrence;
  nextRecurDate: string | null; isActive: boolean; notes: string | null;
}

export interface ComparativeProfitDto {
  year: number; funcCurrency: string;
  revenuePerMonth: number[]; expensePerMonth: number[]; profitPerMonth: number[];
  totalRevenue: number; totalExpenses: number; totalProfit: number;
  priorYearRevenue: number | null; priorYearExpenses: number | null; priorYearProfit: number | null;
}

/* ===================== Request DTOs (mirror Ulp.Accounting.Application.FinanceExtContracts) ===================== */

export interface CreateGeneralExpenseRequest {
  expenseNumber: string;
  expenseDate: string;
  expenseKind: GeneralExpenseKind;
  description: string;
  expenseAccountId: number;
  amount: number;
  currency: string;
  recurrence: ExpenseRecurrence;
  nextRecurDate?: string | null;
  notes?: string | null;
}
