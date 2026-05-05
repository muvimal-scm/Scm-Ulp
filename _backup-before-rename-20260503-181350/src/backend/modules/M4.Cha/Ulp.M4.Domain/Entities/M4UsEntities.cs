using NodaTime;

namespace Ulp.M4.Domain.Entities;

// =====================================================================
// M4-US Customs entities (per sealed LLD ULP_LLD_M4_US_CBP_ABI_v1.0.docx).
// All m4us_* tables map here. Country-agnostic M4 entities (when M4-Core
// gets its sealed LLD) will live in a separate file.
// =====================================================================

public sealed class CustomsEntry
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long? ShipmentId { get; set; }
    public string? EntryNumber { get; set; }
    public string FilerCode { get; set; } = "";
    public string EntryType { get; set; } = "";
    public string? EntryTypeDescription { get; set; }
    public long ImporterOfRecordId { get; set; }
    public string ImporterEin { get; set; } = "";
    public long? ConsigneeId { get; set; }
    public long? UltimateConsigneeId { get; set; }
    public long? BondId { get; set; }
    public string CarrierScac { get; set; } = "";
    public string? VesselName { get; set; }
    public string? VoyageNumber { get; set; }
    public string PortOfUnladingCode { get; set; } = "";
    public string PortOfEntryCode { get; set; } = "";
    public string? FirmsCode { get; set; }
    public LocalDate EntryDate { get; set; }
    public LocalDate ImportDate { get; set; }
    public LocalDate? EstimatedArrivalDate { get; set; }
    public LocalDate? ReleaseDate { get; set; }
    public string? BillOfLading { get; set; }
    public string? ScacBillId { get; set; }
    public string? InBondNumber { get; set; }
    public AbiStatus AbiStatus { get; set; } = AbiStatus.Draft;
    public string? CbpStatusMessage { get; set; }
    public bool PgaHoldFlag { get; set; }
    public ExamType ExamType { get; set; } = ExamType.Nil;
    public decimal? TotalValueUsd { get; set; }
    public decimal? DutyAmountUsd { get; set; }
    public decimal? MpfUsd { get; set; }
    public decimal? HmfUsd { get; set; }
    public decimal? TotalFeesUsd { get; set; }
    public Instant CreatedAt { get; set; }
    public long CreatedBy { get; set; }
    public Instant? SubmittedAt { get; set; }
    public Instant? ReleasedAt { get; set; }
    public Instant? LiquidatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum AbiStatus { Draft, Submitted, Accepted, Rejected, Released, Hold, Exam, Liquidated, Cancelled }
public enum ExamType  { Nil, Xray, Intensive, Cet, Tailgate }

public sealed class CustomsEntryLine
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long EntryId { get; set; }
    public int LineNumber { get; set; }
    public string HtsNumber { get; set; } = "";
    public string Description { get; set; } = "";
    public string CountryOfOrigin { get; set; } = "";
    public decimal Quantity { get; set; }
    public string UnitOfMeasure { get; set; } = "";
    public decimal? NetWeightKg { get; set; }
    public decimal InvoiceValueUsd { get; set; }
    public string InvoiceCurrency { get; set; } = "USD";
    public decimal InvoiceValueOrig { get; set; }
    public decimal? FxRate { get; set; }
    public decimal? DutyRatePct { get; set; }
    public decimal? DutySpecific { get; set; }
    public decimal? DutyAmountUsd { get; set; }
    public string? AddCaseNumber { get; set; }
    public string? CvdCaseNumber { get; set; }
    public decimal? AddRatePct { get; set; }
    public decimal? CvdRatePct { get; set; }
    public string? SpecialProgram { get; set; }
    public decimal? PreferentialTreatmentPct { get; set; }
    public bool FdaRequired { get; set; }
    public bool UsdaRequired { get; set; }
    public bool EpaRequired { get; set; }
    public bool FccRequired { get; set; }
    public string? ManufacturerIdCode { get; set; }
}

