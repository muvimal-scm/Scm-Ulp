---
name: angular-17-signals
description: Angular 17 standalone components and signals patterns for ULP frontend. Use when building any Angular component, service, page, route, or form. Covers signals over RxJS BehaviorSubject for state, standalone components (no NgModules), inject() over constructor injection, new control flow (@if, @for, @switch), Material 17, ChangeDetectionStrategy.OnPush. Always use this skill for ANY new Angular component work.
---

# Angular 17 + Signals for ULP

## When this skill triggers
Any frontend Angular work: components, services, routing, forms. ULP is locked on Angular 17 LTS with **standalone components** and **signals over RxJS BehaviorSubject** for new state.

## Top 3 reference repos
1. **Ismaestro/angular-example-app** (https://github.com/Ismaestro/angular-example-app) - Production-ready Angular starter. CRUD, auth, i18n, lazy loading, signals. Modern Angular conventions throughout.
2. **wlucha/angular-starter** (https://github.com/wlucha/angular-starter) - Angular starter with Material, Transloco, Jest, Compodoc, ESLint, Docker. Direct template for ULP.
3. **angular/angular** (https://github.com/angular/angular) - Official source. The `aio/` folder has latest doc examples especially `signals/` and `standalone/`.

## Standard ULP component pattern

```typescript
// frontend/src/app/m17-accounts/invoice-list.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'ulp-invoice-list',
  standalone: true,                           // ALWAYS standalone
  imports: [CommonModule, MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,  // ALWAYS OnPush
  template: `
    @if (loading()) {
      <mat-spinner />
    } @else if (invoices().length === 0) {
      <p>No invoices yet</p>
    } @else {
      <table mat-table [dataSource]="filtered()">
        @for (col of displayedColumns; track col) {
          <ng-container [matColumnDef]="col">...</ng-container>
        }
      </table>
    }
    <p>Total: {{ totalAmount() | currency:'INR' }}</p>
  `
})
export class InvoiceListComponent {
  private readonly invoiceSvc = inject(InvoiceService);

  // State as signals
  protected readonly invoices = signal<Invoice[]>([]);
  protected readonly loading = signal(false);
  protected readonly filterText = signal('');

  // Computed - automatic dependency tracking
  protected readonly filtered = computed(() =>
    this.invoices().filter(i =>
      i.customerName.toLowerCase().includes(this.filterText().toLowerCase()))
  );

  protected readonly totalAmount = computed(() =>
    this.filtered().reduce((sum, inv) => sum + inv.amount, 0)
  );

  protected readonly displayedColumns = ['id', 'date', 'customer', 'amount', 'status'];

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const data = await this.invoiceSvc.getAll();
      this.invoices.set(data);
    } finally {
      this.loading.set(false);
    }
  }
}
```

## Service with signals

```typescript
@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);
  
  private readonly _invoices = signal<Invoice[]>([]);
  readonly invoices = this._invoices.asReadonly();

  async getAll(): Promise<Invoice[]> {
    const data = await firstValueFrom(this.http.get<Invoice[]>('/api/v1/invoices'));
    this._invoices.set(data);
    return data;
  }

  async approve(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/v1/invoices/${id}/approve`, {}, {
      headers: { 'Idempotency-Key': crypto.randomUUID() }
    }));
    this._invoices.update(list => list.map(inv =>
      inv.id === id ? { ...inv, status: 'Approved' } : inv));
  }
}
```

## Routing with lazy load

```typescript
export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'm17/invoices',
    loadChildren: () => import('./m17-accounts/m17.routes').then(r => r.M17_ROUTES),
    canActivate: [authGuard, hasPermissionGuard('invoice.read')]
  }
];
```

## Gotchas specific to ULP

1. **NEVER use NgModules** - all components are standalone. PR rejected if you create new modules.
2. **NEVER use ChangeDetectionStrategy.Default** - always `OnPush`. Performance critical at scale.
3. **Signals over BehaviorSubject for new code** - existing BehaviorSubject code is being migrated.
4. **Use `inject()` not constructor injection** - cleaner, easier to refactor.
5. **New control flow `@if`, `@for`, `@switch`** - never `*ngIf`, `*ngFor` in new code.
6. **`@for` MUST have `track` expression** - missing track causes performance regression.
7. **Idempotency-Key on every POST/PUT/PATCH** - generated via `crypto.randomUUID()`.
8. **Tenant context flows via JWT** - HTTP interceptor adds it. Don't pass tenantId in URL.
9. **Async operations use `firstValueFrom`** not `.subscribe()`.
10. **OnPush + signals = no zone.js needed** - working toward zoneless. Don't add zone.js dependencies.

## ULP companion docs
- Frontend architecture: `docs/ULP_HLD_v1.0_HighLevelDesign.docx` Section 3
- Module-specific UIs: each LLD has UI sections
