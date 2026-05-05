namespace Ulp.Core.Application;

/// <summary>Generic operation result. Prefer <see cref="Success"/> / <see cref="Failure"/> factories.</summary>
public readonly record struct Result<T>(bool IsSuccess, T? Value, string? Error)
{
    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Failure(string error) => new(false, default, error);
}

/// <summary>Operation result with no value payload.</summary>
public readonly record struct Result(bool IsSuccess, string? Error)
{
    public static readonly Result Success = new(true, null);
    public static Result Failure(string error) => new(false, error);
}