public sealed class CustomsBond
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string BondNumber { get; set; } = "";
    public BondType BondType { get; set; }
    public string SuretyCode { get; set; } = "";
    public string SuretyName { get; set; } = "";
    public long ImporterPartyId { get; set; }
    public decimal AmountUsd { get; set; }
    public LocalDate EffectiveFrom { get; set; }
    public LocalDate? EffectiveTo { get; set; }
    public BondStatus Status { get; set; } = BondStatus.Active;
    public decimal UtilizationPct { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum BondType   { SingleTransaction, Continuous }
public enum BondStatus { Active, Expired, Cancelled }

public sealed class IsfFiling
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long ShipmentId { get; set; }
    public long ImporterOfRecordId { get; set; }
    public string ImporterNumber { get; set; } = "";
    public string? ConsigneeNumber { get; set; }
    public string? SellerName { get; set; }
    public string? SellerAddress { get; set; }
    public string? BuyerName { get; set; }
    public string? BuyerAddress { get; set; }
    public string? ShipToName { get; set; }
    public string? ShipToAddress { get; set; }
    public string? ManufacturerName { get; set; }
    public string? ManufacturerAddress { get; set; }
    public string? CountryOfOrigin { get; set; }
    public string? Hts6 { get; set; }
    public string? ContainerStuffingLocation { get; set; }
    public string? ConsolidatorName { get; set; }
    public IsfStatus FilingStatus { get; set; } = IsfStatus.Draft;
    public Instant? FiledAt { get; set; }
    public Instant? VesselLoadCutoff { get; set; }
    public long? BondId { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum IsfStatus { Draft, Filed, Match, NoMatch, Late, Amended, Cancelled }

public sealed class PgaHold
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long EntryId { get; set; }
    public PgaCode PgaCode { get; set; }
    public string? HoldReasonCode { get; set; }
    public string? HoldReasonText { get; set; }
    public PgaHoldStatus Status { get; set; } = PgaHoldStatus.Active;
    public Instant RaisedAt { get; set; }
    public Instant? ReleasedAt { get; set; }
    public long? ReleasedBy { get; set; }
    public string? ResolutionNote { get; set; }
}

public enum PgaCode { Fda, UsdaAphis, UsdaFsis, EpaTsca, EpaFifra, Fcc, Fws, Cpsc, Atf, DotNhtsa }
public enum PgaHoldStatus { Active, Released, Refused, Withdrawn }

public sealed class Atm                                        // Authority to Make Entry (combined with POA per CBP guidance)
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long ImporterPartyId { get; set; }
    public string BrokerFilerCode { get; set; } = "";
    public bool CombinedWithPoa { get; set; } = true;
    public LocalDate SignedAt { get; set; }
    public LocalDate EffectiveFrom { get; set; }
    public LocalDate? EffectiveTo { get; set; }
    public string SignerName { get; set; } = "";
    public string? SignerTitle { get; set; }
    public long? DocumentId { get; set; }
    public AtmStatus Status { get; set; } = AtmStatus.Active;
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum AtmStatus { Active, Expired, Revoked }

public sealed class ReleaseOrder
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long EntryId { get; set; }
    public ReleaseOrderType OrderType { get; set; }
    public string ReferenceNumber { get; set; } = "";
    public long? CarrierPartyId { get; set; }
    public long? WarehousePartyId { get; set; }
    public LocalDate IssuedAt { get; set; }
    public LocalDate? CargoPickupAt { get; set; }
    public ReleaseOrderStatus Status { get; set; } = ReleaseOrderStatus.Draft;
    public long? DocumentId { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum ReleaseOrderType { TurnoverOrder, DeliveryOrder, ReleaseInstruction, LetterOfGuarantee }
public enum ReleaseOrderStatus { Draft, Issued, Picked, Cancelled }

public sealed class InBondMove
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long? EntryId { get; set; }
    public string InBondNumber { get; set; } = "";
    public InBondType InBondType { get; set; }
    public string CarrierScac { get; set; } = "";
    public string OriginPortCode { get; set; } = "";
    public string DestinationPortCode { get; set; } = "";
    public long? BondedCarrierId { get; set; }
    public LocalDate InitiatedAt { get; set; }
    public LocalDate? ArrivedAt { get; set; }
    public InBondStatus Status { get; set; } = InBondStatus.Open;
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum InBondType   { It, Te, Wd }
public enum InBondStatus { Open, InTransit, Arrived, Closed, Cancelled }

public sealed class CustomsHoldExam
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long EntryId { get; set; }
    public HoldExamType NoticeType { get; set; }
    public ExamType ExamType { get; set; } = ExamType.Nil;
    public string? HoldReasonCode { get; set; }
    public string? HoldReasonText { get; set; }
    public string? ExamSite { get; set; }
    public Instant? ExamAppointmentAt { get; set; }
    public HoldExamStatus Status { get; set; } = HoldExamStatus.Open;
    public Instant RaisedAt { get; set; }
    public Instant? ResolvedAt { get; set; }
    public string? ResolutionNote { get; set; }
    public long? DocumentId { get; set; }
}

public enum HoldExamType   { Hold, Exam, Both }
public enum HoldExamStatus { Open, Resolved, Released, Refused }

public sealed class AbiMessage
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long? EntryId { get; set; }
    public string MessageCode { get; set; } = "";
    public AbiDirection Direction { get; set; }
    public string? PayloadRedacted { get; set; }
    public AbiMessageStatus Status { get; set; } = AbiMessageStatus.Pending;
    public int AttemptCount { get; set; }
    public string? CbpReference { get; set; }
    public Instant? AcknowledgedAt { get; set; }
    public string? FailureReason { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant? SentAt { get; set; }
}

public enum AbiDirection     { Out, In }
public enum AbiMessageStatus { Pending, Sent, AckReceived, Rejected, Failed }
