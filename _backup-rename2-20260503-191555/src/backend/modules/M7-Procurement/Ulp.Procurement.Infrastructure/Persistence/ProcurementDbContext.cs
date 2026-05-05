using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Procurement.Domain.Entities;

namespace Ulp.Procurement.Infrastructure.Persistence;

public sealed class ProcurementDbContext(DbContextOptions<ProcurementDbContext> options) : DbContext(options)
{
    public DbSet<PurchaseRequest>     Prs           => Set<PurchaseRequest>();
    public DbSet<PurchaseRequestLine> PrLines       => Set<PurchaseRequestLine>();
    public DbSet<Rfq>                 Rfqs          => Set<Rfq>();
    public DbSet<RfqRecipient>        RfqRecipients => Set<RfqRecipient>();
    public DbSet<RfqResponse>         RfqResponses  => Set<RfqResponse>();
    public DbSet<PurchaseOrder>       Pos           => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLine>   PoLines       => Set<PurchaseOrderLine>();
    public DbSet<GoodsReceipt>        Grns          => Set<GoodsReceipt>();
    public DbSet<GoodsReceiptLine>    GrnLines      => Set<GoodsReceiptLine>();
    public DbSet<InvoiceMatch>        Matches       => Set<InvoiceMatch>();
    public DbSet<M7Audit>             Audits        => Set<M7Audit>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<PurchaseRequest>(e =>
        {
            e.ToTable("m7_purchase_request");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.PrNumber).HasColumnName("pr_number").HasMaxLength(50);
            e.Property(x => x.RequestedBy).HasColumnName("requested_by");
            e.Property(x => x.Department).HasColumnName("department").HasMaxLength(100);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.NeededBy).HasColumnName("needed_by").HasConversion(NullableLocalDate);
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<PurchaseRequestLine>(e =>
        {
            e.ToTable("m7_purchase_request_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.PrId).HasColumnName("pr_id");
            e.Property(x => x.LineNo).HasColumnName("line_no");
            e.Property(x => x.ProductId).HasColumnName("product_id");
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            e.Property(x => x.Quantity).HasColumnName("quantity").HasPrecision(12, 4);
            e.Property(x => x.UomCode).HasColumnName("uom_code").HasMaxLength(10);
            e.Property(x => x.EstimatedUnitPriceAmount).HasColumnName("estimated_unit_price_amount").HasPrecision(18, 4);
            e.Property(x => x.EstimatedUnitPriceCurrency).HasColumnName("estimated_unit_price_currency").HasMaxLength(3).IsFixedLength();
        });

        b.Entity<Rfq>(e =>
        {
            e.ToTable("m7_rfq");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.RfqNumber).HasColumnName("rfq_number").HasMaxLength(50);
            e.Property(x => x.DueDate).HasColumnName("due_date").HasConversion(NullableLocalDate);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.ScopePrId).HasColumnName("scope_pr_id");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<RfqRecipient>(e =>
        {
            e.ToTable("m7_rfq_recipient");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RfqId).HasColumnName("rfq_id");
            e.Property(x => x.VendorPartyId).HasColumnName("vendor_party_id");
            e.Property(x => x.SentAt).HasColumnName("sent_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ResponseStatus).HasColumnName("response_status").HasConversion<string>().HasMaxLength(15);
        });

        b.Entity<RfqResponse>(e =>
        {
            e.ToTable("m7_rfq_response");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RfqId).HasColumnName("rfq_id");
            e.Property(x => x.VendorPartyId).HasColumnName("vendor_party_id");
            e.Property(x => x.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 4);
            e.Property(x => x.TotalCurrency).HasColumnName("total_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.ValidUntil).HasColumnName("valid_until").HasConversion(NullableLocalDate);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.ReceivedAt).HasColumnName("received_at_utc").HasConversion(InstantConv);
            e.Property(x => x.IsWinner).HasColumnName("is_winner");
        });

        b.Entity<PurchaseOrder>(e =>
        {
            e.ToTable("m7_purchase_order");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.PoNumber).HasColumnName("po_number").HasMaxLength(50);
            e.Property(x => x.VendorPartyId).HasColumnName("vendor_party_id");
            e.Property(x => x.RfqId).HasColumnName("rfq_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 4);
            e.Property(x => x.TotalCurrency).HasColumnName("total_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.ExpectedDeliveryDate).HasColumnName("expected_delivery_date").HasConversion(NullableLocalDate);
            e.Property(x => x.PaymentTerms).HasColumnName("payment_terms").HasMaxLength(50);
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<PurchaseOrderLine>(e =>
        {
            e.ToTable("m7_purchase_order_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.PoId).HasColumnName("po_id");
            e.Property(x => x.LineNo).HasColumnName("line_no");
            e.Property(x => x.ProductId).HasColumnName("product_id");
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            e.Property(x => x.QuantityOrdered).HasColumnName("quantity_ordered").HasPrecision(12, 4);
            e.Property(x => x.QuantityReceived).HasColumnName("quantity_received").HasPrecision(12, 4);
            e.Property(x => x.UomCode).HasColumnName("uom_code").HasMaxLength(10);
            e.Property(x => x.UnitPriceAmount).HasColumnName("unit_price_amount").HasPrecision(18, 4);
            e.Property(x => x.UnitPriceCurrency).HasColumnName("unit_price_currency").HasMaxLength(3).IsFixedLength();
        });

        b.Entity<GoodsReceipt>(e =>
        {
            e.ToTable("m7_goods_receipt");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.PoId).HasColumnName("po_id");
            e.Property(x => x.GrnNumber).HasColumnName("grn_number").HasMaxLength(50);
            e.Property(x => x.ReceivedAt).HasColumnName("received_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ReceivedBy).HasColumnName("received_by");
            e.Property(x => x.M8GrnId).HasColumnName("m8_grn_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Remarks).HasColumnName("remarks");
        });

        b.Entity<GoodsReceiptLine>(e =>
        {
            e.ToTable("m7_goods_receipt_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.GrId).HasColumnName("gr_id");
            e.Property(x => x.PoLineId).HasColumnName("po_line_id");
            e.Property(x => x.QuantityReceived).HasColumnName("quantity_received").HasPrecision(12, 4);
            e.Property(x => x.Cond).HasColumnName("cond").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Remarks).HasColumnName("remarks").HasMaxLength(500);
        });

        b.Entity<InvoiceMatch>(e =>
        {
            e.ToTable("m7_invoice_match");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.PoId).HasColumnName("po_id");
            e.Property(x => x.VendorInvoiceId).HasColumnName("vendor_invoice_id");
            e.Property(x => x.VendorInvoiceNo).HasColumnName("vendor_invoice_no").HasMaxLength(50);
            e.Property(x => x.MatchStatus).HasColumnName("match_status").HasConversion(MatchToStr, StrToMatch).HasMaxLength(20);
            e.Property(x => x.VarianceAmount).HasColumnName("variance_amount").HasPrecision(18, 4);
            e.Property(x => x.VarianceCurrency).HasColumnName("variance_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.MatchedBy).HasColumnName("matched_by");
            e.Property(x => x.MatchedAt).HasColumnName("matched_at_utc").HasConversion(InstantConv);
            e.Property(x => x.Notes).HasColumnName("notes");
        });

        b.Entity<M7Audit>(e =>
        {
            e.ToTable("m7_audit");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntityType).HasColumnName("entity_type").HasConversion(EntityToStr, StrToEntity).HasMaxLength(15);
            e.Property(x => x.EntityId).HasColumnName("entity_id");
            e.Property(x => x.Action).HasColumnName("action").HasMaxLength(50);
            e.Property(x => x.PerformedBy).HasColumnName("performed_by");
            e.Property(x => x.PerformedAt).HasColumnName("performed_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DetailsJson).HasColumnName("details").HasColumnType("json");
        });
    }

    /* ===== explicit converters where SQL ENUM != C# ToString() ===== */

    // ENUM('ThreeWayMatched','PriceVariance','QtyVariance','NoPO','Disputed') â€” NoPO has odd casing
    private static System.Linq.Expressions.Expression<Func<MatchStatus, string>> MatchToStr => m =>
        m == MatchStatus.ThreeWayMatched ? "ThreeWayMatched" :
        m == MatchStatus.PriceVariance   ? "PriceVariance" :
        m == MatchStatus.QtyVariance     ? "QtyVariance" :
        m == MatchStatus.NoPO            ? "NoPO" :
                                           "Disputed";

    private static System.Linq.Expressions.Expression<Func<string, MatchStatus>> StrToMatch => s =>
        s == "ThreeWayMatched" ? MatchStatus.ThreeWayMatched :
        s == "PriceVariance"   ? MatchStatus.PriceVariance :
        s == "QtyVariance"     ? MatchStatus.QtyVariance :
        s == "NoPO"            ? MatchStatus.NoPO :
                                 MatchStatus.Disputed;

    // ENUM('PR','RFQ','PO','GRN','INVOICE_MATCH')
    private static System.Linq.Expressions.Expression<Func<M7EntityType, string>> EntityToStr => t =>
        t == M7EntityType.Pr           ? "PR" :
        t == M7EntityType.Rfq          ? "RFQ" :
        t == M7EntityType.Po           ? "PO" :
        t == M7EntityType.Grn          ? "GRN" :
                                         "INVOICE_MATCH";

    private static System.Linq.Expressions.Expression<Func<string, M7EntityType>> StrToEntity => s =>
        s == "PR"            ? M7EntityType.Pr :
        s == "RFQ"           ? M7EntityType.Rfq :
        s == "PO"            ? M7EntityType.Po :
        s == "GRN"           ? M7EntityType.Grn :
                               M7EntityType.InvoiceMatch;

    /* ===== shared NodaTime converters ===== */

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant, DateTime>
        InstantConv = new(
            v => v.ToDateTimeUtc(),
            v => Instant.FromDateTimeUtc(DateTime.SpecifyKind(v, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant?, DateTime?>
        NullableInstant = new(
            v => v == null ? null : v.Value.ToDateTimeUtc(),
            v => v == null ? null : Instant.FromDateTimeUtc(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<LocalDate?, DateTime?>
        NullableLocalDate = new(
            v => v == null ? null : new DateTime(v.Value.Year, v.Value.Month, v.Value.Day),
            v => v == null ? null : new LocalDate(v.Value.Year, v.Value.Month, v.Value.Day));
}
