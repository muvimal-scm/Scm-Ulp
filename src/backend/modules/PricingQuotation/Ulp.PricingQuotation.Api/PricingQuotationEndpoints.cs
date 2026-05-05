using Microsoft.AspNetCore.Routing;
using Ulp.PricingQuotation.Api.Endpoints;

namespace Ulp.PricingQuotation.Api;

public static class PricingQuotationEndpoints
{
    public static IEndpointRouteBuilder MapPricingQuotationEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapRateCardEndpoints();
        app.MapQuoteEndpoints();
        app.MapM14ReadOnlyEndpoints();
        return app;
    }
}
