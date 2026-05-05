/**
 * M2 Sales / CRM — DTOs that mirror src/backend/.../Ulp.Sales.Application/Contracts.cs.
 */

export type LeadSource      = 'Web' | 'Referral' | 'ColdCall' | 'Event' | 'Partner' | 'ExistingCustomer' | 'Other';
export type LeadStage       = 'New' | 'Contacted' | 'Qualified' | 'Disqualified' | 'Converted';
export type OppStage        = 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'ClosedWon' | 'ClosedLost';
export type RelatedTo       = 'Lead' | 'Opp' | 'Party';
export type ActivityType    = 'Call' | 'Email' | 'Meeting' | 'Note' | 'Task';
export type CampaignChannel = 'Email' | 'Sms' | 'Whatsapp';
export type CampaignStatus  = 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Cancelled';
export type RfqStatus       = 'Open' | 'InResponse' | 'Closed' | 'Cancelled';

export interface LeadDto {
  id: number;
  tenantId: number;
  countryCode: string;
  leadNumber: string;
  source: LeadSource;
  contactName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  estimatedVolume: string | null;
  stage: LeadStage;
  ownerUserId: number | null;
  convertedPartyId: number | null;
  createdAt: string;
  modifiedAt: string;
}

export interface OpportunityDto {
  id: number;
  tenantId: number;
  countryCode: string;
  oppNumber: string;
  partyId: number;
  title: string;
  estimatedValue: number | null;
  estimatedCurrency: string | null;
  expectedClose: string | null;
  probabilityPct: number | null;
  stage: OppStage;
  ownerUserId: number | null;
  activityCount: number;
  createdAt: string;
  modifiedAt: string;
}

export interface ActivityDto {
  id: number;
  relatedTo: RelatedTo;
  relatedId: number;
  activityType: ActivityType;
  subject: string | null;
  occurredAt: string;
  ownerUserId: number | null;
  detailsJson: string | null;
}

export interface OpportunityDetailDto {
  opportunity: OpportunityDto;
  activities: ActivityDto[];
  linkedQuoteIds: number[];
}

export interface CampaignDto {
  id: number;
  name: string;
  channel: CampaignChannel;
  templateCode: string | null;
  scheduledAt: string | null;
  status: CampaignStatus;
  sentCount: number;
  deliveredCount: number;
  targetCount: number;
  createdAt: string;
}

export interface RfqRequestDto {
  id: number;
  rfqNumber: string;
  partyId: number;
  requestedAt: string;
  dueDate: string | null;
  status: RfqStatus;
  notes: string | null;
  lineCount: number;
  responseCount: number;
}

export interface RfqLineDto {
  id: number;
  rfqRequestId: number;
  lineNumber: number;
  description: string;
  quantity: number | null;
  uomCode: string | null;
}

export interface RfqResponseDto {
  id: number;
  rfqRequestId: number;
  vendorPartyId: number;
  responseAmount: number | null;
  responseCurrency: string | null;
  validUntil: string | null;
  notes: string | null;
  receivedAt: string;
  isWinner: boolean;
}

export interface RfqRequestDetailDto {
  request: RfqRequestDto;
  lines: RfqLineDto[];
  responses: RfqResponseDto[];
}

export interface PipelineStageDto {
  id: number;
  code: string;
  name: string;
  sequence: number;
  defaultProbabilityPct: number | null;
}

/* ===================== Request DTOs (mirror Ulp.Sales.Application/Contracts.cs) ===================== */

export interface CreateLeadRequest {
  countryCode: string;
  leadNumber: string;            // immutable; required only on create
  source: LeadSource;
  contactName: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  estimatedVolume?: string | null;
}

export interface UpdateLeadRequest {
  countryCode: string;           // leadNumber omitted — immutable
  source: LeadSource;
  contactName: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  estimatedVolume?: string | null;
}

export interface CreateOpportunityRequest {
  countryCode: string;
  oppNumber: string;             // immutable; required only on create
  partyId: number;
  title: string;
  estimatedValue?: number | null;
  estimatedCurrency?: string | null;
  expectedClose?: string | null; // ISO date YYYY-MM-DD
  probabilityPct?: number | null;
}

export interface UpdateOpportunityRequest {
  countryCode: string;           // oppNumber omitted — immutable
  partyId: number;
  title: string;
  estimatedValue?: number | null;
  estimatedCurrency?: string | null;
  expectedClose?: string | null;
  probabilityPct?: number | null;
}

export interface CreateActivityRequest {
  relatedTo: RelatedTo;
  relatedId: number;
  activityType: ActivityType;
  subject?: string | null;
  occurredAt: string;            // ISO 8601 with offset
  ownerUserId?: number | null;
  detailsJson?: string | null;
}

export interface CreateCampaignRequest {
  name: string;
  channel: CampaignChannel;
  audienceFilterJson?: string | null;
  templateCode?: string | null;
  scheduledAt?: string | null;   // ISO 8601 with offset
}

export interface CreateRfqRequest {
  rfqNumber: string;
  partyId: number;
  requestedAt: string;           // ISO 8601 with offset
  dueDate?: string | null;       // ISO date YYYY-MM-DD
  notes?: string | null;
}

export interface CreateRfqLineRequest {
  description: string;
  quantity?: number | null;
  uomCode?: string | null;
}

export interface CreateRfqResponseRequest {
  vendorPartyId: number;
  responseAmount?: number | null;
  responseCurrency?: string | null;
  validUntil?: string | null;
  notes?: string | null;
}
