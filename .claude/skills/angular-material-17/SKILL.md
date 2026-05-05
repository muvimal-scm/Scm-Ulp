---
name: angular-material-17
description: Angular Material 17 component library patterns for ULP UI. Use when implementing forms, tables, dialogs, navigation, or any UI component. Covers form fields with validation, mat-table with pagination/sort, dialogs, snack bars, theming with custom palette. Always prefer Material components over custom HTML when building ULP UIs.
---

# Angular Material 17 for ULP

## When this skill triggers
Building forms, data tables, dialogs, navigation menus, or any UI component. ULP standardizes on Material 17 - never roll custom UI when Material has it.

## Top 3 reference repos
1. **angular/components** (https://github.com/angular/components) - Official Material. The `material/` folder has complete component source + tests.
2. **angular/material.angular.io** (https://github.com/angular/material.angular.io) - The docs site itself, useful as reference implementation.
3. **gergelyszerovay/material-storybook** - Storybook with Material components, useful for visual component reference.

## Standard form pattern

```typescript
@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline">
        <mat-label>Customer</mat-label>
        <mat-select formControlName="customerId" required>
          @for (c of customers(); track c.id) {
            <mat-option [value]="c.id">{{ c.name }}</mat-option>
          }
        </mat-select>
        <mat-error *ngIf="form.controls.customerId.hasError('required')">
          Customer is required
        </mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Amount (INR)</mat-label>
        <input matInput type="number" formControlName="amount" min="0" required>
        <span matTextPrefix>&#8377;&nbsp;</span>
      </mat-form-field>

      <button mat-raised-button color="primary" type="submit" [disabled]="!form.valid">
        Save
      </button>
    </form>
  `
})
```

## Data table with sort + pagination

```typescript
@Component({
  imports: [MatTableModule, MatSortModule, MatPaginatorModule],
  template: `
    <table mat-table [dataSource]="dataSource" matSort>
      <ng-container matColumnDef="invoiceNo">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Invoice #</th>
        <td mat-cell *matCellDef="let inv">{{ inv.invoiceNo }}</td>
      </ng-container>

      <ng-container matColumnDef="amount">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount</th>
        <td mat-cell *matCellDef="let inv">{{ inv.amount | currency:'INR' }}</td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns" (click)="select(row)"></tr>
    </table>

    <mat-paginator [length]="totalCount()" [pageSize]="50"
                   [pageSizeOptions]="[10, 25, 50, 100]" />
  `
})
```

## Theme palette (ULP brand)

```scss
// frontend/src/styles.scss
@use '@angular/material' as mat;

$ulp-primary: mat.define-palette(mat.$indigo-palette, 700);
$ulp-accent: mat.define-palette(mat.$amber-palette, 600);

$ulp-theme: mat.define-light-theme((
  color: (primary: $ulp-primary, accent: $ulp-accent),
  typography: mat.define-typography-config($font-family: 'Inter, sans-serif'),
  density: -1
));

@include mat.all-component-themes($ulp-theme);
```

## Gotchas specific to ULP

1. **`appearance="outline"` for all form fields** - consistency.
2. **Always use `mat-error` not browser validation** - integrates with FormControl state.
3. **`MatTableDataSource` for sort/filter/paginate** - don't reimplement.
4. **Currency display uses `'INR'`** - never `'$'`.
5. **Date picker uses `MatNativeDateModule`** in MVP, switch to Luxon adapter for timezone correctness later.
6. **Dialogs return boolean for confirm/cancel** - always `await firstValueFrom(afterClosed())`.
7. **Accessibility (a11y)** - aria-labels mandatory on icon buttons.
8. **Icons via `mat-icon` with Material Icons font** - not SVGs unless brand-specific.
