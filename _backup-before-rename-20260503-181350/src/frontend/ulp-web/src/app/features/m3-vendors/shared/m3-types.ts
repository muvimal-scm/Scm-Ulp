export type VendorStatus =
  | 'Prospect' | 'OnboardingInProgress' | 'Active' | 'Suspended' | 'Blacklisted' | 'Closed';

export type RiskTier = 'Low' | 'Medium' | 'High' | 'Critical';

export type VendorCategoryCode =
  | 'CARRIER_SEA' | 'CARRIER_AIR' | 'CARRIER_ROAD' | 'CARRIER_RAIL'
  | 'BROKER_CHA' | 'BROKER_NVOCC' | 'FREIGHT_FORWARDER'
  | 'WAREHOUSE_3PL' | 'WAREHOUSE_BONDED'
  | 'BANK' | 'PAYMENT_PROCESSOR' | 'GOVERNMENT_AGENCY'
  | 'IT_SOFTWARE' | 'IT_HARDWARE' | 'UTILITY' | 'PROFESSIONAL_SERVICES'
  | 'INSURANCE' | 'SURVEY' | 'TRADE_INTELLIGENCE' | 'OTHER';

export interface VendorDto {
  id: number;
  tenantId: number;
  partyId: number;
  countryCode: string;
  vendorCode: string;
  status: VendorStatus;
  activatedAt: string | null;
  tdsApplicable: boolean;
  tdsSection: string | null;
  isMsme: boolean;
  msmeUdyamNumber: string | null;
  is1099Reportable: boolean;
  w9OnFile: boolean;
  riskTier: RiskTier;
  sanctionsClear: boolean;
  categories: VendorCategoryCode[];
  createdAt: string;
  modifiedAt: string;
}

export interface CreateVendorRequest {
  partyId: number;
  countryCode: string;
  vendorCode: string;
  tdsApplicable?: boolean;
  tdsSection?: string;
  isMsme?: boolean;
  msmeUdyamNumber?: string;
  is1099Reportable?: boolean;
  w9OnFile?: boolean;
  riskTier?: RiskTier;
  categories?: VendorCategoryCode[];
}

export interface OnboardingStepDto {
  stepCode: string;
  stepName: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Skipped' | 'Failed';
  required: boolean;
  performedAt: string | null;
  notes: string | null;
}

export interface AgreementDto {
  id: number;
  agreementType: 'MSA' | 'SOW' | 'SLA' | 'NDA' | 'RATE_CARD' | 'OTHER';
  agreementNumber: string;
  title: string;
  startDate: string;
  endDate: string | null;
  autoRenewal: boolean;
  status: 'Draft' | 'UnderReview' | 'Signed' | 'Active' | 'Expiring' | 'Expired' | 'Terminated';
  documentId: number | null;
  signedAt: string | null;
}

export interface PerformanceScoreDto {
  id: number;
  periodStart: string;
  periodEnd: string;
  onTimeDeliveryPct: number | null;
  qualityScore: number | null;
  slaBreachCount: number;
  ncrCount: number;
  overallScore: number | null;
  rating: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  computedAt: string;
}

export interface NcrDto {
  id: number;
  vendorId: number;
  ncrNumber: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'InvestigationStarted' | 'VendorResponded' | 'Resolved' | 'Closed';
  description: string;
  category: string | null;
  raisedAt: string;
  closedAt: string | null;
}
