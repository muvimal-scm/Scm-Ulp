using NodaTime;

namespace Ulp.TestKit.Time;

/// <summary>Deterministic clock for tests. Default base instant: 2026-05-02T00:00:00Z.</summary>
public sealed class FakeClock : IClock
{
    private Instant _now;

    public FakeClock(Instant? start = null)
    {
        _now = start ?? Instant.FromUtc(2026, 5, 2, 0, 0);
    }

    public Instant GetCurrentInstant() => _now;

    public void Advance(Duration by) => _now += by;
    public void Set(Instant to) => _now = to;
}
