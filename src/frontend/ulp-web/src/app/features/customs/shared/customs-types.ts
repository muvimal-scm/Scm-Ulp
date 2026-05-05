/**
 * M4 Customs (CBP/ABI) â€” DTOs that mirror Ulp.Customs.Application/Contracts.cs.
 */

export type AbiStatus       = 'Draft' | 'Submitted' | 'Accepted' | 'Rejected' | 'Released' | 'Hold' | 'Exam' | 'Liquidated' | 'Cancelled';
export type ExamType        = 'Nil' | 'Xray' | 'Intensive' | 'Cet' | 'Tailgate';
export type BondType        = 'SingleTransaction' | 'Continuous';
export type BondStatus      = 'Active' | 'Expired' | 'Cancelled';
export type IsfStatus       = 'Draft' | 'Filed' | 'Match' | 'NoMatch' | 'Late' | 'Amended' | 'Cancelled';
export type PgaCode         = 'Fda' | 'UsdaAphis' | 'UsdaFsis' | 'EpaTsca' | 'EpaFifra' | 'Fcc' | 'Fws' | 'Cpsc' | 'Atf' | 'DotNhtsa';
export type PgaHoldStatus   = 'Active' | 'Released' | 'Refused' | 'Withdrawn';
export type AtmStatus       = 'Active' | 'Expired' | 'Revoked';
export type ReleaseOrderType   = 'TurnoverOrder' | 'DeliveryOrder' | 'ReleaseInstruction' | 'LetterOfGuarantee';
export type ReleaseOrderStatus = 'Draft' | 'Issued' | 'Picked' | 'Cancelled';
export type InBondType      = 'It' | 'Te' | 'Wd';
export type InBondStatus    = 'Open' | 'InTransit' | 'Arrived' | 'Closed' | 'Cancelled';
export type HoldExamType    = 'Hold' | 'Exam' | 'Both';
export type HoldExamStatus  = 'Open' | 'Resolved' | 'Released' | 'Refused';
export type AbiDirection    = 'Out' | 'In';
export type AbiMessageStatus= 'Pending' | 'Sent' | 'AckReceived' | 'Rejected' | 'Failed';

export interface EntryDto {
  id: number; tenantId: number; shipmentId: number | null; entryNumber: string | null;
  filerCode: string; entryType: string; entryTypeDescription: string | null;
  importerOfRecordId: number; importerName: string | null; importerEin: string;
  bondId: number | null;
  carrierScac: string; vesselName: string | null; voyageNumber: string | null;
  portOfUnladingCode: string; portOfEntryCode: string; firmsCode: string | null;
  entryDate: string; importDate: string; releaseDate: string | null;
  billOfLading: string | null; abiStatus: AbiStatus; cbpStatusMessage: string | null;
  pgaHoldFlag: boolean; examType: ExamType;
  totalValueUsd: number | null; dutyAmountUsd: number | null;
  mpfUsd: number | null; hmfUsd: number | null; totalFeesUsd: number | null;
  lineCount: number; activePgaHoldCount: number; openHoldExamCount: number;
  createdAt: string; submittedAt: string | null; releasedAt: string | null;
}

export interface EntryLineDto {
  id: number; entryId: number; lineNumber: number; htsNumber: string; description: string;
  countryOfOrigin: string; quantity: number; unitOfMeasure: string; netWeightKg: number | null;
  invoiceValueUsd: number; invoiceCurrency: string; invoiceValueOrig: number; fxRate: number | null;
  dutyRatePct: number | null; dutyAmountUsd: number | null;
  addCaseNumber: string | null; cvdCaseNumber: string | null;
  addRatePct: number | null; cvdRatePct: number | null;
  specialProgram: string | null;
  fdaRequired: boolean; usdaRequired: boolean; epaRequired: boolean; fccRequired: boolean;
  manufacturerIdCode: string | null;
}

export interface BondDto {
  id: number; bondNumber: string; bondType: BondType; suretyCode: string; suretyName: string;
  importerPartyId: number; importerName: string | null;
  amountUsd: number; effectiveFrom: string; effectiveTo: string | null;
  status: BondStatus; utilizationPct: number; notes: string | null;
}

export interface AtmDto {
  id: number; importerPartyId: number; importerName: string | null;
  brokerFilerCode: string; combinedWithPoa: boolean;
  signedAt: string; effectiveFrom: string; effectiveTo: string | null;
  signerName: string; signerTitle: string | null; status: AtmStatus; notes: string | null;
}

export interface ReleaseOrderDto {
  id: number; entryId: number; orderType: ReleaseOrderType; referenceNumber: string;
  carrierPartyId: number | null; warehousePartyId: number | null;
  issuedAt: string; cargoPickupAt: string | null; status: ReleaseOrderStatus; notes: string | null;
}

export interface IsfDto {
  id: number; shipmentId: number; importerOfRecordId: number; importerName: string | null;
  importerNumber: string; sellerName: string | null; buyerName: string | null;
  shipToName: string | null; manufacturerName: string | null;
  countryOfOrigin: string | null; hts6: string | null;
  containerStuffingLocation: string | null; consolidatorName: string | null;
  filingStatus: IsfStatus; filedAt: string | null; vesselLoadCutoff: string | null; bondId: number | null;
}

export interface PgaHoldDto {
  id: number; entryId: number; entryNumber: string | null;
  pgaCode: PgaCode; holdReasonCode: string | null; holdReasonText: string | null;
  status: PgaHoldStatus; raisedAt: string; releasedAt: string | null; resolutionNote: string | null;
}

export interface HoldExamDto {
  id: number; entryId: number; entryNumber: string | null;
  noticeType: HoldExamType; examType: ExamType;
  holdReasonCode: string | null; holdReasonText: string | null;
  examSite: string | null; examAppointmentAt: string | null;
  status: HoldExamStatus; raisedAt: string; resolvedAt: string | null; resolutionNote: string | null;
}

export interface InBondDto {
  id: number; entryId: number | null; inBondNumber: string; inBondType: InBondType;
  carrierScac: string; originPortCode: string; destinationPortCode: string;
  initiatedAt: string; arrivedAt: string | null; status: InBondStatus; notes: string | null;
}

export interface AbiMessageDto {
  id: number; entryId: number | null; messageCode: string; direction: AbiDirection;
  status: AbiMessageStatus; attemptCount: number; cbpReference: string | null;
  createdAt: string; sentAt: string | null; acknowledgedAt: string | null; failureReason: string | null;
}

export interface EntryDetailDto {
  entry: EntryDto;
  lines: EntryLineDto[];
  pgaHolds: PgaHoldDto[];
  holdExams: HoldExamDto[];
  releaseOrders: ReleaseOrderDto[];
  abiMessages: AbiMessageDto[];
  bond: BondDto | null;
}
