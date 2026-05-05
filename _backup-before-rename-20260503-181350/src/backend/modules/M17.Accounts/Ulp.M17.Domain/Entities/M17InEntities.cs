using NodaTime;

namespace Ulp.M17.Domain.Entities;

// =====================================================================
// M17-IN plugin extension entities — India compliance (per LLD §12)
// These tables are read/written by the IndiaTaxProvider plugin and the
// Indian-specific endpoints. The Core module is country-agnostic and never
// references these directly.
// =====================================================================

public sealed class GstRate
{
    public long Id { get; set; }
    public string HsnCode { get; set; } = "";
    public string? Description { get; set; }
    public decimal CgstRatePct { get; set; }
    public decimal SgstRatePct { get; set; }
    public decimal IgstRatePct { get; set; }
    public decimal CessRatePct { get; set; }
    public LocalDate EffectiveFrom { get; set; }
    public LocalDate? EffectiveTo { get; set; }
}

// LLD §5.2 plugin storage — India-specific invoice extension
public sealed class InvoiceExtIn
{
    public long InvoiceId { get; set; }                     // PK = FK to invoice
    public string? PlaceOfSupply { get; set; }              // state code
    public bool IsIntraState { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal CessAmount { get; set; }
    public bool ReverseCharge { get; set; }
    public bool IsExport { get; set; }
    public ExportType ExportType { get; set; } = ExportType.None;
}

public enum ExportType { Lut, Wpay, None }

// LLD §12.3 — IRN issued by IRP for B2B invoices > threshold
public sealed class Irn
{
    public long Id { get; set; }
    public long InvoiceId { get; set; }
    public string IrnValue { get; set; } = "";
    public string AckNo { get; set; } = "";
    public Instant AckDate { get; set; }
    public string? QrCodeB64 { get; set; }
    public string? SignedInvoiceB64 { get; set; }
    public string IrpProvider { get; set; } = "NIC1";
    public IrnStatus Status { get; set; } = IrnStatus.Generated;
    public Instant? CancelledAt { get; set; }
    public string? CancelReason { get; set; }
    public int FailureCount { get; set; }
    public string? LastError { get; set; }
    public Instant CreatedAt { get; set; }
}

public enum IrnStatus { Generated, Cancelled, Failed }

// LLD §12.4 — TDS sections
public sealed class TdsSection
{
    public long Id { get; set; }
    public string SectionCode { get; set; } = "";
    public string Description { get; set; } = "";
    public TdsPayeeType PayeeType { get; set; }
    public decimal RatePct { get; set; }
    public decimal ThresholdAmount { get; set; }
    public LocalDate EffectiveFrom { get; set; }
    public LocalDate? EffectiveTo { get; set; }
}

public enum TdsPayeeType { Individual, Huf, Company, Firm, Other }

// LLD §6.2 plugin extension — India-specific bill extension (TDS)
public sealed class BillExtIn
{
    public long BillId { get; set; }                        // PK = FK to bill
    public string? TdsSectionCode { get; set; }
    public decimal? TdsRatePct { get; set; }
    public decimal TdsAmount { get; set; }
    public string? VendorPan { get; set; }
    public string? VendorGstin { get; set; }
    public bool IsReverseCharge { get; set; }
}

// LLD §12.5 — GSTR returns runs
public sealed class GstrRun
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public GstrReturnType ReturnType { get; set; }
    public long PeriodId { get; set; }
    public LocalDate PrepDate { get; set; }
    public GstrRunStatus Status { get; set; } = GstrRunStatus.Draft;
    public decimal TotalTaxable { get; set; }
    public decimal TotalCgst { get; set; }
    public decimal TotalSgst { get; set; }
    public decimal TotalIgst { get; set; }
    public decimal TotalCess { get; set; }
    public string? OutputJson { get; set; }
    public Instant? FiledAt { get; set; }
    public string? AckReference { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum GstrReturnType { Gstr1, Gstr3B, Gstr9, Gstr9C }
public enum GstrRunStatus { Draft, Prepared, Filed, Failed }
