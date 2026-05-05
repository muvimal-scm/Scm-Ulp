using Xunit.Sdk;

namespace Ulp.TestKit.Theories;

/// <summary>
/// xUnit data attribute that yields one row per supported country.
/// Use as: <c>[Theory] [CountryAwareData] public async Task Foo(string country, string currency, string locale, string tz)</c>.
/// Mandated by ULP_TestingStrategy_v2.0.docx for any test exercising country-specific behaviour.
/// </summary>
public sealed class CountryAwareDataAttribute : DataAttribute
{
    public override IEnumerable<object[]> GetData(System.Reflection.MethodInfo testMethod)
    {
        yield return new object[] { "IN", "INR", "en-IN", "Asia/Kolkata" };
        yield return new object[] { "US", "USD", "en-US", "America/New_York" };
    }
}
