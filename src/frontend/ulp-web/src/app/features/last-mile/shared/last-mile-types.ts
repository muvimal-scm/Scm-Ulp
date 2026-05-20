/**
 * M9 Last-Mile Delivery â€” DTOs that mirror src/backend/.../Ulp.LastMile.Application/Contracts.cs.
 */

export type CourierType          = 'Domestic' | 'International';
export type CourierBookingStatus = 'Created' | 'Scheduled' | 'PickedUp' | 'InTransit' | 'OutForDelivery' | 'Delivered' | 'Failed' | 'Returned' | 'Cancelled';
export type RouteType            = 'Pickup' | 'Delivery' | 'Mixed';
export type RouteStatus          = 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
export type StopType             = 'Pickup' | 'Delivery';
export type StopStatus           = 'Pending' | 'Arrived' | 'Completed' | 'Skipped' | 'Failed';
export type CodPaymentMethod     = 'Cash' | 'Card' | 'Upi' | 'Other';
export type CodSettledStatus     = 'Pending' | 'Deposited' | 'Settled' | 'Disputed';
export type AttemptStatus        = 'Delivered' | 'Failed' | 'PartiallyDelivered' | 'Refused';

export interface CourierBookingDto {
  id: number; tenantId: number; countryCode: string; bookingNumber: string;
  courierType: CourierType;
  shipperPartyId: number | null; consigneePartyId: number | null;
  pickupAddressId: number | null; deliveryAddressId: number | null;
  weightKg: number | null; pieces: number | null; serviceLevel: string | null;
  declaredValueAmount: number | null; declaredValueCurrency: string | null;
  codAmount: number | null; codCurrency: string | null;
  status: CourierBookingStatus;
  attemptCount: number; hasPod: boolean;
  createdAt: string; modifiedAt: string;
}

export interface PodDto {
  id: number; bookingId: number; signedBy: string | null;
  signatureImageDocId: number | null; photoDocId: number | null;
  gpsLat: number | null; gpsLng: number | null;
  capturedAt: string; capturedByUserId: number | null;
}

export interface CodDto {
  id: number; bookingId: number;
  amountCollected: number; currency: string;
  paymentMethod: CodPaymentMethod; collectedAt: string;
  settledStatus: CodSettledStatus; referenceNo: string | null;
}

export interface DeliveryAttemptDto {
  id: number; bookingId: number; attemptNo: number;
  attemptedAt: string; status: AttemptStatus;
  failureReason: string | null; nextAttemptDate: string | null;
}

export interface CourierBookingDetailDto {
  booking: CourierBookingDto;
  attempts: DeliveryAttemptDto[];
  pods: PodDto[];
  codCollections: CodDto[];
}

export interface RouteDto {
  id: number; countryCode: string; routeCode: string; name: string | null;
  routeType: RouteType; plannedDate: string; status: RouteStatus;
  driverUserId: number | null; vehicleNo: string | null; stopCount: number;
}

export interface RouteStopDto {
  id: number; routeId: number; sequence: number; countryCode: string;
  stopType: StopType; addressId: number | null; partyId: number | null; bookingId: number | null;
  expectedArrival: string | null; actualArrival: string | null; status: StopStatus;
}

export interface RouteDetailDto { route: RouteDto; stops: RouteStopDto[]; }

export interface ManifestDto {
  id: number; manifestNumber: string; routeId: number | null;
  courierType: CourierType; totalPieces: number | null; totalWeightKg: number | null;
  generatedAt: string; lineCount: number;
}

export interface ZoneRateDto {
  id: number; countryCode: string; zoneCode: string; courierType: CourierType;
  weightSlabFromKg: number; weightSlabToKg: number;
  rateAmount: number; rateCurrency: string;
  validFrom: string; validTo: string | null;
}

/* ===================== Request DTOs (mirror Ulp.LastMile.Application) ===================== */

export interface CreateCourierBookingRequest {
  countryCode: string;
  bookingNumber: string;
  courierType: CourierType;
  shipperPartyId?: number | null;
  consigneePartyId?: number | null;
  pickupAddressId?: number | null;
  deliveryAddressId?: number | null;
  weightKg?: number | null;
  pieces?: number | null;
  serviceLevel?: string | null;
  declaredValueAmount?: number | null;
  declaredValueCurrency?: string | null;
  codAmount?: number | null;
  codCurrency?: string | null;
}

export interface CreateRouteRequest {
  countryCode: string;
  routeCode: string;
  name?: string | null;
  routeType: RouteType;
  plannedDate: string;            // ISO date YYYY-MM-DD
  driverUserId?: number | null;
  vehicleNo?: string | null;
}

export interface CreatePodRequest {
  bookingId: number;
  signedBy?: string | null;
  signatureImageDocId?: number | null;
  photoDocId?: number | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  capturedAt: string;             // ISO 8601 with offset
  capturedByUserId?: number | null;
}

export interface CreateCodRequest {
  bookingId: number;
  amountCollected: number;
  currency: string;
  paymentMethod: CodPaymentMethod;
  collectedAt: string;            // ISO 8601 with offset
  referenceNo?: string | null;
}

// ===== Ocean Drayage =====
export interface OceanDrayageJobDto {
  id: number; tenantId: number; jobNumber: string; containerNumber: string;
  additionalRefs?: string; truckerPartyId?: number; availableForPickup: boolean;
  terminal?: string; pickupAppointment?: string; dropOffLocation?: string;
  dropOffAppointment?: string; tripType: string; status: string;
  specialInstructions?: string; shipmentId?: number; createdAt: string; modifiedAt: string;
}

export interface CreateOdJobRequest {
  jobNumber: string; containerNumber: string; additionalRefs?: string;
  truckerPartyId?: number; availableForPickup: boolean; terminal?: string;
  pickupAppointment?: string; dropOffLocation?: string; dropOffAppointment?: string;
  tripType: string; specialInstructions?: string; shipmentId?: number;
}

export interface UpdateOdJobRequest {
  containerNumber?: string; additionalRefs?: string; truckerPartyId?: number;
  availableForPickup?: boolean; terminal?: string; pickupAppointment?: string;
  dropOffLocation?: string; dropOffAppointment?: string; tripType?: string;
  status?: string; specialInstructions?: string;
}

// ===== Over-The-Road =====
export interface OtrJobDto {
  id: number; tenantId: number; jobNumber: string; trackingNumber?: string;
  additionalRefs?: string; pickUpLocation?: string; pickUpAppointment?: string;
  dropOffLocation?: string; dropOffAppointment?: string; tripType: string;
  status: string; specialInstructions?: string; truckerPartyId?: number;
  createdAt: string; modifiedAt: string;
}

export interface CreateOtrJobRequest {
  jobNumber: string; trackingNumber?: string; additionalRefs?: string;
  pickUpLocation?: string; pickUpAppointment?: string; dropOffLocation?: string;
  dropOffAppointment?: string; tripType: string; specialInstructions?: string;
  truckerPartyId?: number;
}

export interface UpdateOtrJobRequest {
  trackingNumber?: string; additionalRefs?: string; pickUpLocation?: string;
  pickUpAppointment?: string; dropOffLocation?: string; dropOffAppointment?: string;
  tripType?: string; status?: string; specialInstructions?: string;
}
