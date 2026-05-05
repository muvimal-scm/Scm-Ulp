// Mirrors Ulp.PricingQuotation.Application contract DTOs.

export type RateCardType   = 'Sell' | 'Buy' | 'InternalTransfer';
export type RateCardScope  = 'General' | 'Customer' | 'Vendor' | 'Lane' | 'Service';
export type RateCardStatus = 'Draft' | 'Approved' | 'Active' | 'Expired' | 'Cancelled';
export type SurchargeType  = 'Fixed' | 'PercentFreight' | 'PerUnit';
export type QuoteStatus    = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted';
export type ContractStatus = 'Draft' | 'Active' | 'Expiring' | 'Expired' | 'Terminated';

export interface RateCardDto {
  id: number;
  tenantId: number;
  countryCode: string;
  cardNumber: string;
  cardType: RateCardType;
  scope: RateCardScope;
  partyId: number | null;
  originPortId: number | null;
  destinationPortId: number | null;
  serviceType: string | null;
  validFrom: string;
  validTo: string | null;
  currency: string;
  status: RateCardStatus;
  approvedBy: number | null;
  approvedAt: string | null;
  lineCount: number;
  createdAt: string;
  modifiedAt: string;
}

export interface RateCardLineDto {
  id: number;
  rateCardId: number;
  lineNumber: number;
  chargeCode: string;
  description: string | null;
  uomCode: string;
  rateAmount: number;
  rateCurrency: string;
  minAmount: number | null;
  maxAmount: number | null;
  isTaxable: boolean;
  taxClass: string | null;
}

export interface CreateRateCardRequest {
  countryCode: string;
  cardNumber: string;
  cardType: RateCardType;
  scope: RateCardScope;
  partyId?: number | null;
  originPortId?: number | null;
  destinationPortId?: number | null;
  serviceType?: string | null;
  validFrom: string;
  validTo?: string | null;
  currency: string;
}

export interface CreateRateCardLineRequest {
  chargeCode: string;
  description?: string | null;
  uomCode: string;
  rateAmount: number;
  rateCurrency: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  isTaxable?: boolean;
  taxClass?: string | null;
}

export interface QuoteDto {
  id: number;
  tenantId: number;
  quoteNumber: string;
  customerPartyId: number;
  enquiryRef: string | null;
  status: QuoteStatus;
  originPortId: number | null;
  destinationPortId: number | null;
  serviceType: string | null;
  totalAmount: number | null;
  totalCurrency: string | null;
  validUntil: string | null;
  documentId: number | null;
  notes: string | null;
  lineCount: number;
  createdAt: string;
  modifiedAt: string;
}

export interface QuoteLineDto {
  id: number;
  quoteId: number;
  lineNumber: number;
  chargeCode: string;
  description: string | null;
  quantity: number | null;
  uomCode: string | null;
  unitPrice: number | null;
  amount: number | null;
  currency: string | null;
  rateCardId: number | null;
}

export interface CreateQuoteRequest {
  quoteNumber: string;
  customerPartyId: number;
  enquiryRef?: string | null;
  originPortId?: number | null;
  destinationPortId?: number | null;
  serviceType?: string | null;
  validUntil?: string | null;
  notes?: string | null;
}

export interface CreateQuoteLineRequest {
  chargeCode: string;
  description?: string | null;
  quantity?: number | null;
  uomCode?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  rateCardId?: number | null;
}

export interface SurchargeDto {
  id: number;
  code: string;
  name: string;
  surchargeType: SurchargeType;
  amount: number | null;
  currency: string | null;
  percent: number | null;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
}

export interface ContractDto {
  id: number;
  contractNumber: string;
  customerPartyId: number;
  rateCardId: number | null;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  paymentTerms: string | null;
  status: ContractStatus;
  documentId: number | null;
}
