import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TruckingApiService } from '../shared/trucking-api.service';
import { AccessorialDto, DriverDto, JobAvailabilityStatus, JobDetailDto } from '../shared/trucking-types';

@Component({
  selector: 'ulp-job-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, ReactiveFormsModule,
            MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="detail-page">
      <a routerLink=".." class="back-link"><mat-icon>arrow_back</mat-icon> Back to board</a>

      @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
      @else if (!job()) { <div class="err"><mat-icon>error_outline</mat-icon> Job not found</div> }
      @else {
        <div class="job-header">
          <div>
            <h1>{{ job()!.header.jobNumber }}</h1>
            <span class="status status--{{ job()!.header.availabilityStatus.toLowerCase() }}">{{ statusLabel(job()!.header.availabilityStatus) }}</span>
            <span class="move-tag">{{ job()!.header.moveType }}</span>
          </div>
          <div class="header-actions">
            @if (nextStatus()) {
              <button mat-flat-button color="primary" (click)="advance()" [disabled]="advancing()">
                @if (advancing()) { <mat-spinner diameter="16"></mat-spinner> }
                @else { Advance → {{ nextStatusLabel() }} }
              </button>
            }
          </div>
        </div>

        <div class="grid-2">
          <!-- Job info card -->
          <div class="card">
            <div class="card-title">Job Details</div>
            <div class="field-grid">
              <div class="field"><span class="field-label">Customer</span><span>{{ job()!.header.customerName ?? '#' + job()!.header.customerPartyId }}</span></div>
              <div class="field"><span class="field-label">Cust Ref</span><span>{{ job()!.header.custRef ?? '—' }}</span></div>
              <div class="field"><span class="field-label">B/L #</span><span>{{ job()!.blNumber ?? '—' }}</span></div>
              <div class="field"><span class="field-label">SSL</span><span>{{ job()!.sslCode ?? '—' }}</span></div>
              <div class="field"><span class="field-label">Container #</span><span>{{ job()!.header.containerNumber ?? '—' }}</span></div>
              <div class="field"><span class="field-label">Size</span><span>{{ job()!.header.containerSize ?? '—' }}</span></div>
              <div class="field"><span class="field-label">Weight</span><span>{{ job()!.weightKg ? (job()!.weightKg! | number:'1.0-0') + ' kg' : '—' }}</span></div>
              <div class="field"><span class="field-label">ETA</span><span>{{ job()!.header.etaDate ? (job()!.header.etaDate! | slice:0:10) : '—' }}</span></div>
              <div class="field"><span class="field-label" [class.lfd-warn]="lfdWarning()">LFD</span><span [class.lfd-warn]="lfdWarning()">{{ job()!.header.lfdDate ? (job()!.header.lfdDate! | slice:0:10) : '—' }}</span></div>
            </div>
          </div>

          <!-- PU / Delivery card -->
          <div class="card">
            <div class="card-title">Pick Up &amp; Delivery</div>
            <div class="field-grid">
              <div class="field"><span class="field-label">P/U Location</span><span>{{ job()!.header.puLocation ?? '—' }}</span></div>
              <div class="field"><span class="field-label">P/U Date</span><span>{{ job()!.header.puDate ? (job()!.header.puDate! | slice:0:10) : '—' }}</span></div>
              <div class="field"><span class="field-label">Appt Required</span><span>{{ job()!.puAppointmentRequired ? 'Yes' : 'No' }}</span></div>
              <div class="field"><span class="field-label">Del Location</span><span>{{ job()!.header.delLocation ?? '—' }}</span></div>
              <div class="field"><span class="field-label">Del Date</span><span>{{ job()!.header.delDate ? (job()!.header.delDate! | slice:0:10) : '—' }}</span></div>
              <div class="field"><span class="field-label">Return Location</span><span>{{ job()!.returnLocation ?? '—' }}</span></div>
              <div class="field"><span class="field-label">Return Date</span><span>{{ job()!.returnDate ? (job()!.returnDate! | slice:0:10) : '—' }}</span></div>
              <div class="field"><span class="field-label">Return #</span><span>{{ job()!.returnNumber ?? '—' }}</span></div>
              <div class="field full"><span class="field-label">Notes</span><span>{{ job()!.notes ?? '—' }}</span></div>
            </div>
          </div>

          <!-- Dispatch assignment card -->
          <div class="card">
            <div class="card-title">Dispatch Assignment</div>
            <div class="field-grid">
              <div class="field"><span class="field-label">Driver</span><span>{{ job()!.header.driverName ?? 'Unassigned' }}</span></div>
              <div class="field"><span class="field-label">Truck</span><span>{{ job()!.header.truckNumber ?? '—' }}</span></div>
              <div class="field"><span class="field-label">Chassis</span><span>{{ job()!.header.chassisNumber ?? '—' }}</span></div>
            </div>
            @if (job()!.header.availabilityStatus === 'AvailablePendingAppointment') {
              <div class="dispatch-form">
                <div class="card-title" style="margin-top:16px">Assign Driver / Equipment</div>
                <form [formGroup]="dispatchForm" (ngSubmit)="assignDispatch()">
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="flex1">
                      <mat-label>Driver</mat-label>
                      <mat-select formControlName="driverId">
                        @for (d of availableDrivers(); track d.id) {
                          <mat-option [value]="d.id">{{ d.fullName }} ({{ d.driverCode }})</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <button mat-flat-button color="accent" type="submit" [disabled]="dispatchForm.invalid || assigning()">
                      @if (assigning()) { <mat-spinner diameter="16"></mat-spinner> } @else { Dispatch }
                    </button>
                  </div>
                </form>
              </div>
            }
          </div>

          <!-- Accessorials card -->
          <div class="card">
            <div class="card-title">Accessorial Charges
              <span class="acc-total">Total: {{ job()!.header.accessorialTotalAmount | number:'1.2-2' }} {{ job()!.header.accessorialCurrency }}</span>
            </div>
            @if (job()!.accessorials.length === 0) {
              <p class="empty-msg">No accessorial charges.</p>
            } @else {
              <table class="acc-table">
                <thead><tr><th>Code</th><th>Description</th><th>Date</th><th>Qty</th><th class="num">Amount</th><th>Billed</th></tr></thead>
                <tbody>
                  @for (a of job()!.accessorials; track a.id) {
                    <tr>
                      <td><code>{{ a.accessorialCode }}</code></td>
                      <td>{{ a.accessorialName }}</td>
                      <td>{{ a.occurredAt | slice:0:10 }}</td>
                      <td>{{ a.quantity }}</td>
                      <td class="num">{{ a.amount | number:'1.2-2' }} {{ a.currency }}</td>
                      <td>{{ a.isBilled ? '✅' : '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
            <!-- Add accessorial -->
            <div class="add-acc">
              <form [formGroup]="accForm" (ngSubmit)="addAccessorial()">
                <div class="form-row">
                  <mat-form-field appearance="outline" class="flex1">
                    <mat-label>Charge type</mat-label>
                    <mat-select formControlName="accessorialId">
                      @for (a of accessorialMaster(); track a.id) {
                        <mat-option [value]="a.id">{{ a.name }} ({{ a.uom }})</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" style="width:80px">
                    <mat-label>Qty</mat-label>
                    <input matInput formControlName="quantity" type="number" step="0.5" />
                  </mat-form-field>
                  <button mat-stroked-button type="submit" [disabled]="accForm.invalid || addingAcc()">
                    @if (addingAcc()) { <mat-spinner diameter="14"></mat-spinner> } @else { Add }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Status history -->
        <div class="card mt">
          <div class="card-title">Status History</div>
          @if (job()!.statusEvents.length === 0) { <p class="empty-msg">No events yet.</p> }
          @else {
            <div class="timeline">
              @for (ev of job()!.statusEvents; track ev.id) {
                <div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-body">
                    <span class="tl-status">{{ ev.fromStatus ? ev.fromStatus + ' → ' : '' }}{{ ev.toStatus }}</span>
                    <span class="tl-time">{{ ev.occurredAt | slice:0:16 }}</span>
                    @if (ev.driverName) { <span class="tl-who">{{ ev.driverName }}</span> }
                    @if (ev.locationText) { <span class="tl-loc"> · {{ ev.locationText }}</span> }
                    @if (ev.notes) { <div class="tl-note">{{ ev.notes }}</div> }
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- PODs -->
        @if (job()!.pods.length > 0) {
          <div class="card mt">
            <div class="card-title">Proof of Delivery ({{ job()!.pods.length }})</div>
            <div class="pod-list">
              @for (p of job()!.pods; track p.id) {
                <div class="pod-item">
                  <mat-icon>verified</mat-icon>
                  <span>{{ p.podKind }} · {{ p.signedByName ?? 'Unknown' }} · {{ p.signedAt | slice:0:16 }}</span>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .detail-page { max-width:1100px;margin:0 auto; }
    .back-link { display:flex;align-items:center;gap:4px;color:#6B5BA0;text-decoration:none;font-size:13px;margin-bottom:16px; }
    .back-link:hover { color:#3F2D7C; }
    .loading,.err { padding:32px;text-align:center;color:#6B5BA0; }
    .job-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px; }
    .job-header h1 { font-size:26px;font-weight:800;margin:0 0 8px;
      background:linear-gradient(90deg,#E54A8A,#5B3FA0,#3F2D7C);
      -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent; }
    .status { padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;margin-right:8px; }
    .move-tag { background:#E8E2F4;color:#3F2D7C;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700; }
    .status--notreadyforpickup { background:#FBE4E5;color:#B23F45; }
    .status--availablependingappointment { background:#FFF3D6;color:#946100; }
    .status--dispatched { background:#DCEAF8;color:#1F4E8A; }
    .status--outgated { background:#E8F5E9;color:#2E7D32; }
    .status--completed { background:#DCF5E4;color:#1F7A3D; }
    .status--cancelled { background:#F5F5F5;color:#777; }
    .header-actions { display:flex;gap:8px;align-items:center; }
    .grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px; }
    .card { background:#fff;border:1px solid #E8E2F4;border-radius:12px;padding:20px;
      box-shadow:0 2px 8px rgba(63,45,124,.05); }
    .card.mt { margin-top:16px; }
    .card-title { font-size:13px;font-weight:700;color:#3F2D7C;text-transform:uppercase;letter-spacing:.5px;
      margin-bottom:14px;display:flex;justify-content:space-between;align-items:center; }
    .acc-total { font-size:12px;font-weight:600;color:#1A1A33;text-transform:none; }
    .field-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
    .field { display:flex;flex-direction:column;gap:2px; }
    .field.full { grid-column:1/-1; }
    .field-label { font-size:10px;font-weight:600;color:#9A9AA3;text-transform:uppercase; }
    .lfd-warn { color:#B23F45;font-weight:700; }
    .dispatch-form .form-row { display:flex;gap:8px;align-items:center;flex-wrap:wrap; }
    .flex1 { flex:1;min-width:160px; }
    .form-row { display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px; }
    .acc-table { width:100%;border-collapse:collapse;font-size:12px;margin:8px 0; }
    .acc-table th { text-align:left;padding:6px 8px;background:#F5F2FB;color:#3F2D7C;font-size:11px;font-weight:700;text-transform:uppercase; }
    .acc-table td { padding:6px 8px;border-bottom:1px solid #F0EBF8; }
    .acc-table td.num { text-align:right; }
    .empty-msg { color:#9A9AA3;font-size:13px; }
    .add-acc { margin-top:12px;border-top:1px solid #F0EBF8;padding-top:12px; }
    code { background:#F5F2FB;padding:1px 5px;border-radius:3px;font-size:11px; }
    .timeline { display:flex;flex-direction:column;gap:0; }
    .timeline-item { display:flex;gap:12px;position:relative;padding-bottom:12px; }
    .timeline-dot { width:10px;height:10px;border-radius:50%;background:#5B3FA0;margin-top:3px;flex-shrink:0; }
    .timeline-body { flex:1; }
    .tl-status { font-weight:600;font-size:13px;color:#1A1A33; }
    .tl-time { color:#9A9AA3;font-size:11px;margin-left:8px; }
    .tl-who { color:#5B3FA0;font-size:11px;margin-left:8px; }
    .tl-loc { color:#9A9AA3;font-size:11px; }
    .tl-note { color:#6B5BA0;font-size:12px;margin-top:2px; }
    .pod-list { display:flex;flex-direction:column;gap:8px; }
    .pod-item { display:flex;align-items:center;gap:8px;font-size:13px;color:#1A1A33; }
    .pod-item mat-icon { color:#1F7A3D; }
    @media (max-width:800px) { .grid-2 { grid-template-columns:1fr; } }
  `],
})
export class JobDetailComponent implements OnInit {
  private readonly api   = inject(TruckingApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb    = inject(FormBuilder);

  readonly job              = signal<JobDetailDto | null>(null);
  readonly loading          = signal(true);
  readonly advancing        = signal(false);
  readonly assigning        = signal(false);
  readonly addingAcc        = signal(false);
  readonly availableDrivers = signal<DriverDto[]>([]);
  readonly accessorialMaster = signal<AccessorialDto[]>([]);

  readonly dispatchForm = this.fb.group({ driverId: [null as number | null, Validators.required] });
  readonly accForm = this.fb.group({
    accessorialId: [null as number | null, Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.5)]],
  });

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const [detail, drivers, accs] = await Promise.all([
      this.api.getJob(id),
      this.api.listDrivers('Available'),
      this.api.listAccessorials(),
    ]);
    this.job.set(detail);
    this.availableDrivers.set(drivers);
    this.accessorialMaster.set(accs);
    this.loading.set(false);
  }

  lfdWarning(): boolean {
    const lfd = this.job()?.header.lfdDate;
    if (!lfd) return false;
    return (new Date(lfd).getTime() - Date.now()) / 86400000 <= 2;
  }

  nextStatus(): JobAvailabilityStatus | null {
    const flow: Partial<Record<JobAvailabilityStatus, JobAvailabilityStatus>> = {
      NotReadyForPickup: 'AvailablePendingAppointment',
      AvailablePendingAppointment: 'Dispatched',
      Dispatched: 'OutGated',
      OutGated: 'WaitingReturnNotify',
      WaitingReturnNotify: 'Completed',
    };
    const cur = this.job()?.header.availabilityStatus;
    return cur ? (flow[cur] ?? null) : null;
  }

  nextStatusLabel(): string {
    const s = this.nextStatus();
    const map: Partial<Record<JobAvailabilityStatus, string>> = {
      AvailablePendingAppointment: 'Available', Dispatched: 'Dispatch',
      OutGated: 'Out-Gate', WaitingReturnNotify: 'Waiting Return', Completed: 'Complete',
    };
    return s ? (map[s] ?? s) : '';
  }

  statusLabel(s: JobAvailabilityStatus): string {
    const m: Record<string, string> = {
      NotReadyForPickup: 'Not Ready', AvailablePendingAppointment: 'Available',
      Dispatched: 'Dispatched', OutGated: 'Out-Gated',
      WaitingReturnNotify: 'Waiting Return', Completed: 'Completed', Cancelled: 'Cancelled',
    };
    return m[s] ?? s;
  }

  async advance() {
    const next = this.nextStatus();
    if (!next || !this.job()) return;
    this.advancing.set(true);
    try {
      await this.api.advanceStatus(this.job()!.header.id, next);
      this.job.set(await this.api.getJob(this.job()!.header.id));
    } finally { this.advancing.set(false); }
  }

  async assignDispatch() {
    if (this.dispatchForm.invalid || !this.job()) return;
    this.assigning.set(true);
    try {
      await this.api.assignDispatch(this.job()!.header.id, this.dispatchForm.value.driverId!);
      this.job.set(await this.api.getJob(this.job()!.header.id));
    } finally { this.assigning.set(false); }
  }

  async addAccessorial() {
    if (this.accForm.invalid || !this.job()) return;
    this.addingAcc.set(true);
    try {
      const v = this.accForm.value;
      await this.api.addAccessorial(this.job()!.header.id, {
        accessorialId: v.accessorialId!,
        occurredAt: new Date().toISOString().slice(0, 10),
        quantity: v.quantity!,
      });
      this.job.set(await this.api.getJob(this.job()!.header.id));
      this.accForm.reset({ quantity: 1 });
    } finally { this.addingAcc.set(false); }
  }
}
