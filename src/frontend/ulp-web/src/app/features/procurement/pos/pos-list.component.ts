import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { DecimalPipe, SlicePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProcurementApiService } from '../shared/procurement-api.service';
import { PoDto, PoStatus } from '../shared/procurement-types';

interface Tab { key: string; label: string; statuses: PoStatus[]; empty: string; }

@Component({
  selector: 'ulp-procurement-pos',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, NgTemplateOutlet, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Purchase Orders</h1>
          <p>Full PO workflow: Requires Review → Confirmed → Booked.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon>&nbsp;New PO</a>
      </div>
    </header>

    <!-- Workflow tabs -->
    <nav class="tabs">
      @for (t of tabs; track t.key) {
        <button class="tab" [class.tab--active]="activeTab() === t.key" (click)="setTab(t.key)">
          {{ t.label }}
          @if (counts()[t.key] !== undefined) {
            <span class="tab-count" [class.tab-count--warn]="t.key === 'review' && counts()[t.key] > 0">
              {{ counts()[t.key] }}
            </span>
          }
        </button>
      }
    </nav>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {

      <!-- REQUIRES REVIEW — OCR match highlight -->
      @if (activeTab() === 'review') {
        @if (rows().length === 0) {
          <div class="empty-state"><mat-icon>check_circle</mat-icon><p>No POs require review.</p></div>
        } @else {
          <div class="review-cards">
            @for (p of rows(); track p.id) {
              <div class="review-card" [class.review-card--match]="p.status === 'Draft'" [class.review-card--mismatch]="false">
                <div class="review-card-head">
                  <div>
                    <code>{{ p.poNumber }}</code>
                    <span class="review-tag">Requires Review</span>
                  </div>
                  <div class="review-actions">
                    <button mat-flat-button color="primary" (click)="approve(p)" [disabled]="acting() === p.id">
                      @if (acting() === p.id) { <mat-spinner diameter="14"></mat-spinner> }
                      @else { ✅ Approve }
                    </button>
                    <a mat-stroked-button [routerLink]="[p.id]">Open →</a>
                  </div>
                </div>
                <div class="review-card-body">
                  <div class="review-field"><span class="rl">Vendor</span><span>#{{ p.vendorPartyId }}</span></div>
                  <div class="review-field"><span class="rl">Total</span>
                    <span>{{ p.totalAmount ? (p.totalAmount | number:'1.2-2') + ' ' + (p.totalCurrency ?? '') : '—' }}</span>
                  </div>
                  <div class="review-field"><span class="rl">Expected</span>
                    <span>{{ p.expectedDeliveryDate ? (p.expectedDeliveryDate | slice:0:10) : '—' }}</span>
                  </div>
                  <div class="review-field"><span class="rl">Lines</span><span>{{ p.lineCount }}</span></div>
                  <div class="review-field"><span class="rl">GRNs</span><span>{{ p.grnCount }}</span></div>
                </div>
                <div class="review-invoice-hint">
                  <mat-icon>receipt_long</mat-icon>
                  <span>Open PO to compare PO lines vs Proforma Invoice (PI) values</span>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- UNDER REVIEW -->
      @if (activeTab() === 'pending') {
        <div class="info-banner"><mat-icon>hourglass_empty</mat-icon> Awaiting PI from vendor. POs shown here have no invoice match yet.</div>
        <ng-container *ngTemplateOutlet="poTable"></ng-container>
      }

      <!-- CONFIRMED ORDERS -->
      @if (activeTab() === 'confirmed') {
        @if (rows().length === 0) {
          <div class="empty-state"><mat-icon>inbox</mat-icon><p>No confirmed orders.</p></div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th>PO #</th><th>Vendor</th><th class="num">Total</th>
                <th>Expected</th><th>GRNs</th><th>Actions</th>
              </tr></thead>
              <tbody>
                @for (p of rows(); track p.id) {
                  <tr>
                    <td><a [routerLink]="[p.id]" class="link"><code>{{ p.poNumber }}</code></a></td>
                    <td>#{{ p.vendorPartyId }}</td>
                    <td class="num">{{ p.totalAmount ? (p.totalAmount | number:'1.2-2') : '—' }} {{ p.totalCurrency ?? '' }}</td>
                    <td>{{ p.expectedDeliveryDate ? (p.expectedDeliveryDate | slice:0:10) : '—' }}</td>
                    <td>{{ p.grnCount }}</td>
                    <td>
                      <div class="action-row">
                        <button mat-flat-button color="accent" (click)="openBookingRequest(p)" matTooltip="Create booking request for this PO">
                          <mat-icon>flight_takeoff</mat-icon> Booking Request
                        </button>
                        <button mat-stroked-button (click)="sendPo(p)" [disabled]="acting() === p.id">
                          @if (acting() === p.id) { <mat-spinner diameter="14"></mat-spinner> } @else { Mark Sent }
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- Booking request panel -->
      @if (bookingPo()) {
        <div class="booking-overlay" (click)="bookingPo.set(null)">
          <div class="booking-panel" (click)="$event.stopPropagation()">
            <div class="booking-panel-head">
              <h3>Booking Request — {{ bookingPo()!.poNumber }}</h3>
              <button mat-icon-button (click)="bookingPo.set(null)"><mat-icon>close</mat-icon></button>
            </div>
            <p class="booking-hint">Fill in the shipment details before creating a booking request. This will notify the agent assigned to the incoterm account.</p>
            <div class="booking-fields">
              <div class="bfield"><label>POL (Port of Loading)</label><input [(ngModel)]="bkPol" placeholder="CNSHG" /></div>
              <div class="bfield"><label>POD (Port of Discharge)</label><input [(ngModel)]="bkPod" placeholder="USLAX" /></div>
              <div class="bfield"><label>Container Volume</label><input [(ngModel)]="bkCntrVol" placeholder="1 x 40HC" /></div>
              <div class="bfield"><label>Estimated CRD</label><input [(ngModel)]="bkCrd" type="date" /></div>
            </div>
            <div class="booking-actions">
              <button mat-stroked-button (click)="bookingPo.set(null)">Cancel</button>
              <button mat-flat-button color="primary" (click)="submitBookingRequest()">Create Booking Request</button>
            </div>
          </div>
        </div>
      }

      <!-- BOOKED -->
      @if (activeTab() === 'booked') {
        <ng-container *ngTemplateOutlet="poTable"></ng-container>
      }

      <!-- ALL -->
      @if (activeTab() === 'all') {
        <ng-container *ngTemplateOutlet="poTable"></ng-container>
      }
    }

    <!-- Shared table template -->
    <ng-template #poTable>
      @if (rows().length === 0) {
        <div class="empty-state"><mat-icon>inbox</mat-icon><p>{{ currentTab()?.empty }}</p></div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>PO #</th><th>Country</th><th>Vendor</th>
              <th class="num">Total</th><th>Expected</th><th>Status</th>
              <th class="num">Lines</th><th class="num">GRNs</th><th></th>
            </tr></thead>
            <tbody>
              @for (p of rows(); track p.id) {
                <tr>
                  <td><code>{{ p.poNumber }}</code></td>
                  <td>{{ p.countryCode }}</td>
                  <td>#{{ p.vendorPartyId }}</td>
                  <td class="num">{{ p.totalAmount ? (p.totalAmount | number:'1.2-2') : '—' }} {{ p.totalCurrency ?? '' }}</td>
                  <td>{{ p.expectedDeliveryDate ? (p.expectedDeliveryDate | slice:0:10) : '—' }}</td>
                  <td><span class="status status--{{ p.status.toLowerCase() }}">{{ p.status }}</span></td>
                  <td class="num">{{ p.lineCount }}</td>
                  <td class="num">{{ p.grnCount }}</td>
                  <td><a [routerLink]="[p.id]" class="link">Open →</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </ng-template>
  `,
  styles: [`
    :host { display:block; }
    .head-row { display:flex;align-items:flex-start;justify-content:space-between;gap:16px; }
    .page-head h1 { font-size:28px;font-weight:800;margin:0 0 4px;
      background:linear-gradient(90deg,#E54A8A,#5B3FA0,#3F2D7C);
      -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent; }
    .page-head p { color:#6B5BA0;margin:0 0 16px; }
    .tabs { display:flex;gap:4px;border-bottom:2px solid #E8E2F4;margin-bottom:20px;flex-wrap:wrap; }
    .tab { background:transparent;border:none;cursor:pointer;padding:10px 14px;font-size:13px;font-weight:600;
           color:#6B5BA0;border-bottom:3px solid transparent;margin-bottom:-2px;font-family:inherit;
           display:flex;align-items:center;gap:6px; }
    .tab--active { color:#3F2D7C;border-bottom-color:#5B3FA0; }
    .tab-count { background:#E8E2F4;color:#3F2D7C;border-radius:999px;padding:1px 7px;font-size:11px; }
    .tab-count--warn { background:#FBE4E5;color:#B23F45; }
    .loading { padding:32px;text-align:center;color:#6B5BA0; }
    .empty-state { padding:48px;text-align:center;color:#9A9AA3; }
    .empty-state mat-icon { font-size:36px;width:36px;height:36px;color:#C9BEEC;display:block;margin:0 auto 12px; }
    .info-banner { display:flex;align-items:center;gap:8px;background:#FFF3D6;border:1px solid #F0D080;
      border-radius:8px;padding:12px 16px;color:#946100;font-size:13px;margin-bottom:16px; }
    /* Review cards */
    .review-cards { display:flex;flex-direction:column;gap:16px; }
    .review-card { border:2px solid #DCEAF8;border-radius:12px;padding:16px;background:#F8FBFF; }
    .review-card--mismatch { border-color:#FBE4E5;background:#FFF8F8; }
    .review-card-head { display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px;flex-wrap:wrap; }
    .review-tag { padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:#DCEAF8;color:#1F4E8A;margin-left:8px; }
    .review-actions { display:flex;gap:8px; }
    .review-card-body { display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:10px; }
    .review-field { display:flex;flex-direction:column;gap:2px; }
    .rl { font-size:10px;font-weight:600;color:#9A9AA3;text-transform:uppercase; }
    .review-invoice-hint { display:flex;align-items:center;gap:6px;color:#6B5BA0;font-size:12px;border-top:1px solid #E8E2F4;padding-top:10px; }
    .review-invoice-hint mat-icon { font-size:16px;width:16px;height:16px; }
    /* Table */
    .table-wrap { background:#fff;border:1px solid #E8E2F4;border-radius:12px;
      box-shadow:0 4px 16px rgba(63,45,124,.06);overflow:auto; }
    table { width:100%;border-collapse:collapse; }
    thead th { text-align:left;padding:12px 14px;background:#F5F2FB;color:#3F2D7C;
      font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px; }
    thead th.num { text-align:right; }
    tbody td { padding:10px 14px;border-bottom:1px solid #F0EBF8;font-size:13px; }
    tbody td.num { text-align:right; }
    tbody tr:last-child td { border-bottom:none; }
    code { background:#F5F2FB;padding:1px 6px;border-radius:4px;font-size:12px; }
    .status { padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#E8E2F4;color:#3F2D7C; }
    .status--draft { background:#FFF3D6;color:#946100; }
    .status--approved { background:#DCF5E4;color:#1F7A3D; }
    .status--sent { background:#DCEAF8;color:#1F4E8A; }
    .status--partialreceipt { background:#E8E2F4;color:#3F2D7C; }
    .status--closed { background:#F5F5F5;color:#777; }
    .status--cancelled { background:#FBE4E5;color:#B23F45;text-decoration:line-through; }
    .link { color:#5B3FA0;text-decoration:none;font-weight:600; }
    .action-row { display:flex;gap:8px;align-items:center; }
    /* Booking request overlay */
    .booking-overlay { position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:1000; }
    .booking-panel { background:#fff;border-radius:16px;padding:28px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.3); }
    .booking-panel-head { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
    .booking-panel-head h3 { font-size:18px;font-weight:800;margin:0;color:#3F2D7C; }
    .booking-hint { color:#6B5BA0;font-size:13px;margin-bottom:20px; }
    .booking-fields { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px; }
    .bfield { display:flex;flex-direction:column;gap:6px; }
    .bfield label { font-size:11px;font-weight:700;color:#3F2D7C;text-transform:uppercase; }
    .bfield input { border:1px solid #E8E2F4;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit; }
    .bfield input:focus { outline:none;border-color:#5B3FA0; }
    .booking-actions { display:flex;gap:12px;justify-content:flex-end; }
  `],
})
export class PosListComponent implements OnInit {
  private readonly api = inject(ProcurementApiService);

  readonly allPos  = signal<PoDto[]>([]);
  readonly loading = signal(true);
  readonly acting  = signal<number | null>(null);
  readonly activeTab = signal('all');
  readonly bookingPo = signal<PoDto | null>(null);

  bkPol = ''; bkPod = ''; bkCntrVol = ''; bkCrd = '';

  readonly tabs: Tab[] = [
    { key: 'all',       label: 'All Orders',          statuses: ['Draft','Approved','Sent','PartialReceipt','Closed','Cancelled'], empty: 'No purchase orders.' },
    { key: 'review',    label: 'Requires Review',      statuses: ['Draft'],                                empty: 'No POs require review.' },
    { key: 'pending',   label: 'Under Review',         statuses: ['Draft'],                                empty: 'No POs under review.' },
    { key: 'confirmed', label: 'Confirmed Orders',     statuses: ['Approved'],                             empty: 'No confirmed orders.' },
    { key: 'booked',    label: 'Booked',               statuses: ['Sent','PartialReceipt'],                empty: 'No booked orders.' },
  ];

  readonly currentTab = computed(() => this.tabs.find(t => t.key === this.activeTab()));

  readonly counts = computed((): Record<string, number> => {
    const all = this.allPos();
    return {
      all:       all.length,
      review:    all.filter(p => p.status === 'Draft').length,
      pending:   all.filter(p => p.status === 'Draft').length,
      confirmed: all.filter(p => p.status === 'Approved').length,
      booked:    all.filter(p => p.status === 'Sent' || p.status === 'PartialReceipt').length,
    };
  });

  readonly rows = computed(() => {
    const tab = this.currentTab();
    if (!tab) return this.allPos();
    return this.allPos().filter(p => tab.statuses.includes(p.status));
  });

  async ngOnInit() {
    try { this.allPos.set(await this.api.listPos({ pageSize: 200 })); }
    finally { this.loading.set(false); }
  }

  setTab(key: string) { this.activeTab.set(key); }

  async approve(p: PoDto) {
    this.acting.set(p.id);
    try {
      const updated = await this.api.changePoStatus(p.id, 'Approved');
      this.allPos.update(list => list.map(x => x.id === p.id ? updated : x));
    } finally { this.acting.set(null); }
  }

  async sendPo(p: PoDto) {
    this.acting.set(p.id);
    try {
      const updated = await this.api.changePoStatus(p.id, 'Sent');
      this.allPos.update(list => list.map(x => x.id === p.id ? updated : x));
    } finally { this.acting.set(null); }
  }

  openBookingRequest(p: PoDto) {
    this.bookingPo.set(p);
    this.bkPol = ''; this.bkPod = ''; this.bkCntrVol = ''; this.bkCrd = '';
  }

  submitBookingRequest() {
    // In a real integration this would POST to freight-forwarding/bookings
    // For now: log the intent and close
    console.log('Booking request:', {
      po: this.bookingPo()?.poNumber, pol: this.bkPol, pod: this.bkPod,
      cntrVol: this.bkCntrVol, crd: this.bkCrd,
    });
    alert(`Booking Request created for ${this.bookingPo()?.poNumber}\nPOL: ${this.bkPol} → POD: ${this.bkPod}\nVolume: ${this.bkCntrVol}, CRD: ${this.bkCrd}`);
    this.bookingPo.set(null);
  }
}
