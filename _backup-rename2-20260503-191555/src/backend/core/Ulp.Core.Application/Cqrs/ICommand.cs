namespace Ulp.Core.Application.Cqrs;

/// <summary>Command marker — produces a result of <typeparamref name="TResult"/>.</summary>
public interface ICommand<TResult> { }

/// <summary>Query marker — read-only, produces a result of <typeparamref name="TResult"/>.</summary>
public interface IQuery<TResult> { }

/// <summary>Handles an <see cref="ICommand{TResult}"/>.</summary>
public interface ICommandHandler<TCommand, TResult> where TCommand : ICommand<TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken ct);
}

/// <summary>Handles an <see cref="IQuery{TResult}"/>.</summary>
public interface IQueryHandler<TQuery, TResult> where TQuery : IQuery<TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken ct);
}
