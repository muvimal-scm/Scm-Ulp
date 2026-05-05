using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NodaTime;
using Ulp.Accounting.Domain.Entities;
using Period = Ulp.Accounting.Domain.Entities.Period;

namespace Ulp.Accounting.Infrastructure.Persistence;

/// <summary>
/// EF Core context for M17 Accounts (Core + India plugin extension tables).
/// Mappings deliberately verbose because SQL ENUMs use SCREAMING_SNAKE while
/// .NET enums use PascalCase, and several columns need explicit converters.
/// </summary>
public sealed class AccountingDbContext(DbContextOptions<AccountingDbContext> options) : DbContext(options)
{
    // Core
    public DbSet<Account>             Accounts            => Set<Account>();
    public DbSet<Period>              Periods             => Set<Period>();
    public DbSet<FxRate>              FxRates             => Set<FxRate>();
    public DbSet<Journal>             Journals            => Set<Journal>();
    public DbSet<JournalLine>         JournalLines        => Set<JournalLine>();
    public DbSet<Invoice>             Invoices            => Set<Invoice>();
    public DbSet<InvoiceLine>         InvoiceLines        => Set<InvoiceLine>();
    public DbSet<Receipt>             Receipts            => Set<Receipt>();
    public DbSet<ReceiptMatch>        ReceiptMatches      => Set<ReceiptMatch>();
    public DbSet<Bill>                Bills               => Set<Bill>();
    public DbSet<BillLine>            BillLines           => Set<BillLine>();
    public DbSet<Payment>             Payments            => Set<Payment>();
    public DbSet<PaymentAlloc>        PaymentAllocs       => Set<PaymentAlloc>();
    public DbSet<CloseChecklist>      CloseChecklists     => Set<CloseChecklist>();
    public DbSet<CloseChecklistItem>  CloseChecklistItems => Set<CloseChecklistItem>();
    public DbSet<AuditLog>            AuditLogs           => Set<AuditLog>();

    // India plugin extension tables
    public DbSet<GstRate>             GstRates            => Set<GstRate>();
    public DbSet<InvoiceExtIn>        InvoiceExtensionsIn => Set<InvoiceExtIn>();
    public DbSet<Irn>                 Irns                => Set<Irn>();
    public DbSet<TdsSection>          TdsSections         => Set<TdsSection>();
    public DbSet<BillExtIn>           BillExtensionsIn    => Set<BillExtIn>();
    public DbSet<GstrRun>             GstrRuns            => Set<GstrRun>();

    // Keyless projection over m1_party (read-only) â€” used by AccountsService for legal_name lookups
    // without taking a project dependency on the M1 module.
    public DbSet<PartyLookup> PartyLookups => Set<PartyLookup>();

    // M17 finish â€” Milestone 3 closure tables
    public DbSet<SettlementLink>     SettlementLinks    => Set<SettlementLink>();
    public DbSet<BankAccount>        BankAccounts       => Set<BankAccount>();
    public DbSet<Deposit>            Deposits           => Set<Deposit>();
    public DbSet<BankStatement>      BankStatements     => Set<BankStatement>();
    public DbSet<BankStatementLine>  BankStatementLines => Set<BankStatementLine>();
    public DbSet<BankRecon>          BankRecons         => Set<BankRecon>();
    public DbSet<BankReconMatch>     BankReconMatches   => Set<BankReconMatch>();
    public DbSet<FundTransfer>       FundTransfers      => Set<FundTransfer>();
    public DbSet<VoidedCheck>        VoidedChecks       => Set<VoidedCheck>();
    public DbSet<CheckPrintBatch>    CheckPrintBatches  => Set<CheckPrintBatch>();
    public DbSet<InvoicePrintBatch>  InvoicePrintBatches=> Set<InvoicePrintBatch>();
    public DbSet<PastDueNotice>      PastDueNotices     => Set<PastDueNotice>();
    public DbSet<EmailTemplate>      EmailTemplates     => Set<EmailTemplate>();
    public DbSet<CreditCardPayment>  CreditCardPayments => Set<CreditCardPayment>();
    public DbSet<GeneralExpense>     GeneralExpenses    => Set<GeneralExpense>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // ----- m17_account -----
        b.Entity<Account>(e =>
        {
            e.ToTable("m17_account");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.AccountCode).HasColumnName("account_code").HasMaxLength(20);
            e.Property(x => x.AccountName).HasColumnName("account_name").HasMaxLength(150);
            e.Property(x => x.AccountClass).HasColumnName("account_class").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.ParentAccountId).HasColumnName("parent_account_id");
            e.Property(x => x.IsControlAccount).HasColumnName("is_control_account");
            e.Property(x => x.IsPostable).HasColumnName("is_postable");
            e.Property(x => x.DefaultCurrency).HasColumnName("default_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        // ----- m17_period -----
        b.Entity<Period>(e =>
        {
            e.ToTable("m17_period");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.FiscalYear).HasColumnName("fiscal_year");
            e.Property(x => x.PeriodNumber).HasColumnName("period_number");
            e.Property(x => x.PeriodName).HasColumnName("period_name").HasMaxLength(20);
            e.Property(x => x.StartDate).HasColumnName("start_date").HasConversion(LocalDateConv);
            e.Property(x => x.EndDate).HasColumnName("end_date").HasConversion(LocalDateConv);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.ClosedAt).HasColumnName("closed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ClosedBy).HasColumnName("closed_by");
            e.Property(x => x.ReopenedCount).HasColumnName("reopened_count");
        });

