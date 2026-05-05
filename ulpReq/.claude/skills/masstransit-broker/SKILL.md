---
name: masstransit-broker
description: MassTransit broker abstraction for ULP message-driven architecture. Use when implementing event publishers, consumers, sagas, or outbox pattern. Critical for MVP-to-prod migration: same code runs against RabbitMQ (MVP) or Azure Service Bus (prod) by config change. Always use when touching events or async messaging.
---

# MassTransit Broker Abstraction for ULP

## When this skill triggers
Publishing or consuming events, implementing sagas, the outbox pattern, or any async messaging code. The whole point of MassTransit in ULP is **MVP-to-prod migration**: RabbitMQ locally, Azure Service Bus in production, same code.

## Top 3 reference repos
1. **MassTransit/MassTransit** (https://github.com/MassTransit/MassTransit) - Official. The `tests/` directory has canonical patterns for sagas, outbox, batch consumers.
2. **MassTransit/Sample-Outbox** (https://github.com/MassTransit/Sample-Outbox) - Outbox pattern with EF Core. Direct pattern for ULP's reliability requirements.
3. **MassTransit/Sample-StateMachine** (https://github.com/MassTransit/Sample-StateMachine) - Saga state machine examples for long-running workflows (e.g., M17 invoice approval, M13 trip dispatch).

## Standard ULP setup
```csharp
// Program.cs
builder.Services.AddMassTransit(x =>
{
    x.SetKebabCaseEndpointNameFormatter();
    
    // Outbox for reliable publishing - CRITICAL for ULP
    x.AddEntityFrameworkOutbox<AppDbContext>(o => {
        o.UseMySql();
        o.UseBusOutbox();
        o.QueryDelay = TimeSpan.FromSeconds(1);
    });

    x.AddConsumers(typeof(Program).Assembly);
    
    // Switch broker by config - the magic
    var broker = builder.Configuration["Messaging:Broker"];
    if (broker == "RabbitMQ") {
        x.UsingRabbitMq((ctx, cfg) => {
            cfg.Host(builder.Configuration["Messaging:RabbitMq:Host"]);
            cfg.ConfigureEndpoints(ctx);
        });
    } else if (broker == "AzureServiceBus") {
        x.UsingAzureServiceBus((ctx, cfg) => {
            cfg.Host(builder.Configuration["Messaging:AzureServiceBus:ConnectionString"]);
            cfg.ConfigureEndpoints(ctx);
        });
    }
});
```

## Event contract (shared across modules)
```csharp
// Backend/ULP.Contracts/Events/InvoiceApprovedEvent.cs
public record InvoiceApprovedEvent
{
    public Guid InvoiceId { get; init; }
    public Guid TenantId { get; init; }
    public DateTimeOffset ApprovedAt { get; init; }
    public string ApprovedBy { get; init; } = "";
    public decimal Amount { get; init; }
    public string Currency { get; init; } = "INR";
}
```

## Publishing (with outbox)
```csharp
public class InvoiceService
{
    public async Task ApproveAsync(Guid id, CancellationToken ct)
    {
        var inv = await _db.Invoices.FindAsync(id);
        inv.Approve();
        
        // Publish goes to outbox table in same transaction as state change
        await _publisher.Publish(new InvoiceApprovedEvent {
            InvoiceId = inv.Id,
            TenantId = inv.TenantId,
            ApprovedAt = DateTimeOffset.UtcNow,
            ApprovedBy = _user.Id,
            Amount = inv.Total
        }, ct);
        
        await _db.SaveChangesAsync(ct);
        // After commit, MassTransit relay picks up outbox row and publishes to broker
    }
}
```

## Consuming
```csharp
public class GenerateGstInvoiceConsumer : IConsumer<InvoiceApprovedEvent>
{
    public async Task Consume(ConsumeContext<InvoiceApprovedEvent> ctx)
    {
        // Idempotent by message ID - MassTransit dedupes within retry window
        await _gstService.GenerateIrnAsync(ctx.Message.InvoiceId, ctx.CancellationToken);
    }
}
```

## Gotchas specific to ULP

1. **ALWAYS use the outbox pattern** - never publish directly. Direct publish creates dual-write problem (DB save succeeds, broker publish fails -> data inconsistency).
2. **Make consumers idempotent** - same event can be delivered multiple times. Check "have I processed this MessageId already?" or use upserts.
3. **Topic naming via `SetKebabCaseEndpointNameFormatter()`** - keeps queue names sensible across RabbitMQ + ASB.
4. **DLQ retry policy** - use exponential backoff (default 5 attempts), then dead-letter for manual review.
5. **Saga timeout durations** - long-running flows (invoice approval can take days). Use saga state machines for these.
6. **TenantId on every event** - propagate tenant context through messages or consumers won't know which tenant.
7. **MVP Docker Compose** must include RabbitMQ management UI on port 15672.

## ULP companion docs
- Outbox pattern: `docs/ULP_HLD_v1.0_HighLevelDesign.docx` Section 5.4
- Event contracts: `docs/ULP_DBD_v1.0_DatabaseDesign.docx` Section 6

