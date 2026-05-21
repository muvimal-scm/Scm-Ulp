export type DriverType         = 'CompanyEmployee' | 'OwnerOperator';
export type DriverAvailability = 'Available' | 'OnLoad' | 'OffDuty' | 'Sick' | 'Vacation' | 'OutOfService';
export type TruckOwnership     = 'CompanyOwned' | 'OwnerOperator' | 'Leased';
export type TruckStatus        = 'InService' | 'InMaintenance' | 'OutOfService' | 'Sold';
export type ChassisType        = 'Standard20' | 'Standard40' | 'TriAxle' | 'Light' | 'Gooseneck' | 'Reefer' | 'Other';
export type ChassisOwnership   = 'CompanyOwned' | 'Leased' | 'Pool';
export type ChassisStatus      = 'Available' | 'InUse' | 'InMaintenance' | 'OutOfService';
export type EquipmentKind      = 'Truck' | 'Chassis';
export type MaintType          = 'Pmi' | 'RepairBreakdown' | 'Inspection' | 'TireService' | 'BodyRepair' | 'Other';
export type MaintStatus        = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
export type MoveType           = 'Fcl' | 'Ltl' | 'Ftl' | 'Drayage' | 'LiveUnload' | 'DropAndPick';
export type ContainerSize      = 'Ft20' | 'Ft40' | 'Hc40' | 'Hc45' | 'Ft53' | 'Other';
export type JobAvailabilityStatus = 'NotReadyForPickup' | 'AvailablePendingAppointment' | 'Dispatched' | 'OutGated' | 'WaitingReturnNotify' | 'Completed' | 'Cancelled';
export type AccessorialCategory = 'Detention' | 'Demurrage' | 'Chassis' | 'PerDiem' | 'PreCool' | 'TonuDryRun' | 'LayoverWaitTime' | 'PortFee' | 'OtherSurcharge';
export type AccessorialUom     = 'Flat' | 'PerHour' | 'PerDay' | 'PerMile' | 'PerKg' | 'Other';
export type PodKind            = 'SignedPod' | 'GateReceiptOut' | 'GateReceiptIn' | 'EmptyReceipt' | 'PhotoEvidence' | 'Other';
export type AppointmentKind    = 'Pickup' | 'Delivery' | 'EmptyReturn';
export type AppointmentStatus  = 'Requested' | 'Confirmed' | 'Missed' | 'Rescheduled' | 'Cancelled' | 'Completed';

export interface DriverDto {
  id: number; driverCode: string; fullName: string; driverType: DriverType;
  licenseNumber?: string; licenseClass?: string;
  licenseExpiry?: string; twicCardExpiry?: string; medicalCardExpiry?: string;
  phone?: string; email?: string; currentTruckId?: number; currentTruckNumber?: string;
  availability: DriverAvailability; hireDate?: string; notes?: string; isActive: boolean;
}

export interface TruckDto {
  id: number; truckNumber: string; vin?: string; licensePlate?: string;
  make?: string; model?: string; year?: number; ownership: TruckOwnership;
  ownerPartyId?: number; ownerName?: string; status: TruckStatus;
  registrationExpiry?: string; insuranceExpiry?: string; notes?: string;
}

export interface ChassisDto {
  id: number; chassisNumber: string; chassisType: ChassisType; ownership: ChassisOwnership;
  poolProvider?: string; status: ChassisStatus;
  currentContainer?: string; currentLocation?: string; registrationExpiry?: string; notes?: string;
}

export interface EquipmentMaintDto {
  id: number; equipmentKind: EquipmentKind; equipmentId: number; equipmentLabel?: string;
  maintType: MaintType; description: string;
  startDate: string; endDate?: string; costAmount?: number; status: MaintStatus; notes?: string;
}

export interface JobListDto {
  id: number; jobNumber: string; customerPartyId: number; customerName?: string;
  custRef?: string; moveType: MoveType;
  containerNumber?: string; containerSize?: ContainerSize;
  puLocation?: string; puDate?: string; delLocation?: string; delDate?: string;
  etaDate?: string; lfdDate?: string;
  driverId?: number; driverName?: string; truckId?: number; truckNumber?: string;
  chassisId?: number; chassisNumber?: string;
  availabilityStatus: JobAvailabilityStatus; holdReason?: string;
  accessorialCount: number; accessorialTotalAmount: number; accessorialCurrency: string;
  podCount: number;
  dispatchedAt?: string; outgatedAt?: string; completedAt?: string;
}

export interface JobDetailDto {
  header: JobListDto;
  blNumber?: string; sslCode?: string; weightKg?: number;
  puTime?: string; delTime?: string;
  puAppointmentRequired: boolean; delAppointmentRequired: boolean;
  emptyReadyDate?: string; returnLocation?: string; returnDate?: string;
  returnTime?: string; returnNumber?: string; notes?: string;
  statusEvents: JobStatusEventDto[];
  accessorials: JobAccessorialDto[];
  pods: PodDto[];
  appointments: AppointmentDto[];
}

export interface JobStatusEventDto {
  id: number; fromStatus?: string; toStatus: string; occurredAt: string;
  driverId?: number; driverName?: string; locationText?: string; notes?: string;
}

export interface AccessorialDto {
  id: number; code: string; name: string; category: AccessorialCategory;
  defaultRate: number; currency: string; uom: AccessorialUom; freeUnits?: number; isActive: boolean;
}

export interface JobAccessorialDto {
  id: number; jobId: number; jobNumber?: string; accessorialId: number;
  accessorialCode: string; accessorialName: string; category: AccessorialCategory;
  occurredAt: string; quantity: number; rate: number; amount: number;
  currency: string; notes?: string; isBilled: boolean; source: string;
}

export interface PodDto {
  id: number; jobId: number; podKind: PodKind; signedByName?: string; signedAt: string;
  signatureRef?: string; documentId?: number;
  geoLat?: number; geoLon?: number; notes?: string;
}

export interface AppointmentDto {
  id: number; jobId: number; jobNumber?: string; appointmentKind: AppointmentKind;
  appointmentDt: string; durationMin?: number; facilityName?: string;
  confirmationNumber?: string; status: AppointmentStatus; notes?: string;
}

export interface DispatchBoardDto {
  day: string;
  availableDrivers: DriverDto[];
  availableChassis: ChassisDto[];
  jobsAwaitingDispatch: JobListDto[];
  jobsInProgress: JobListDto[];
}
