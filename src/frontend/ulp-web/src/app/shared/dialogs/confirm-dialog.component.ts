import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Reusable confirm dialog used by every module's delete + destructive actions.
 *
 * Usage from a list page:
 * ```ts
 *   const ref = this.dialog.open(ConfirmDialogComponent, {
 *     data: { title: 'Delete lead', message: `Delete ${row.leadNumber}?`, confirmText: 'Delete', danger: true } as ConfirmDialogData,
 *     width: '420px',
 *   });
 *   const confirmed = await firstValueFrom(ref.afterClosed());
 *   if (confirmed) { ... }
 * ```
 *
 * Backed by Material's MatDialog. Accessible by default (focus trap, Esc to dismiss).
 */
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;     // defaults to 'Confirm'
  cancelText?: string;      // defaults to 'Cancel'
  danger?: boolean;         // red Confirm button when true (use for delete/destructive)
}

@Component({
  selector: 'ulp-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title class="title">
      @if (data.danger) { <mat-icon class="danger-icon">warning_amber</mat-icon> }
      {{ data.title }}
    </h2>
    <mat-dialog-content class="content">
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">{{ data.cancelText ?? 'Cancel' }}</button>
      <button mat-flat-button [color]="data.danger ? 'warn' : 'primary'" [mat-dialog-close]="true" cdkFocusInitial>
        {{ data.confirmText ?? 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .title { display: flex; align-items: center; gap: 8px; color: #1A1A33; }
    .title .danger-icon { color: #B23F45; }
    .content p { color: #1A1A33; margin: 0; line-height: 1.5; }
  `],
})
export class ConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: ConfirmDialogData,
    public readonly ref: MatDialogRef<ConfirmDialogComponent, boolean>,
  ) {}
}
