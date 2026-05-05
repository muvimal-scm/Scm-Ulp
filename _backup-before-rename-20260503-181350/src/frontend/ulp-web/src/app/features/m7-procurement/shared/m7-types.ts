/**
 * M7 Procurement — DTOs that mirror src/backend/.../Ulp.M7.Application/Contracts.cs.
 */

export type PrStatus            = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Closed';
export type RfqStatus           = 'Open' | 'InResponse' | 'Closed' | 'Cancelled';
export type RfqRecipientStatus  = 'NotSent' | 'Sent' | 'Acknowledged' | 'Responded' | 'Declined' | 'Expired';
export type PoStatus            = 'Draft' | 'Approved' | 'Sent' | 'PartialReceipt' | 'Closed' | 'Cancelled';
export type GrnStatus           = 'Draft' | 'Posted' | 'Reversed';
export type GoodsCondition      = 'Good' | 'Damaged' | 'Short' | 'Excess';
export type MatchStatus         = 'ThreeWayMatched' | 'PriceVariance' | 'QtyVariance' | 'NoPO' | 'Disputed';

export interface PrDto {
  id: number; tenantId: number; countryCode: string; prNumber: string;
  requestedBy: number | null; department: string | null; status: PrStatus;
  neededBy: string | null; notes: string | null;
  lineCount: number; createdAt: string; modifiedAt: string;
}

export interface PrLineDto {
  id: number; prId: number; lineNo: number; productId: number | null;
  description: string; quantity: number | null; uomCode: string | null;
  estimatedUnitPriceAmount: number | null; estimatedUnitPriceCurrency: string | null;
}

export interface PrDetailDto { pr: PrDto; lines: PrLineDto[]; }

export interface RfqDto {
  id: number; countryCode: string; rfqNumber: string;
  dueDate: string | null; status: RfqStatus; scopePrId: number | null; notes: string | null;
  recipientCount: number; responseCount: number; createdAt: string;
}

export interface RfqRecipientDto {
  id: number; rfqId: number; vendorPartyId: number;
  sentAt: string | null; responseStatus: RfqRecipientStatus;
}

export interface RfqResponseDto {
  id: number; rfqId: number; vendorPartyId: number;
  totalAmount: number | null; totalCurrency: string | null; validUntil: string | null;
  documentId: number | null; notes: string | null; receivedAt: string; isWinner: boolean;
}

export interface RfqDetailDto {
  rfq: RfqDto; recipients: RfqRecipientDto[]; responses: RfqResponseDto[];
}

export interface PoDto {
  id: number; tenantId: number; countryCode: string; poNumber: string;
  vendorPartyId: number; rfqId: number | null; status: PoStatus;
  totalAmount: number | null; totalCurrency: string | null;
  expectedDeliveryDate: string | null; paymentTerms: string | null;
  lineCount: number; grnCount: number; createdAt: string; modifiedAt: string;
}

export interface PoLineDto {
  id: number; poId: number; lineNo: number; productId: number | null;
  description: string; quantityOrdered: number | null; quantityReceived: number | null;
  uomCode: string | null;
  unitPriceAmount: number | null; unitPriceCurrency: string | null;
}

export interface GrnDto {
  id: number; poId: number; grnNumber: string;
  receivedAt: string; receivedBy: number | null;
  m8GrnId: number | null; status: GrnStatus; remarks: string | null; lineCount: number;
}

export interface GrnLineDto {
  id: number; grId: number; poLineId: number;
  quantityReceived: number; cond: GoodsCondition; remarks: string | null;
}

export interface GrnDetailDto { grn: GrnDto; lines: GrnLineDto[]; }

export interface InvoiceMatchDto {
  id: number; poId: number;
  vendorInvoiceId: number | null; vendorInvoiceNo: string | null;
  matchStatus: MatchStatus;
  varianceAmount: number | null; varianceCurrency: string | null;
  matchedBy: number | null; matchedAt: string; notes: string | null;
}

export interface PoDetailDto {
  po: PoDto; lines: PoLineDto[]; grns: GrnDto[]; matches: InvoiceMatchDto[];
}