        // ----- m17_fx_rate -----
        b.Entity<FxRate>(e =>
        {
            e.ToTable("m17_fx_rate");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.FromCurrency).HasColumnName("from_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.ToCurrency).HasColumnName("to_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.RateDate).HasColumnName("rate_date").HasConversion(LocalDateConv);
            e.Property(x => x.Rate).HasColumnName("rate").HasPrecision(18, 8);
            e.Property(x => x.RateSource).HasColumnName("rate_source").HasMaxLength(30);
            e.Property(x => x.IsPeriodEnd).HasColumnName("is_period_end");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        // ----- m17_journal -----
        b.Entity<Journal>(e =>
        {
            e.ToTable("m17_journal");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.JournalNumber).HasColumnName("journal_number").HasMaxLength(30);
            e.Property(x => x.JournalType).HasColumnName("journal_type")
                .HasConversion(JournalTypeToStr, StrToJournalType).HasMaxLength(20);
            e.Property(x => x.PostingDate).HasColumnName("posting_date").HasConversion(LocalDateConv);
            e.Property(x => x.PeriodId).HasColumnName("period_id");
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.SourceModule).HasColumnName("source_module").HasMaxLength(20);
            e.Property(x => x.SourceRecordId).HasColumnName("source_record_id");
            e.Property(x => x.IsPosted).HasColumnName("is_posted");
            e.Property(x => x.IsReversed).HasColumnName("is_reversed");
            e.Property(x => x.ReversalJournalId).HasColumnName("reversal_journal_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.PostedAt).HasColumnName("posted_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.PostedBy).HasColumnName("posted_by");
        });

        // ----- m17_journal_line -----
        b.Entity<JournalLine>(e =>
        {
            e.ToTable("m17_journal_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.JournalId).HasColumnName("journal_id");
            e.Property(x => x.LineNumber).HasColumnName("line_number");
            e.Property(x => x.AccountId).HasColumnName("account_id");
            e.Property(x => x.AmountOrig).HasColumnName("amount_orig").HasPrecision(18, 4);
            e.Property(x => x.CurrencyOrig).HasColumnName("currency_orig").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.AmountFunc).HasColumnName("amount_func").HasPrecision(18, 4);
            e.Property(x => x.CurrencyFunc).HasColumnName("currency_func").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.FxRate).HasColumnName("fx_rate").HasPrecision(18, 8);
            e.Property(x => x.FxRateDate).HasColumnName("fx_rate_date").HasConversion(LocalDateConv);
            e.Property(x => x.DebitCredit).HasColumnName("debit_credit")
                .HasConversion(DcToStr, StrToDc).HasMaxLength(2);
            e.Property(x => x.CostCenterId).HasColumnName("cost_center_id");
            e.Property(x => x.ProjectId).HasColumnName("project_id");
            e.Property(x => x.PartyId).HasColumnName("party_id");
            e.Property(x => x.Reference).HasColumnName("reference").HasMaxLength(100);
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
        });

        // ----- m17_invoice -----
        b.Entity<Invoice>(e =>
        {
            e.ToTable("m17_invoice");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.InvoiceNumber).HasColumnName("invoice_number").HasMaxLength(40);
            e.Property(x => x.InvoiceDate).HasColumnName("invoice_date").HasConversion(LocalDateConv);
            e.Property(x => x.DueDate).HasColumnName("due_date").HasConversion(LocalDateConv);
            e.Property(x => x.CustomerPartyId).HasColumnName("customer_party_id");
            e.Property(x => x.BillToAddress).HasColumnName("bill_to_address").HasMaxLength(500);
            e.Property(x => x.ShipToAddress).HasColumnName("ship_to_address").HasMaxLength(500);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.FuncCurrency).HasColumnName("func_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.FxRate).HasColumnName("fx_rate").HasPrecision(18, 8);
            e.Property(x => x.SubtotalAmount).HasColumnName("subtotal_amount").HasPrecision(18, 4);
            e.Property(x => x.TaxAmount).HasColumnName("tax_amount").HasPrecision(18, 4);
            e.Property(x => x.DiscountAmount).HasColumnName("discount_amount").HasPrecision(18, 4);
            e.Property(x => x.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 4);
            e.Property(x => x.PaidAmount).HasColumnName("paid_amount").HasPrecision(18, 4);
            e.Property(x => x.PaymentTerms).HasColumnName("payment_terms").HasMaxLength(50);
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.PostedJournalId).HasColumnName("posted_journal_id");
            e.Property(x => x.PostedAt).HasColumnName("posted_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.PostedBy).HasColumnName("posted_by");
            e.Property(x => x.VoidReason).HasColumnName("void_reason").HasMaxLength(500);
            e.Property(x => x.SourceModule).HasColumnName("source_module").HasMaxLength(20);
            e.Property(x => x.SourceRecordId).HasColumnName("source_record_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        // ----- m17_invoice_line -----
        b.Entity<InvoiceLine>(e =>
        {
            e.ToTable("m17_invoice_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.InvoiceId).HasColumnName("invoice_id");
            e.Property(x => x.LineNumber).HasColumnName("line_number");
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.HsnCode).HasColumnName("hsn_code").HasMaxLength(20);
            e.Property(x => x.Quantity).HasColumnName("quantity").HasPrecision(12, 4);
            e.Property(x => x.UomCode).HasColumnName("uom_code").HasMaxLength(10);
            e.Property(x => x.UnitPriceAmount).HasColumnName("unit_price_amount").HasPrecision(18, 4);
            e.Property(x => x.UnitPriceCurrency).HasColumnName("unit_price_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.LineAmount).HasColumnName("line_amount").HasPrecision(18, 4);
            e.Property(x => x.TaxClass).HasColumnName("tax_class").HasMaxLength(50);
            e.Property(x => x.TaxRatePct).HasColumnName("tax_rate_pct").HasPrecision(7, 4);
            e.Property(x => x.TaxAmount).HasColumnName("tax_amount").HasPrecision(18, 4);
            e.Property(x => x.AccountId).HasColumnName("account_id");
            e.Property(x => x.CostCenterId).HasColumnName("cost_center_id");
            e.Property(x => x.ProjectId).HasColumnName("project_id");
        });

        // ----- m17_receipt -----
        b.Entity<Receipt>(e =>
        {
            e.ToTable("m17_receipt");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.ReceiptNumber).HasColumnName("receipt_number").HasMaxLength(40);
            e.Property(x => x.ReceiptDate).HasColumnName("receipt_date").HasConversion(LocalDateConv);
            e.Property(x => x.CustomerPartyId).HasColumnName("customer_party_id");
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 4);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.PaymentMethod).HasColumnName("payment_method")
                .HasConversion(PmToStr, StrToPm).HasMaxLength(20);
            e.Property(x => x.BankReference).HasColumnName("bank_reference").HasMaxLength(100);
            e.Property(x => x.UnmatchedAmount).HasColumnName("unmatched_amount").HasPrecision(18, 4);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.PostedJournalId).HasColumnName("posted_journal_id");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        // ----- m17_receipt_match -----
        b.Entity<ReceiptMatch>(e =>
        {
            e.ToTable("m17_receipt_match");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ReceiptId).HasColumnName("receipt_id");
            e.Property(x => x.InvoiceId).HasColumnName("invoice_id");
            e.Property(x => x.MatchedAmount).HasColumnName("matched_amount").HasPrecision(18, 4);
            e.Property(x => x.MatchedAt).HasColumnName("matched_at_utc").HasConversion(InstantConv);
            e.Property(x => x.MatchedBy).HasColumnName("matched_by");
            e.Property(x => x.IsAuto).HasColumnName("is_auto");
        });

        // ----- m17_bill -----
        b.Entity<Bill>(e =>
        {
            e.ToTable("m17_bill");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.BillNumber).HasColumnName("bill_number").HasMaxLength(40);
            e.Property(x => x.InternalNumber).HasColumnName("internal_number").HasMaxLength(40);
            e.Property(x => x.BillDate).HasColumnName("bill_date").HasConversion(LocalDateConv);
            e.Property(x => x.DueDate).HasColumnName("due_date").HasConversion(LocalDateConv);
            e.Property(x => x.VendorPartyId).HasColumnName("vendor_party_id");
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.FuncCurrency).HasColumnName("func_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.FxRate).HasColumnName("fx_rate").HasPrecision(18, 8);
            e.Property(x => x.SubtotalAmount).HasColumnName("subtotal_amount").HasPrecision(18, 4);
            e.Property(x => x.TaxAmount).HasColumnName("tax_amount").HasPrecision(18, 4);
            e.Property(x => x.WithholdingAmount).HasColumnName("withholding_amount").HasPrecision(18, 4);
            e.Property(x => x.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 4);
            e.Property(x => x.PaidAmount).HasColumnName("paid_amount").HasPrecision(18, 4);
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.PostedJournalId).HasColumnName("posted_journal_id");
            e.Property(x => x.PostedAt).HasColumnName("posted_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.PostedBy).HasColumnName("posted_by");
            e.Property(x => x.SourceModule).HasColumnName("source_module").HasMaxLength(20);
            e.Property(x => x.SourceRecordId).HasColumnName("source_record_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        // ----- m17_bill_line -----
        b.Entity<BillLine>(e =>
        {
            e.ToTable("m17_bill_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.BillId).HasColumnName("bill_id");
            e.Property(x => x.LineNumber).HasColumnName("line_number");
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.HsnCode).HasColumnName("hsn_code").HasMaxLength(20);
            e.Property(x => x.Quantity).HasColumnName("quantity").HasPrecision(12, 4);
            e.Property(x => x.UomCode).HasColumnName("uom_code").HasMaxLength(10);
            e.Property(x => x.UnitPriceAmount).HasColumnName("unit_price_amount").HasPrecision(18, 4);
            e.Property(x => x.LineAmount).HasColumnName("line_amount").HasPrecision(18, 4);
            e.Property(x => x.TaxClass).HasColumnName("tax_class").HasMaxLength(50);
            e.Property(x => x.TaxRatePct).HasColumnName("tax_rate_pct").HasPrecision(7, 4);
            e.Property(x => x.TaxAmount).HasColumnName("tax_amount").HasPrecision(18, 4);
            e.Property(x => x.AccountId).HasColumnName("account_id");
            e.Property(x => x.CostCenterId).HasColumnName("cost_center_id");
            e.Property(x => x.ProjectId).HasColumnName("project_id");
        });

        // ----- m17_payment -----
        b.Entity<Payment>(e =>
        {
            e.ToTable("m17_payment");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.PaymentNumber).HasColumnName("payment_number").HasMaxLength(40);
            e.Property(x => x.PaymentDate).HasColumnName("payment_date").HasConversion(LocalDateConv);
            e.Property(x => x.VendorPartyId).HasColumnName("vendor_party_id");
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 4);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.WithholdingAmount).HasColumnName("withholding_amount").HasPrecision(18, 4);
            e.Property(x => x.NetAmount).HasColumnName("net_amount").HasPrecision(18, 4);
            e.Property(x => x.PaymentMethod).HasColumnName("payment_method")
                .HasConversion(PmToStr, StrToPm).HasMaxLength(20);
            e.Property(x => x.BankReference).HasColumnName("bank_reference").HasMaxLength(100);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.ApprovedBy).HasColumnName("approved_by");
            e.Property(x => x.ApprovedAt).HasColumnName("approved_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.PostedJournalId).HasColumnName("posted_journal_id");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        // ----- m17_payment_alloc -----
        b.Entity<PaymentAlloc>(e =>
        {
            e.ToTable("m17_payment_alloc");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.PaymentId).HasColumnName("payment_id");
            e.Property(x => x.BillId).HasColumnName("bill_id");
            e.Property(x => x.AllocatedAmount).HasColumnName("allocated_amount").HasPrecision(18, 4);
            e.Property(x => x.AllocatedAt).HasColumnName("allocated_at_utc").HasConversion(InstantConv);
        });

        // ----- m17_close_checklist + items -----
        b.Entity<CloseChecklist>(e =>
        {
            e.ToTable("m17_close_checklist");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.PeriodId).HasColumnName("period_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.StartedAt).HasColumnName("started_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CompletedAt).HasColumnName("completed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.StartedBy).HasColumnName("started_by");
            e.Property(x => x.CompletedBy).HasColumnName("completed_by");
        });
        b.Entity<CloseChecklistItem>(e =>
        {
            e.ToTable("m17_close_checklist_item");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ChecklistId).HasColumnName("checklist_id");
            e.Property(x => x.SeqNo).HasColumnName("seq_no");
            e.Property(x => x.ItemCode).HasColumnName("item_code").HasMaxLength(50);
            e.Property(x => x.ItemLabel).HasColumnName("item_label").HasMaxLength(255);
            e.Property(x => x.IsPluginInjected).HasColumnName("is_plugin_injected");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.DoneAt).HasColumnName("done_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.DoneBy).HasColumnName("done_by");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
        });

        // ----- m17_audit_log -----
        b.Entity<AuditLog>(e =>
        {
            e.ToTable("m17_audit_log");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.OccurredAt).HasColumnName("occurred_at_utc").HasConversion(InstantConv);
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Action).HasColumnName("action").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.EntityType).HasColumnName("entity_type").HasMaxLength(50);
            e.Property(x => x.EntityId).HasColumnName("entity_id");
            e.Property(x => x.BeforeJson).HasColumnName("before_json").HasColumnType("json");
            e.Property(x => x.AfterJson).HasColumnName("after_json").HasColumnType("json");
            e.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(500);
            e.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
            e.Property(x => x.UserAgent).HasColumnName("user_agent").HasMaxLength(255);
        });

        // ===== India plugin extension tables =====
        b.Entity<GstRate>(e =>
        {
            e.ToTable("m17in_gst_rate");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.HsnCode).HasColumnName("hsn_code").HasMaxLength(20);
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.CgstRatePct).HasColumnName("cgst_rate_pct").HasPrecision(5, 2);
            e.Property(x => x.SgstRatePct).HasColumnName("sgst_rate_pct").HasPrecision(5, 2);
            e.Property(x => x.IgstRatePct).HasColumnName("igst_rate_pct").HasPrecision(5, 2);
            e.Property(x => x.CessRatePct).HasColumnName("cess_rate_pct").HasPrecision(5, 2);
            e.Property(x => x.EffectiveFrom).HasColumnName("effective_from").HasConversion(LocalDateConv);
            e.Property(x => x.EffectiveTo).HasColumnName("effective_to").HasConversion(NullableLocalDate);
        });

        b.Entity<InvoiceExtIn>(e =>
        {
            e.ToTable("m17in_invoice_ext");
            e.HasKey(x => x.InvoiceId);
            e.Property(x => x.InvoiceId).HasColumnName("invoice_id");
            e.Property(x => x.PlaceOfSupply).HasColumnName("place_of_supply").HasMaxLength(2);
            e.Property(x => x.IsIntraState).HasColumnName("is_intra_state");
            e.Property(x => x.CgstAmount).HasColumnName("cgst_amount").HasPrecision(18, 4);
            e.Property(x => x.SgstAmount).HasColumnName("sgst_amount").HasPrecision(18, 4);
            e.Property(x => x.IgstAmount).HasColumnName("igst_amount").HasPrecision(18, 4);
            e.Property(x => x.CessAmount).HasColumnName("cess_amount").HasPrecision(18, 4);
            e.Property(x => x.ReverseCharge).HasColumnName("reverse_charge");
            e.Property(x => x.IsExport).HasColumnName("is_export");
            e.Property(x => x.ExportType).HasColumnName("export_type").HasConversion<string>().HasMaxLength(10);
        });

        b.Entity<Irn>(e =>
        {
            e.ToTable("m17in_irn");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.InvoiceId).HasColumnName("invoice_id");
            e.Property(x => x.IrnValue).HasColumnName("irn").HasMaxLength(64).IsFixedLength();
            e.Property(x => x.AckNo).HasColumnName("ack_no").HasMaxLength(30);
            e.Property(x => x.AckDate).HasColumnName("ack_date").HasConversion(InstantConv);
            e.Property(x => x.QrCodeB64).HasColumnName("qr_code_b64");
            e.Property(x => x.SignedInvoiceB64).HasColumnName("signed_invoice_b64");
            e.Property(x => x.IrpProvider).HasColumnName("irp_provider").HasMaxLength(20);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CancelledAt).HasColumnName("cancelled_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CancelReason).HasColumnName("cancel_reason").HasMaxLength(255);
            e.Property(x => x.FailureCount).HasColumnName("failure_count");
            e.Property(x => x.LastError).HasColumnName("last_error").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<TdsSection>(e =>
        {
            e.ToTable("m17in_tds_section");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.SectionCode).HasColumnName("section_code").HasMaxLength(20);
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.PayeeType).HasColumnName("payee_type").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.RatePct).HasColumnName("rate_pct").HasPrecision(5, 2);
            e.Property(x => x.ThresholdAmount).HasColumnName("threshold_amount").HasPrecision(18, 4);
            e.Property(x => x.EffectiveFrom).HasColumnName("effective_from").HasConversion(LocalDateConv);
            e.Property(x => x.EffectiveTo).HasColumnName("effective_to").HasConversion(NullableLocalDate);
        });

        b.Entity<BillExtIn>(e =>
        {
            e.ToTable("m17in_bill_ext");
            e.HasKey(x => x.BillId);
            e.Property(x => x.BillId).HasColumnName("bill_id");
            e.Property(x => x.TdsSectionCode).HasColumnName("tds_section_code").HasMaxLength(20);
            e.Property(x => x.TdsRatePct).HasColumnName("tds_rate_pct").HasPrecision(5, 2);
            e.Property(x => x.TdsAmount).HasColumnName("tds_amount").HasPrecision(18, 4);
            e.Property(x => x.VendorPan).HasColumnName("vendor_pan").HasMaxLength(10);
            e.Property(x => x.VendorGstin).HasColumnName("vendor_gstin").HasMaxLength(15);
            e.Property(x => x.IsReverseCharge).HasColumnName("is_reverse_charge");
        });

        b.Entity<PartyLookup>(e =>
        {
            e.HasNoKey();
            e.ToView("m1_party");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.LegalName).HasColumnName("legal_name").HasMaxLength(255);
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
        });

        b.Entity<GstrRun>(e =>
        {
            e.ToTable("m17in_gstr_run");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ReturnType).HasColumnName("return_type")
                .HasConversion(GstrTypeToStr, StrToGstrType).HasMaxLength(10);
            e.Property(x => x.PeriodId).HasColumnName("period_id");
            e.Property(x => x.PrepDate).HasColumnName("prep_date").HasConversion(LocalDateConv);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.TotalTaxable).HasColumnName("total_taxable").HasPrecision(18, 4);
            e.Property(x => x.TotalCgst).HasColumnName("total_cgst").HasPrecision(18, 4);
            e.Property(x => x.TotalSgst).HasColumnName("total_sgst").HasPrecision(18, 4);
            e.Property(x => x.TotalIgst).HasColumnName("total_igst").HasPrecision(18, 4);
            e.Property(x => x.TotalCess).HasColumnName("total_cess").HasPrecision(18, 4);
            e.Property(x => x.OutputJson).HasColumnName("output_json").HasColumnType("json");
            e.Property(x => x.FiledAt).HasColumnName("filed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.AckReference).HasColumnName("ack_reference").HasMaxLength(50);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        // ===== M17 finish â€” extension table mappings =====

        b.Entity<SettlementLink>(e =>
        {
            e.ToTable("m17_settlement_link");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.InvoiceLineId).HasColumnName("invoice_line_id");
            e.Property(x => x.BillLineId).HasColumnName("bill_line_id");
            e.Property(x => x.LinkedAmount).HasColumnName("linked_amount").HasPrecision(18, 4);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.ReversedAt).HasColumnName("reversed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ReversedBy).HasColumnName("reversed_by");
            e.Property(x => x.ReversalReason).HasColumnName("reversal_reason").HasMaxLength(500);
        });

        b.Entity<BankAccount>(e =>
        {
            e.ToTable("m17_bank_account");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.AccountCode).HasColumnName("account_code").HasMaxLength(20);
            e.Property(x => x.BankName).HasColumnName("bank_name").HasMaxLength(150);
            e.Property(x => x.AccountNumberMasked).HasColumnName("account_number_masked").HasMaxLength(30);
            e.Property(x => x.AccountType).HasColumnName("account_type").HasConversion(BankAccountTypeToStr, StrToBankAccountType).HasMaxLength(15);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.LedgerAccountId).HasColumnName("ledger_account_id");
            e.Property(x => x.RoutingNumber).HasColumnName("routing_number").HasMaxLength(20);
            e.Property(x => x.SwiftCode).HasColumnName("swift_code").HasMaxLength(20);
            e.Property(x => x.Iban).HasColumnName("iban").HasMaxLength(34);
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CurrentBalance).HasColumnName("current_balance").HasPrecision(18, 2);
            e.Property(x => x.LastReconDate).HasColumnName("last_recon_date").HasConversion(NullableLocalDate);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<Deposit>(e =>
        {
            e.ToTable("m17_deposit");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.DepositNumber).HasColumnName("deposit_number").HasMaxLength(40);
            e.Property(x => x.DepositDate).HasColumnName("deposit_date").HasConversion(LocalDateConv);
            e.Property(x => x.BankAccountId).HasColumnName("bank_account_id");
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Source).HasColumnName("source").HasConversion(DepositSourceToStr, StrToDepositSource).HasMaxLength(15);
            e.Property(x => x.ReceiptId).HasColumnName("receipt_id");
            e.Property(x => x.CustomerPartyId).HasColumnName("customer_party_id");
            e.Property(x => x.CheckNumber).HasColumnName("check_number").HasMaxLength(30);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.ReversedAt).HasColumnName("reversed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ReversalReason).HasColumnName("reversal_reason").HasMaxLength(500);
            e.Property(x => x.ClearedAt).HasColumnName("cleared_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<BankStatement>(e =>
        {
            e.ToTable("m17_bank_statement");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BankAccountId).HasColumnName("bank_account_id");
            e.Property(x => x.StatementPeriod).HasColumnName("statement_period").HasMaxLength(7);
            e.Property(x => x.StatementDate).HasColumnName("statement_date").HasConversion(LocalDateConv);
            e.Property(x => x.OpeningBalance).HasColumnName("opening_balance").HasPrecision(18, 2);
            e.Property(x => x.ClosingBalance).HasColumnName("closing_balance").HasPrecision(18, 2);
            e.Property(x => x.TotalDebits).HasColumnName("total_debits").HasPrecision(18, 2);
            e.Property(x => x.TotalCredits).HasColumnName("total_credits").HasPrecision(18, 2);
            e.Property(x => x.Source).HasColumnName("source").HasConversion(BankStatementSourceToStr, StrToBankStatementSource).HasMaxLength(10);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.UploadedAt).HasColumnName("uploaded_at_utc").HasConversion(InstantConv);
            e.Property(x => x.UploadedBy).HasColumnName("uploaded_by");
        });

        b.Entity<BankStatementLine>(e =>
        {
            e.ToTable("m17_bank_statement_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.StatementId).HasColumnName("statement_id");
            e.Property(x => x.LineDate).HasColumnName("line_date").HasConversion(LocalDateConv);
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.Reference).HasColumnName("reference").HasMaxLength(100);
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2);
            e.Property(x => x.RunningBalance).HasColumnName("running_balance").HasPrecision(18, 2);
            e.Property(x => x.IsMatched).HasColumnName("is_matched");
            e.Property(x => x.MatchConfidence).HasColumnName("match_confidence").HasPrecision(5, 2);
        });

        b.Entity<BankRecon>(e =>
        {
            e.ToTable("m17_bank_recon");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BankAccountId).HasColumnName("bank_account_id");
            e.Property(x => x.StatementId).HasColumnName("statement_id");
            e.Property(x => x.ReconDate).HasColumnName("recon_date").HasConversion(LocalDateConv);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.BookBalance).HasColumnName("book_balance").HasPrecision(18, 2);
            e.Property(x => x.BankBalance).HasColumnName("bank_balance").HasPrecision(18, 2);
            e.Property(x => x.Difference).HasColumnName("difference").HasPrecision(18, 2);
            e.Property(x => x.MatchedCount).HasColumnName("matched_count");
            e.Property(x => x.UnmatchedCount).HasColumnName("unmatched_count");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CompletedAt).HasColumnName("completed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CompletedBy).HasColumnName("completed_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<BankReconMatch>(e =>
        {
            e.ToTable("m17_bank_recon_match");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ReconId).HasColumnName("recon_id");
            e.Property(x => x.StatementLineId).HasColumnName("statement_line_id");
            e.Property(x => x.MatchTargetKind).HasColumnName("match_target_kind").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.MatchTargetId).HasColumnName("match_target_id");
            e.Property(x => x.MatchedAmount).HasColumnName("matched_amount").HasPrecision(18, 2);
            e.Property(x => x.IsAuto).HasColumnName("is_auto");
            e.Property(x => x.MatchedAt).HasColumnName("matched_at_utc").HasConversion(InstantConv);
            e.Property(x => x.MatchedBy).HasColumnName("matched_by");
        });

        b.Entity<FundTransfer>(e =>
        {
            e.ToTable("m17_fund_transfer");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.TransferNumber).HasColumnName("transfer_number").HasMaxLength(40);
            e.Property(x => x.TransferDate).HasColumnName("transfer_date").HasConversion(LocalDateConv);
            e.Property(x => x.FromBankId).HasColumnName("from_bank_id");
            e.Property(x => x.ToBankId).HasColumnName("to_bank_id");
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.FxRate).HasColumnName("fx_rate").HasPrecision(18, 8);
            e.Property(x => x.ToAmount).HasColumnName("to_amount").HasPrecision(18, 2);
            e.Property(x => x.BankReference).HasColumnName("bank_reference").HasMaxLength(100);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.PostedJournalId).HasColumnName("posted_journal_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<VoidedCheck>(e =>
        {
            e.ToTable("m17_voided_check");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BankAccountId).HasColumnName("bank_account_id");
            e.Property(x => x.CheckNumber).HasColumnName("check_number").HasMaxLength(30);
            e.Property(x => x.VoidDate).HasColumnName("void_date").HasConversion(LocalDateConv);
            e.Property(x => x.OriginalPaymentId).HasColumnName("original_payment_id");
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2);
            e.Property(x => x.Payee).HasColumnName("payee").HasMaxLength(255);
            e.Property(x => x.VoidReason).HasColumnName("void_reason").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.VoidedBy).HasColumnName("voided_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<CheckPrintBatch>(e =>
        {
            e.ToTable("m17_check_print_batch");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BatchNumber).HasColumnName("batch_number").HasMaxLength(40);
            e.Property(x => x.BankAccountId).HasColumnName("bank_account_id");
            e.Property(x => x.PrintDate).HasColumnName("print_date").HasConversion(LocalDateConv);
            e.Property(x => x.StartingCheckNo).HasColumnName("starting_check_no").HasMaxLength(30);
            e.Property(x => x.CheckCount).HasColumnName("check_count");
            e.Property(x => x.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 2);
            e.Property(x => x.PaymentIdsJson).HasColumnName("payment_ids_json").HasColumnType("json");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.PrintedAt).HasColumnName("printed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.PrintedBy).HasColumnName("printed_by");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<InvoicePrintBatch>(e =>
        {
            e.ToTable("m17_invoice_print_batch");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BatchNumber).HasColumnName("batch_number").HasMaxLength(40);
            e.Property(x => x.PrintDate).HasColumnName("print_date").HasConversion(LocalDateConv);
            e.Property(x => x.InvoiceCount).HasColumnName("invoice_count");
            e.Property(x => x.InvoiceIdsJson).HasColumnName("invoice_ids_json").HasColumnType("json");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.DeliveryMethod).HasColumnName("delivery_method").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.PrintedAt).HasColumnName("printed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<PastDueNotice>(e =>
        {
            e.ToTable("m17_past_due_notice");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.NoticeNumber).HasColumnName("notice_number").HasMaxLength(40);
            e.Property(x => x.CustomerPartyId).HasColumnName("customer_party_id");
            e.Property(x => x.NoticeLevel).HasColumnName("notice_level").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.TotalOverdueAmount).HasColumnName("total_overdue_amount").HasPrecision(18, 2);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.InvoiceCount).HasColumnName("invoice_count");
            e.Property(x => x.InvoiceIdsJson).HasColumnName("invoice_ids_json").HasColumnType("json");
            e.Property(x => x.GeneratedAt).HasColumnName("generated_at").HasConversion(LocalDateConv);
            e.Property(x => x.SentAt).HasColumnName("sent_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.DeliveryMethod).HasColumnName("delivery_method").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<EmailTemplate>(e =>
        {
            e.ToTable("m17_email_template");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.TemplateCode).HasColumnName("template_code").HasMaxLength(50);
            e.Property(x => x.TemplateName).HasColumnName("template_name").HasMaxLength(150);
            e.Property(x => x.Category).HasColumnName("category").HasConversion(EmailCatToStr, StrToEmailCat).HasMaxLength(20);
            e.Property(x => x.SubjectTemplate).HasColumnName("subject_template").HasMaxLength(255);
            e.Property(x => x.BodyTemplate).HasColumnName("body_template");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.IsPredefined).HasColumnName("is_predefined");
            e.Property(x => x.AvailablePlaceholdersJson).HasColumnName("available_placeholders_json").HasColumnType("json");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<CreditCardPayment>(e =>
        {
            e.ToTable("m17_credit_card_payment");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ReceiptId).HasColumnName("receipt_id");
            e.Property(x => x.PaymentId).HasColumnName("payment_id");
            e.Property(x => x.CardBrand).HasColumnName("card_brand").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.LastFour).HasColumnName("last_four").HasMaxLength(4).IsFixedLength();
            e.Property(x => x.AuthorizationCode).HasColumnName("authorization_code").HasMaxLength(30);
            e.Property(x => x.TransactionId).HasColumnName("transaction_id").HasMaxLength(60);
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.ProofKind).HasColumnName("proof_kind").HasConversion(CcProofToStr, StrToCcProof).HasMaxLength(20);
            e.Property(x => x.ProofDocumentId).HasColumnName("proof_document_id");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<GeneralExpense>(e =>
        {
            e.ToTable("m17_general_expense");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ExpenseNumber).HasColumnName("expense_number").HasMaxLength(40);
            e.Property(x => x.ExpenseDate).HasColumnName("expense_date").HasConversion(LocalDateConv);
            e.Property(x => x.ExpenseKind).HasColumnName("expense_kind").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.ExpenseAccountId).HasColumnName("expense_account_id");
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Recurrence).HasColumnName("recurrence").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.NextRecurDate).HasColumnName("next_recur_date").HasConversion(NullableLocalDate);
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.PostedJournalId).HasColumnName("posted_journal_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });
    }

    // ===== M17 finish enum converters =====

    // BankAccountType: 'Checking','Savings','Money Market','CD','Credit Line'
    private static Expression<Func<BankAccountType, string>> BankAccountTypeToStr => t =>
        t == BankAccountType.Checking    ? "Checking" :
        t == BankAccountType.Savings     ? "Savings" :
        t == BankAccountType.MoneyMarket ? "Money Market" :
        t == BankAccountType.Cd          ? "CD" :
                                           "Credit Line";
    private static Expression<Func<string, BankAccountType>> StrToBankAccountType => s =>
        s == "Checking"     ? BankAccountType.Checking :
        s == "Savings"      ? BankAccountType.Savings :
        s == "Money Market" ? BankAccountType.MoneyMarket :
        s == "CD"           ? BankAccountType.Cd :
                              BankAccountType.CreditLine;

    // DepositSource: 'FromAR','Standalone' (SQL has FromAR, enum is FromAr)
    private static Expression<Func<DepositSource, string>> DepositSourceToStr => s =>
        s == DepositSource.FromAr ? "FromAR" : "Standalone";
    private static Expression<Func<string, DepositSource>> StrToDepositSource => s =>
        s == "FromAR" ? DepositSource.FromAr : DepositSource.Standalone;

    // BankStatementSource: 'Manual','BAI2','OFX','CSV','MT940'
    private static Expression<Func<BankStatementSource, string>> BankStatementSourceToStr => s =>
        s == BankStatementSource.Manual ? "Manual" :
        s == BankStatementSource.Bai2   ? "BAI2" :
        s == BankStatementSource.Ofx    ? "OFX" :
        s == BankStatementSource.Csv    ? "CSV" :
                                          "MT940";
    private static Expression<Func<string, BankStatementSource>> StrToBankStatementSource => s =>
        s == "Manual" ? BankStatementSource.Manual :
        s == "BAI2"   ? BankStatementSource.Bai2 :
        s == "OFX"    ? BankStatementSource.Ofx :
        s == "CSV"    ? BankStatementSource.Csv :
                        BankStatementSource.Mt940;

    // EmailTemplateCategory: passes-through PascalCase except PaymentRemittance
    private static Expression<Func<EmailTemplateCategory, string>> EmailCatToStr => c =>
        c == EmailTemplateCategory.Invoice           ? "Invoice" :
        c == EmailTemplateCategory.PastDue           ? "PastDue" :
        c == EmailTemplateCategory.Statement         ? "Statement" :
        c == EmailTemplateCategory.Receipt           ? "Receipt" :
        c == EmailTemplateCategory.PaymentRemittance ? "PaymentRemittance" :
                                                       "Custom";
    private static Expression<Func<string, EmailTemplateCategory>> StrToEmailCat => s =>
        s == "Invoice"           ? EmailTemplateCategory.Invoice :
        s == "PastDue"           ? EmailTemplateCategory.PastDue :
        s == "Statement"         ? EmailTemplateCategory.Statement :
        s == "Receipt"           ? EmailTemplateCategory.Receipt :
        s == "PaymentRemittance" ? EmailTemplateCategory.PaymentRemittance :
                                   EmailTemplateCategory.Custom;

    // CreditCardProofKind passes-through PascalCase
    private static Expression<Func<CreditCardProofKind, string>> CcProofToStr => k =>
        k == CreditCardProofKind.PhotoFromApp   ? "PhotoFromApp" :
        k == CreditCardProofKind.OnlineDocument ? "OnlineDocument" :
                                                  "PhysicalSlip";
    private static Expression<Func<string, CreditCardProofKind>> StrToCcProof => s =>
        s == "PhotoFromApp"   ? CreditCardProofKind.PhotoFromApp :
        s == "OnlineDocument" ? CreditCardProofKind.OnlineDocument :
                                CreditCardProofKind.PhysicalSlip;

    // ----- enum <-> SQL string converters -----
    // ENUM('GENERAL','AR_INVOICE','AP_BILL','PAYMENT','RECEIPT','PERIOD_CLOSE','FX_REVAL','OPENING_BALANCE','ADJUSTMENT')
    private static Expression<Func<JournalType, string>> JournalTypeToStr => t =>
        t == JournalType.General        ? "GENERAL" :
        t == JournalType.ArInvoice      ? "AR_INVOICE" :
        t == JournalType.ApBill         ? "AP_BILL" :
        t == JournalType.Payment        ? "PAYMENT" :
        t == JournalType.Receipt        ? "RECEIPT" :
        t == JournalType.PeriodClose    ? "PERIOD_CLOSE" :
        t == JournalType.FxReval        ? "FX_REVAL" :
        t == JournalType.OpeningBalance ? "OPENING_BALANCE" :
                                          "ADJUSTMENT";
    private static Expression<Func<string, JournalType>> StrToJournalType => s =>
        s == "GENERAL"         ? JournalType.General :
        s == "AR_INVOICE"      ? JournalType.ArInvoice :
        s == "AP_BILL"         ? JournalType.ApBill :
        s == "PAYMENT"         ? JournalType.Payment :
        s == "RECEIPT"         ? JournalType.Receipt :
        s == "PERIOD_CLOSE"    ? JournalType.PeriodClose :
        s == "FX_REVAL"        ? JournalType.FxReval :
        s == "OPENING_BALANCE" ? JournalType.OpeningBalance :
                                 JournalType.Adjustment;

    // ENUM('DR','CR')
    private static Expression<Func<DebitCredit, string>> DcToStr => d => d == DebitCredit.Dr ? "DR" : "CR";
    private static Expression<Func<string, DebitCredit>> StrToDc => s => s == "DR" ? DebitCredit.Dr : DebitCredit.Cr;

    // ENUM('Cash','Cheque','BankTransfer','Card','UPI','NEFT','RTGS','IMPS','NACH','ACH','Wire','Other')
    // Note: SQL keeps PascalCase except UPI/NEFT/RTGS/IMPS/NACH/ACH which are uppercase acronyms.
    private static Expression<Func<PaymentMethod, string>> PmToStr => m =>
        m == PaymentMethod.Cash         ? "Cash" :
        m == PaymentMethod.Cheque       ? "Cheque" :
        m == PaymentMethod.BankTransfer ? "BankTransfer" :
        m == PaymentMethod.Card         ? "Card" :
        m == PaymentMethod.Upi          ? "UPI" :
        m == PaymentMethod.Neft         ? "NEFT" :
        m == PaymentMethod.Rtgs         ? "RTGS" :
        m == PaymentMethod.Imps         ? "IMPS" :
        m == PaymentMethod.Nach         ? "NACH" :
        m == PaymentMethod.Ach          ? "ACH" :
        m == PaymentMethod.Wire         ? "Wire" :
                                          "Other";
    private static Expression<Func<string, PaymentMethod>> StrToPm => s =>
        s == "Cash"         ? PaymentMethod.Cash :
        s == "Cheque"       ? PaymentMethod.Cheque :
        s == "BankTransfer" ? PaymentMethod.BankTransfer :
        s == "Card"         ? PaymentMethod.Card :
        s == "UPI"          ? PaymentMethod.Upi :
        s == "NEFT"         ? PaymentMethod.Neft :
        s == "RTGS"         ? PaymentMethod.Rtgs :
        s == "IMPS"         ? PaymentMethod.Imps :
        s == "NACH"         ? PaymentMethod.Nach :
        s == "ACH"          ? PaymentMethod.Ach :
        s == "Wire"         ? PaymentMethod.Wire :
                              PaymentMethod.Other;

    // ENUM('GSTR1','GSTR3B','GSTR9','GSTR9C')
    private static Expression<Func<GstrReturnType, string>> GstrTypeToStr => t =>
        t == GstrReturnType.Gstr1  ? "GSTR1" :
        t == GstrReturnType.Gstr3B ? "GSTR3B" :
        t == GstrReturnType.Gstr9  ? "GSTR9" :
                                     "GSTR9C";
    private static Expression<Func<string, GstrReturnType>> StrToGstrType => s =>
        s == "GSTR1"  ? GstrReturnType.Gstr1 :
        s == "GSTR3B" ? GstrReturnType.Gstr3B :
        s == "GSTR9"  ? GstrReturnType.Gstr9 :
                        GstrReturnType.Gstr9C;

    private static readonly ValueConverter<Instant, DateTime> InstantConv = new(
        v => v.ToDateTimeUtc(),
        v => Instant.FromDateTimeUtc(DateTime.SpecifyKind(v, DateTimeKind.Utc)));
    private static readonly ValueConverter<Instant?, DateTime?> NullableInstant = new(
        v => v == null ? null : v.Value.ToDateTimeUtc(),
        v => v == null ? null : Instant.FromDateTimeUtc(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)));
    private static readonly ValueConverter<LocalDate, DateTime> LocalDateConv = new(
        v => new DateTime(v.Year, v.Month, v.Day),
        v => new LocalDate(v.Year, v.Month, v.Day));
    private static readonly ValueConverter<LocalDate?, DateTime?> NullableLocalDate = new(
        v => v == null ? null : new DateTime(v.Value.Year, v.Value.Month, v.Value.Day),
        v => v == null ? null : new LocalDate(v.Value.Year, v.Value.Month, v.Value.Day));
}
