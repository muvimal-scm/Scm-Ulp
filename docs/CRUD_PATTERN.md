# CRUD Pattern Recipe

Mechanical recipe for adding **Create / Edit / Delete** UI to any module entity. Worked example: **Sales/Leads + Sales/Opportunities** (live, in `src/backend/modules/Sales/` + `src/frontend/ulp-web/src/app/features/sales/`).

> **Read this once.** Then for each new entity, follow the 6 steps below — each takes ~30–60 minutes per entity once you know the codebase.

---

## Convention recap

For an entity called `Foo` in a module called `Bar`:

| Place | Pattern |
|---|---|
| Backend service interface | `IBarService` in `src/backend/modules/Bar/Ulp.Bar.Application/Contracts.cs` |
| Backend service impl | `BarService` in `src/backend/modules/Bar/Ulp.Bar.Infrastructure/Persistence/BarService.cs` |
| Backend endpoints | `FooEndpoints.cs` in `src/backend/modules/Bar/Ulp.Bar.Api/Endpoints/` |
| Frontend list | `src/app/features/bar/foos/foos-list.component.ts` |
| Frontend form (create + edit) | `src/app/features/bar/foos/foo-form.component.ts` |
| Frontend service | `src/app/features/bar/shared/bar-api.service.ts` |
| Frontend types | `src/app/features/bar/shared/bar-types.ts` |
| Routes | `src/app/features/bar/bar.routes.ts` |

Reusable across all modules:
- **Delete confirm dialog**: `src/app/shared/dialogs/confirm-dialog.component.ts` (built with the Sales worked example — do NOT duplicate)

---

## The 6 steps

### Step 1 — Backend: extend the service contract

In `Ulp.Bar.Application/Contracts.cs`:

```csharp
public interface IBarService
{
    // ...existing methods...

    // Add these two for each entity that needs CRUD:
    Task<FooDto> UpdateFooAsync(long id, UpdateFooRequest req, CancellationToken ct);
    Task<bool>   DeleteFooAsync(long id, CancellationToken ct);
}

// Add the request DTO. Same fields as CreateFooRequest MINUS immutable identifiers
// (entity number, primary key, FK to other modules).
public sealed record UpdateFooRequest(
    string CountryCode,
    // ... mutable fields only ...
);
```

**Rule of thumb on what's immutable:** anything that flows into a unique key (`tenant_id + foo_number`), anything referenced from other tables, anything in audit/journal tables. Country code is mutable in our convention because it doesn't drive routing (country plugin is per-tenant, not per-row).

### Step 2 — Backend: implement the two service methods

In `Ulp.Bar.Infrastructure/Persistence/BarService.cs`, append after the `Change*Status` method for the entity:

```csharp
public async Task<FooDto> UpdateFooAsync(long id, UpdateFooRequest req, CancellationToken ct)
{
    var f = await db.Foos.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
        ?? throw new InvalidOperationException($"foo {id} not found");
    f.CountryCode  = req.CountryCode;
    // ... copy each mutable field ...
    f.ModifiedAt   = clock.GetCurrentInstant();
    await db.SaveChangesAsync(ct);
    return ToFooDto(f);
}

public async Task<bool> DeleteFooAsync(long id, CancellationToken ct)
{
    var f = await db.Foos.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
    if (f is null) return false;
    // GUARD: refuse delete when entity is referenced by other live data.
    // Examples: lead converted to a party, opportunity with linked quotes,
    //           invoice already posted, vendor with open POs, etc.
    if (/* is referenced */)
        throw new InvalidOperationException($"foo {id} cannot be deleted because ...");
    db.Foos.Remove(f);
    await db.SaveChangesAsync(ct);
    return true;
}
```

**Always have a guard.** Hard delete with no guard is a bug — silently corrupts the audit chain.

### Step 3 — Backend: add PUT + DELETE endpoints

In `Ulp.Bar.Api/Endpoints/FooEndpoints.cs`, append inside the same `MapFooEndpoints` method:

```csharp
g.MapPut("/{id:long}", async (long id,
    [FromBody] UpdateFooRequest req,
    [FromServices] IBarService svc, CancellationToken ct) =>
{
    try   { return Results.Ok(await svc.UpdateFooAsync(id, req, ct)); }
    catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
});

g.MapDelete("/{id:long}", async (long id,
    [FromServices] IBarService svc, CancellationToken ct) =>
{
    try
    {
        var deleted = await svc.DeleteFooAsync(id, ct);
        return deleted ? Results.NoContent() : Results.NotFound();
    }
    catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
});
```

**Verify backend builds clean** before touching the frontend:
```powershell
dotnet build src\backend\host\Ulp.Api\Ulp.Api.csproj
```

### Step 4 — Frontend: extend types + service

In `bar-types.ts`:

```typescript
export interface CreateFooRequest {
  countryCode: string;
  fooNumber: string;        // required on create only
  // ... all fields ...
}

export interface UpdateFooRequest {
  countryCode: string;      // fooNumber omitted — immutable
  // ... mutable fields only ...
}
```

In `bar-api.service.ts`, after the existing `getFoo` / `listFoos`:

```typescript
createFoo(req: CreateFooRequest): Promise<FooDto> {
  return firstValueFrom(this.http.post<FooDto>(`${this.base}/foos`, req));
}
updateFoo(id: number, req: UpdateFooRequest): Promise<FooDto> {
  return firstValueFrom(this.http.put<FooDto>(`${this.base}/foos/${id}`, req));
}
deleteFoo(id: number): Promise<void> {
  return firstValueFrom(this.http.delete<void>(`${this.base}/foos/${id}`));
}
```

### Step 5 — Frontend: build the form component

