namespace Ulp.BuildingBlocks;

/// <summary>Generic paged result — used in API responses where lists may exceed page size.</summary>
public sealed record PagedList<T>(IReadOnlyList<T> Items, int Page, int PageSize, long TotalCount)
{
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}
