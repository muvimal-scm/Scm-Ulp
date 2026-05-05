using FluentValidation;

namespace Ulp.MasterData.Application.Parties;

/// <summary>
/// Validation for create-party. Country code, legal name, party type are required.
/// Identifier-format validation is intentionally NOT done here â€” that lives in
/// country plugins (PanValidator, EinValidator, etc.) per LLD Â§3.2.
/// In Phase 1 identifiers are stored verbatim with status=Pending.
/// </summary>
public sealed class CreatePartyValidator : AbstractValidator<CreatePartyRequest>
{
    public CreatePartyValidator()
    {
        RuleFor(x => x.CountryCode)
            .NotEmpty().WithMessage("CountryCode is required.")
            .Length(2).WithMessage("CountryCode must be ISO 3166-1 alpha-2 (2 chars).");

        RuleFor(x => x.LegalName)
            .NotEmpty().WithMessage("LegalName is required.")
            .MaximumLength(255);

        RuleFor(x => x.TradeName).MaximumLength(255);

        RuleFor(x => x.PreferredLocale).MaximumLength(10);
        RuleFor(x => x.PreferredCurrency).Length(3).When(x => !string.IsNullOrEmpty(x.PreferredCurrency));
        RuleFor(x => x.DefaultPaymentTerms).MaximumLength(50);

        RuleForEach(x => x.Identifiers).ChildRules(child =>
        {
            child.RuleFor(i => i.IdentifierType).NotEmpty().MaximumLength(30);
            child.RuleFor(i => i.IdentifierValue).NotEmpty().MaximumLength(50);
        });
    }
}

public sealed class UpdatePartyValidator : AbstractValidator<UpdatePartyRequest>
{
    public UpdatePartyValidator()
    {
        RuleFor(x => x.LegalName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.TradeName).MaximumLength(255);
        RuleFor(x => x.PreferredLocale).MaximumLength(10);
        RuleFor(x => x.PreferredCurrency).Length(3).When(x => !string.IsNullOrEmpty(x.PreferredCurrency));
        RuleFor(x => x.DefaultPaymentTerms).MaximumLength(50);
    }
}
