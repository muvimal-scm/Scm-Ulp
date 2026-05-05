# tests/

Non-unit tests. Unit tests live next to the code they test (`tests/` folder inside each .NET project, `*.spec.ts` next to Angular components).

| Folder | Purpose | Framework |
|---|---|---|
| [integration/](integration/) | Integration tests against the docker-compose stack — DB, broker, blob, mail | xUnit + Testcontainers (or shared compose) |
| [contract/](contract/) | Plugin contract tests — verify each country plugin satisfies its interface | xUnit `[Theory]` per country |
| [e2e/](e2e/) | End-to-end browser tests | Playwright |
| [perf/](perf/) | Load and performance tests — verify NFRs (p95 < 500ms, 5k concurrent users) | k6 or NBomber |

## Country-aware testing

Per [../ulpReq/ULP_TestingStrategy_v2.0.docx](../ulpReq/ULP_TestingStrategy_v2.0.docx), every test that exercises country-specific behavior must run for both IN and US:

```csharp
[Theory]
[InlineData("IN", "INR", "en-IN", "Asia/Kolkata")]
[InlineData("US", "USD", "en-US", "America/New_York")]
public async Task CreateInvoice_FormatsCorrectly(string country, string currency, string locale, string tz) {
    // ...
}
```

Reference skill: [../.claude/skills/xunit-testing/](../.claude/skills/xunit-testing/).
