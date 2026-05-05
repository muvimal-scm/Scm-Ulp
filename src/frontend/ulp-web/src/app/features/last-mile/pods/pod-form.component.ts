import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LastMileApiService } from '../shared/last-mile-api.service';
import { CreatePodRequest } from '../shared/last-mile-types';

@Component({
  selector: 'ulp-lastmile-pod-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/last-mile/pods" class="back-link">‹ Back to PODs</a>
      <h1>Capture POD (Proof of Delivery)</h1>
      <p>Record signed-by + GPS + capture time. Signature/photo files attach by document ID after upload to Doc Mgmt.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Booking ID</mat-label>
          <input matInput formControlName="bookingId" type="number" min="1" />
          @if (form.get('bookingId')?.hasError('required')) { <mat-error>Required</mat-error> }
          <mat-hint>Pre-filled from ?bookingId=X</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Captured at</mat-label>
          <input matInput formControlName="capturedAt" type="datetime-local" />
          @if (form.get('capturedAt')?.hasError('required')) { <mat-error>Required</mat-error> }
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Signed by</mat-label>
        <input matInput formControlName="signedBy" maxlength="200" placeholder="Name of person who received" />
      </mat-form-field>

      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Signature image doc ID</mat-label>
          <input matInput formControlName="signatureImageDocId" type="number" min="1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Photo doc ID</mat-label>
          <input matInput formControlName="photoDocId" type="number" min="1" />
        </mat-form-field>
      </div>

      <div class="row-3">
        <mat-form-field appearance="outline">
          <mat-label>GPS lat</mat-label>
          <input matInput formControlName="gpsLat" type="number" step="0.000001" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>GPS lng</mat-label>
          <input matInput formControlName="gpsLng" type="number" step="0.000001" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Captured-by user ID</mat-label>
          <input matInput formControlName="capturedByUserId" type="number" min="1" />
        </mat-form-field>
      </div>

      <div class="actions">
        <button mat-button type="button" routerLink="/app/last-mile/pods" [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) { Saving… } @else { Capture POD }
        </button>
      </div>
    </form>
  `,
  styles: [`
    :host { display: block; }
    .page-head { margin-bottom: 16px; }
    .back-link { color: #5B3FA0; text-decoration: none; font-size: 13px; font-weight: 600; }
    .back-link:hover { text-decoration: underline; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 4px 0;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0; }
    .api-error { display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; margin-bottom: 16px;
      background: #FBE4E5; color: #B23F45;
      border: 1px solid #F5C6CB; border-radius: 8px; font-size: 13px; }
    .form-card { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 24px; max-width: 900px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .full { width: 100%; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    @media (max-width: 720px) { .row-2, .row-3 { grid-template-columns: 1fr; } }
  `],
})
export class PodFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(LastMileApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);

  readonly saving   = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    bookingId:           [0, [Validators.required, Validators.min(1)]],
    signedBy:            [''],
    signatureImageDocId: [null as number | null],
    photoDocId:          [null as number | null],
    gpsLat:              [null as number | null],
    gpsLng:              [null as number | null],
    capturedAt:          ['', [Validators.required]],
    capturedByUserId:    [null as number | null],
  });

  ngOnInit() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    this.form.patchValue({ capturedAt: local });

    const bookingId = this.route.snapshot.queryParamMap.get('bookingId');
    if (bookingId) this.form.patchValue({ bookingId: Number(bookingId) });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.apiError.set(null);
    const v = this.form.getRawValue();

    const req: CreatePodRequest = {
      bookingId:           v.bookingId,
      signedBy:            v.signedBy || null,
      signatureImageDocId: v.signatureImageDocId,
      photoDocId:          v.photoDocId,
      gpsLat:              v.gpsLat,
      gpsLng:              v.gpsLng,
      capturedAt:          new Date(v.capturedAt).toISOString(),
      capturedByUserId:    v.capturedByUserId,
    };

    try {
      const p = await this.api.createPod(req);
      this.snack.open(`POD captured for booking ${p.bookingId}`, 'Dismiss', { duration: 4000 });
      await this.router.navigate(['/app/last-mile/pods']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}
