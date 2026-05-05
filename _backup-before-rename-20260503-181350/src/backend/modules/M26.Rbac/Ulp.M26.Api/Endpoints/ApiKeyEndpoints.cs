using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.M26.Domain.Entities;
using Ulp.M26.Infrastructure.Persistence;
using Ulp.M26.Infrastructure.Tenancy;

namespace Ulp.M26.Api.Endpoints;

public static class ApiKeyEndpoints
{
    public static IEndpointRouteBuilder MapApiKeyEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m26/api-keys").WithTags("M26 · API Keys").RequireAuthorization();

        g.MapGet("/", async ([FromServices] M26DbContext db, [FromServices] ITenantContext tenant,
            CancellationToken ct) =>
        {
            var tid = int.Parse(tenant.TenantId.Value);
            var rows = await db.ApiKeys.AsNoTracking()
                .Where(k => k.TenantId == tid)
                .OrderByDescending(k => k.CreatedAt)
                .ToListAsync(ct);
            return Results.Ok(rows.Select(k => new
            {
                k.Id, k.Name, k.KeyPrefix, k.IsRevoked,
                CreatedAt = k.CreatedAt.ToString(),
                ExpiresAt = k.ExpiresAt?.ToString(),
                LastUsedAt = k.LastUsedAt?.ToString(),
            }));
        });

        g.MapPost("/", async (
            [FromBody] CreateApiKeyRequest req,
            [FromServices] M26DbContext db,
            [FromServices] ITenantContext tenant,
            [FromServices] TenantContextHolder holder,
            [FromServices] IClock clock,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                    { ["name"] = ["name required"] });

            var raw = "ulpk_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
            var hash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();
            var prefix = raw[..8];

            var now = clock.GetCurrentInstant();
            var key = new ApiKey
            {
                TenantId  = int.Parse(tenant.TenantId.Value),
                Name      = req.Name,
                KeyHash   = hash,
                KeyPrefix = prefix,
                ScopesJson = JsonSerializer.Serialize(req.Scopes ?? Array.Empty<string>()),
                CreatedBy  = holder.UserId ?? 0,
                CreatedAt  = now,
                ExpiresAt  = req.ExpiresAt,
                IsRevoked  = false,
            };
            db.ApiKeys.Add(key);
            await db.SaveChangesAsync(ct);

            // Raw key returned exactly once.
            return Results.Created($"/api/v1/m26/api-keys/{key.Id}", new
            {
                id = key.Id,
                name = key.Name,
                rawKey = raw,
                prefix = key.KeyPrefix,
                expiresAt = key.ExpiresAt?.ToString(),
            });
        });

        g.MapDelete("/{id:long}", async (long id,
            [FromServices] M26DbContext db,
            [FromServices] ITenantContext tenant,
            [FromServices] IClock clock,
            CancellationToken ct) =>
        {
            var tid = int.Parse(tenant.TenantId.Value);
            var key = await db.ApiKeys.FirstOrDefaultAsync(k => k.Id == id && k.TenantId == tid, ct);
            if (key is null) return Results.NotFound();

            key.IsRevoked = true;
            key.RevokedAt = clock.GetCurrentInstant();
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        return app;
    }
}

public sealed record CreateApiKeyRequest(string Name, IReadOnlyList<string>? Scopes, Instant? ExpiresAt);
