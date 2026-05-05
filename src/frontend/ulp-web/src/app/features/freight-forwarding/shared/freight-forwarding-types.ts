/**
 * M5 Freight Forwarding â€” DTOs that mirror src/backend/.../Ulp.FreightForwarding.Application/Contracts.cs.
 */

export type TradeDirection = 'Import' | 'Export' | 'CrossTrade' | 'Domestic';
export type TransportMode  = 'Air' | 'OceanFcl' | 'OceanLcl' | 'Road' | 'Rail' | 'Multimodal';
export type ServiceType    = 'DoorDoor' | 'DoorPort' | 'PortDoor' | 'PortPort';
export type BookingStatus  = 'Draft' | 'Confirmed' | 'InTransit' | 'Discharged' | 'Delivered' | 'Cancelled' | 'Closed';
export type ShipmentStatus = 'Booked' | 'Loaded' | 'Departed' | 'InTransit' | 'Arrived' | 'Discharged' | 'GateOut' | 'Delivered' | 'Cancelled';
export type ContainerStatus = 'Empty' | 'Loading' | 'Loaded' | 'OnVessel' | 'Discharged' | 'GatedOut' | 'Returned';
export type BlType         = 'Ocean' | 'Air' | 'Road' | 'Rail';
export type ReleaseType    = 'Original' | 'Telex' | 'Seaway' | 'Express' | 'Surrender';
export type BlStatus       = 'Draft' | 'Issued' | 'Released' | 'Cancelled';
export type AwbType        = 'Master' | 'House';
export type AwbStatus      = 'Draft' | 'Issued' | 'Cancelled';
export type MilestoneSource = 'System' | 'Edi' | 'Manual' | 'CarrierApi' | 'Gps';
export type ChargeInvoiceStatus = 'Pending' | 'Invoiced' | 'Paid' | 'Disputed';
export type DemurrageType  = 'Demurrage' | 'Detention' | 'PerDiem';
export type DemurrageStatus = 'Accruing' | 'Settled' | 'Disputed';
export type ConsolType     = 'AirConsol' | 'SeaLcl' | 'RoadConsol';
export type ConsolStatus   = 'Open' | 'Sealed' | 'Departed' | 'Closed';

export interface BookingDto {
  id: number;
  tenantId: number;
  countryCode: string;
  bookingNumber: string;
  customerPartyId: number;
  tradeDirection: TradeDirection;
  mode: TransportMode;
  serviceType: ServiceType;
  incoterm: string | null;
  originPortId: number;
  destinationPortId: number;
  expectedPickupDate: string | null;
  expectedDeliveryDate: string | null;
  status: BookingStatus;
  totalPieces: number | null;
  totalGrossWeightKg: number | null;
  totalVolumeCbm: number | null;
  declaredValueAmount: number | null;
  declaredValueCurrency: string | null;
  lineCount: number;
  createdAt: string;
  modifiedAt: string;
}

export interface BookingLineDto {
  id: number;
  bookingId: number;
  lineNumber: number;
  description: string;
  hsCode: string | null;
  pieces: number | null;
  packagingType: string | null;
  grossWeightKg: number | null;
  volumeCbm: number | null;
  isHazmat: boolean;
  isPerishable: boolean;
}

export interface BookingDetailDto { booking: BookingDto; lines: BookingLineDto[]; }

export interface ShipmentDto {
  id: number;
  tenantId: number;
  countryCode: string;
  shipmentNumber: string;
  bookingId: number | null;
  mode: TransportMode;
  carrierPartyId: number;
  vesselOrFlight: string | null;
  voyageOrFlightNo: string | null;
  etd: string | null;
  eta: string | null;
  atd: string | null;
  ata: string | null;
  originPortId: number;
  destinationPortId: number;
  status: ShipmentStatus;
  containerCount: number;
  milestoneCount: number;
  isStarred: boolean;          // SCM Milestone 1+2: starred by the calling user
  activeHoldCount: number;     // SCM Milestone 1+2
  dueReminderCount: number;    // SCM Milestone 1+2
  createdAt: string;
  modifiedAt: string;
  tradeDirection: TradeDirection | null; // CP13 v2 delta: surfaced for Ocean/Air × Imp/Exp tab filter
}

export interface LandedCostDto {
  shipmentId: number;
  currency: string;
  freightAmount: number;
  brokerageAmount: number;
  dutyAmount: number;
  accessorialsAmount: number;
  otherAmount: number;
  totalAmount: number;
}

export interface MblDto {
  id: number; shipmentId: number; countryCode: string; mblNumber: string;
  blType: BlType; issuedByCarrierPartyId: number; releaseType: ReleaseType;
  issueDate: string | null; onBoardDate: string | null; documentId: number | null; status: BlStatus;
}

export interface HblDto {
  id: number; mblId: number | null; countryCode: string; hblNumber: string;
  shipperPartyId: number | null; consigneePartyId: number | null; notifyPartyId: number | null;
  releaseType: ReleaseType; issueDate: string | null; documentId: number | null; status: BlStatus;
}

export interface AwbDto {
  id: number; shipmentId: number; awbType: AwbType; awbNumber: string;
  parentAwbId: number | null; iataCarrierCode: string | null; flightNumber: string | null;
  documentId: number | null; status: AwbStatus;
}

