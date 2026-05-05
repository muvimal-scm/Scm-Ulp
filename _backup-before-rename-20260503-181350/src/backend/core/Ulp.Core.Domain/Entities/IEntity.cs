using NodaTime;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Core.Domain.Entities;

/// <summary>Marker interface for any persisted entity.</summary>
public interface IEntity
{
    long Id { get; }
}

/// <summary>Every tenant-scoped table carries TenantId + CountryCode (v2.0 schema convention).</summary>
public interface ITenantScoped
{
    TenantId TenantId { get; }
    CountryCode CountryCode { get; }
}

/// <summary>Audit columns — added/modified actor + instant.</summary>
public interface IAuditable
{
    Instant CreatedAtUtc { get; }
    long CreatedBy { get; }
    Instant? ModifiedAtUtc { get; }
    long? ModifiedBy { get; }
}

/// <summary>Soft-delete marker. Hard delete is forbidden in business modules.</summary>
public interface ISoftDeletable
{
    bool IsDeleted { get; }
    Instant? DeletedAtUtc { get; }
    long? DeletedBy { get; }
}