Copy `src/app/features/sales/leads/lead-form.component.ts` as a template. Rename:
- `LeadFormComponent` → `FooFormComponent`
- `SalesApiService` → `BarApiService`
- The route segments (`/app/sales/leads` → `/app/bar/foos`)
- Form fields to match your entity

**Key invariants the template enforces** — keep them:

1. **Single component for both create + edit modes** — `:id` route param triggers edit
2. **Reactive Forms** — `this.fb.nonNullable.group(...)` + `Validators`
3. **Lock immutable identifier on edit:** `this.form.controls.fooNumber.disable()`
4. **Use `getRawValue()`** when reading the form so disabled fields are included
5. **Show API errors as a banner** (not silent) — `apiError = signal<string | null>(null)`
6. **Disable submit while saving** — `[disabled]="saving() || form.invalid"`
7. **On success, navigate back to list** — `await this.router.navigate(['/app/bar/foos'])`

### Step 6 — Wire the list page + routes

In `foos-list.component.ts`:

1. **Add `+ New foo` button in header:**
   ```html
   <a mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon>&nbsp;New foo</a>
   ```

2. **Add Edit + Delete actions per row:**
   ```html
   <td class="actions">
     <a mat-icon-button [routerLink]="[f.id, 'edit']" aria-label="Edit"><mat-icon>edit</mat-icon></a>
     <button mat-icon-button color="warn" (click)="onDelete(f)" [disabled]="busyId() === f.id"><mat-icon>delete_outline</mat-icon></button>
   </td>
   ```

3. **Implement `onDelete`** using the shared `ConfirmDialogComponent`:
   ```typescript
   import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/dialogs/confirm-dialog.component';
   import { MatDialog } from '@angular/material/dialog';
   import { MatSnackBar } from '@angular/material/snack-bar';
   import { firstValueFrom } from 'rxjs';

   private readonly dialog = inject(MatDialog);
   private readonly snack  = inject(MatSnackBar);
   readonly busyId = signal<number | null>(null);

   async onDelete(f: FooDto) {
     const ref = this.dialog.open(ConfirmDialogComponent, {
       data: { title: 'Delete foo', message: `Delete "${f.fooNumber}"?`, confirmText: 'Delete', danger: true } as ConfirmDialogData,
       width: '440px',
     });
     if (!await firstValueFrom(ref.afterClosed())) return;
     this.busyId.set(f.id);
     try {
       await this.api.deleteFoo(f.id);
       this.snack.open(`Foo ${f.fooNumber} deleted`, 'Dismiss', { duration: 4000 });
       await this.reload();
     } catch (e: any) {
       this.snack.open(e?.error?.error ?? e?.message ?? 'Delete failed', 'Dismiss', { duration: 6000 });
     } finally { this.busyId.set(null); }
   }
   ```

4. **Add the routes in `bar.routes.ts`:**
   ```typescript
   { path: 'foos/new',      loadComponent: () => import('./foos/foo-form.component').then(m => m.FooFormComponent) },
   { path: 'foos/:id/edit', loadComponent: () => import('./foos/foo-form.component').then(m => m.FooFormComponent) },
   ```

**Verify frontend builds clean:**
```powershell
cd src\frontend\ulp-web
$env:NODE_OPTIONS = "--max-old-space-size=8192"
node_modules\.bin\ng build --configuration=development
```

---

## Smoke test (manual, 2 min per entity)

1. `dotnet run --project src\backend\host\Ulp.Api\Ulp.Api.csproj` (API)
2. `npm start` in `src\frontend\ulp-web` (SPA)
3. Open `http://localhost:4200`, sign in
4. Navigate to `/app/bar/foos`
5. Click `+ New foo` → fill form → Create → should redirect to list, new row visible
6. Click pencil icon on a row → form prefilled with the row's data → change a field → Update → list shows update
7. Click trash icon on a row → confirm dialog → Delete → row gone, snackbar shown
8. Try to delete a row that has dependents → confirm dialog → Delete → snackbar shows the guard error from step 2

---

## Modules + entities to apply this to (priority order for next session)

| Priority | Module | Entities (in this order) |
|---|---|---|
| 1 (high — needed for demos) | **MasterData** | Party (customers/vendors/carriers); Product |
| 2 | **VendorManagement** | Vendor onboarding, Agreement, NCR |
| 3 | **Procurement** | PurchaseRequisition, PurchaseOrder |
| 4 | **FreightForwarding** | Booking, Shipment (form-driven) |
| 5 | **Accounting** | Invoice, Bill, Receipt, Payment (CRUD on top of existing post/void actions) |
| 6 | **PricingQuotation** | RateCard, Quote |
| 7 | **Customs** | Entry (create/edit; delete already guarded by sealed LLD) |
| 8 | **LastMile** | Booking |
| 9 | **DocumentManagement** | Document upload form (separate pattern — file input) |
| 10 | **Identity** | User, Role, Permission |
| 11 | **Notifications** | Template (read-only stays for inbox + rules) |
| 12 | **Sales** remainder | Activity, Campaign, RFQ |

**Estimated effort** with this recipe: ~45 min per entity × ~30 entities = ~22 hours total. Spread across 6–8 focused sessions.

---

## What NOT to do

- ❌ Don't build a new delete dialog per module — use the shared `ConfirmDialogComponent`
- ❌ Don't allow `id`, `tenantId`, `fooNumber`, or `createdAt` to be editable
- ❌ Don't hard-delete entities that have downstream references — guard first, throw `InvalidOperationException` with a clear message
- ❌ Don't put country-specific logic in the form component — that's plugin work
- ❌ Don't write tests in the form component file — separate `.spec.ts` next to it