export interface ContainerDto {
  id: number; shipmentId: number; containerNumber: string; containerType: string;
  sealNumber: string | null; tareWeightKg: number | null; cargoWeightKg: number | null;
  packedAt: string | null; loadedAt: string | null; dischargedAt: string | null;
  gateOutAt: string | null; freeDays: number | null; status: ContainerStatus;
}

export interface MilestoneDto {
  id: number; shipmentId: number; milestoneCode: string; occurredAt: string;
  locationPortId: number | null; source: MilestoneSource; remarks: string | null;
}

export interface ChargeLineDto {
  id: number; shipmentId: number; chargeCode: string; rateCardId: number | null;
  quantity: number | null; uomCode: string | null;
  unitPriceAmount: number | null; unitPriceCurrency: string | null;
  amountAmount: number | null; amountCurrency: string | null;
  isBillable: boolean; invoiceStatus: ChargeInvoiceStatus;
}

// SCM Milestone 1 â€” internal memo notes per shipment
export interface ShipmentMemoDto {
  id: number; shipmentId: number; authorUserId: number | null;
  body: string; isPinned: boolean; createdAt: string;
}

export interface ShipmentDetailDto {
  shipment: ShipmentDto;
  containers: ContainerDto[];
  milestones: MilestoneDto[];
  mbls: MblDto[];
  awbs: AwbDto[];
  charges: ChargeLineDto[];
}

export interface ConsolDto {
  id: number; consolNumber: string; consolType: ConsolType;
  masterShipmentId: number; status: ConsolStatus; createdAt: string;
}

export interface DemurrageEventDto {
  id: number; containerId: number; eventType: DemurrageType;
  startDate: string; endDate: string | null; days: number | null;
  rateAmount: number | null; rateCurrency: string | null;
  totalAmount: number | null; totalCurrency: string | null; status: DemurrageStatus;
}

// SCM Milestone 1+2 â€” Holds + Reminders
// CP13 v2 client doc typology adds Bl / Freight / TerminalFees as the
// canonical hold categories. Pga/MissingDoc/etc. retained for legacy rows.
export type HoldType       = 'Customs' | 'Pga' | 'MissingDoc' | 'CustomerDispute' | 'Payment' | 'Operations' | 'Other' | 'Bl' | 'Freight' | 'TerminalFees';
export type ReminderKind   = 'FollowUp' | 'DocDue' | 'PodFollowup' | 'ReturnDue' | 'PaymentDue' | 'Custom';
export type ReminderStatus = 'Pending' | 'Sent' | 'Snoozed' | 'Dismissed' | 'Done';

export interface ShipmentHoldDto {
  id: number; shipmentId: number;
  holdType: HoldType; reason: string;
  raisedBy: number | null; raisedAt: string;
  clearedBy: number | null; clearedAt: string | null;
  resolutionNote: string | null;
  isActive: boolean;
}

export interface ShipmentReminderDto {
  id: number; shipmentId: number; containerId: number | null;
  reminderKind: ReminderKind; title: string; notes: string | null;
  dueAt: string; assignedUserSub: string | null;
  status: ReminderStatus;
  createdAt: string; modifiedAt: string;
  lastFiredAt: string | null;
}

export interface RemindersFiredDto { checkedCount: number; firedCount: number; failedCount: number; }

/* ===================== Request DTOs (mirror Ulp.FreightForwarding.Application) ===================== */

export interface CreateBookingRequest {
  countryCode: string;
  bookingNumber: string;
  customerPartyId: number;
  shipperPartyId?: number | null;
  consigneePartyId?: number | null;
  notifyPartyId?: number | null;
  tradeDirection: TradeDirection;
  mode: TransportMode;
  serviceType: ServiceType;
  incoterm?: string | null;
  originPortId: number;
  destinationPortId: number;
  expectedPickupDate?: string | null;     // ISO date YYYY-MM-DD
  expectedDeliveryDate?: string | null;
  declaredValueAmount?: number | null;
  declaredValueCurrency?: string | null;
  estimatedCrd?: string | null;
  ffAssignedPartyId?: number | null;
  remarks?: string | null;
}

export interface CreateShipmentRequest {
  countryCode: string;
  shipmentNumber: string;
  bookingId?: number | null;
  mode: TransportMode;
  carrierPartyId: number;
  vesselOrFlight?: string | null;
  voyageOrFlightNo?: string | null;
  etd?: string | null;                    // ISO 8601 with offset
  eta?: string | null;
  originPortId: number;
  destinationPortId: number;
  remarks?: string | null;
}

export interface CreateMblRequest {
  countryCode: string;
  mblNumber: string;
  blType: BlType;
  issuedByCarrierPartyId: number;
  releaseType: ReleaseType;
  issueDate?: string | null;
  onBoardDate?: string | null;
}

export interface CreateHblRequest {
  countryCode: string;
  mblId?: number | null;
  hblNumber: string;
  shipperPartyId?: number | null;
  consigneePartyId?: number | null;
  notifyPartyId?: number | null;
  releaseType: ReleaseType;
  issueDate?: string | null;
}

export interface CreateAwbRequest {
  awbType: AwbType;
  awbNumber: string;
  parentAwbId?: number | null;
  iataCarrierCode?: string | null;
  flightNumber?: string | null;
}

export interface CreateContainerRequest {
  containerNumber: string;
  containerType: string;
  sealNumber?: string | null;
  tareWeightKg?: number | null;
  cargoWeightKg?: number | null;
  freeDays?: number | null;
}
