import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocumentGenerationApiService } from '../../document-generation/shared/document-generation-api.service';
import { FreightForwardingApiService } from '../shared/freight-forwarding-api.service';
import { HoldType, ReminderKind, ShipmentDetailDto, ShipmentHoldDto, ShipmentMemoDto, ShipmentReminderDto } from '../shared/freight-forwarding-types';

interface DocTemplate {
  code: string;     // template code in m6_template_definition
  label: string;    // human label on the button
  icon: string;     // material icon
}

interface TimelineEntry {
  whenIso: string;
  kind: 'memo' | 'milestone' | 'hold' | 'status' | 'document';
  title: string;
  detail?: string | null;
  pinned?: boolean;
  authorUserId?: number | null;
}

@Component({
  selector: 'ulp-freight-forwarding-shipment-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    }
    @if (data(); as d) {
      <a routerLink=".." class="back">← Back to shipments</a>

      <header class="page-head">
        <h1>{{ d.shipment.shipmentNumber }}</h1>
        <p>
          {{ d.shipment.mode }} via {{ d.shipment.vesselOrFlight ?? '—' }}
          @if (d.shipment.voyageOrFlightNo) { · {{ d.shipment.voyageOrFlightNo }} }
          · {{ d.shipment.countryCode }}
          · <span class="status status--{{ d.shipment.status.toLowerCase() }}">{{ d.shipment.status }}</span>
        </p>
      </header>

      <section class="card">
        <h2>Times</h2>
        <dl>
          <dt>ETD</dt><dd>{{ d.shipment.etd ? (d.shipment.etd | slice:0:19) : '—' }}</dd>
          <dt>ATD</dt><dd>{{ d.shipment.atd ? (d.shipment.atd | slice:0:19) : '—' }}</dd>
          <dt>ETA</dt><dd>{{ d.shipment.eta ? (d.shipment.eta | slice:0:19) : '—' }}</dd>
          <dt>ATA</dt><dd>{{ d.shipment.ata ? (d.shipment.ata | slice:0:19) : '—' }}</dd>
        </dl>
      </section>

      <section class="card">
        <h2>Containers ({{ d.containers.length }})</h2>
        @if (d.containers.length === 0) { <p class="muted">No containers.</p> } @else {
          <table>
            <thead><tr>
              <th>Container #</th><th>Type</th><th>Seal</th>
              <th class="num">Tare</th><th class="num">Cargo</th>
              <th>Loaded</th><th>Discharged</th><th>Gate-out</th><th>Status</th>
            </tr></thead>
            <tbody>
              @for (c of d.containers; track c.id) {
                <tr>
                  <td><code>{{ c.containerNumber }}</code></td>
                  <td>{{ c.containerType }}</td>
                  <td>{{ c.sealNumber ?? '—' }}</td>
                  <td class="num">{{ c.tareWeightKg ? (c.tareWeightKg | number:'1.0-1') : '—' }}</td>
                  <td class="num">{{ c.cargoWeightKg ? (c.cargoWeightKg | number:'1.0-1') : '—' }}</td>
                  <td>{{ c.loadedAt ? (c.loadedAt | slice:0:16) : '—' }}</td>
                  <td>{{ c.dischargedAt ? (c.dischargedAt | slice:0:16) : '—' }}</td>
                  <td>{{ c.gateOutAt ? (c.gateOutAt | slice:0:16) : '—' }}</td>
                  <td><span class="status status--{{ c.status.toLowerCase() }}">{{ c.status }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section class="card">
        <h2>Milestones ({{ d.milestones.length }})</h2>
        @if (d.milestones.length === 0) { <p class="muted">No milestones recorded.</p> } @else {
          <ol class="timeline">
            @for (m of d.milestones; track m.id) {
              <li>
                <div class="timeline__when">{{ m.occurredAt | slice:0:19 }}</div>
                <div class="timeline__what">
                  <span class="ms-code">{{ m.milestoneCode }}</span>
                  <span class="muted">· {{ m.source }}</span>
                  @if (m.locationPortId) { <span class="muted">· port {{ m.locationPortId }}</span> }
                </div>
                @if (m.remarks) { <div class="timeline__note">{{ m.remarks }}</div> }
              </li>
            }
          </ol>
        }
      </section>

      <section class="card">
        <h2>Documents</h2>
        @if (d.mbls.length === 0 && d.awbs.length === 0) { <p class="muted">No MBL / AWB issued.</p> }
        @if (d.mbls.length > 0) {
          <h3 class="subhead">MBLs</h3>
          <table>
            <thead><tr>
              <th>MBL #</th><th>Type</th><th>Release</th><th>Issue date</th><th>On-board</th><th>Status</th>
            </tr></thead>
            <tbody>
              @for (m of d.mbls; track m.id) {
                <tr>
                  <td><code>{{ m.mblNumber }}</code></td>
                  <td>{{ m.blType }}</td>
                  <td>{{ m.releaseType }}</td>
                  <td>{{ m.issueDate ? (m.issueDate | slice:0:10) : '—' }}</td>
                  <td>{{ m.onBoardDate ? (m.onBoardDate | slice:0:10) : '—' }}</td>
                  <td><span class="bl-status bl-status--{{ m.status.toLowerCase() }}">{{ m.status }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        }
        @if (d.awbs.length > 0) {
          <h3 class="subhead">AWBs</h3>
          <table>
            <thead><tr>
              <th>AWB #</th><th>Type</th><th>Carrier</th><th>Flight</th><th>Status</th>
            </tr></thead>
            <tbody>
              @for (a of d.awbs; track a.id) {
                <tr>
                  <td><code>{{ a.awbNumber }}</code></td>
                  <td>{{ a.awbType }}</td>
                  <td>{{ a.iataCarrierCode ?? '—' }}</td>
                  <td>{{ a.flightNumber ?? '—' }}</td>
                  <td><span class="bl-status bl-status--{{ a.status.toLowerCase() }}">{{ a.status }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section class="card">
        <h2>Charges ({{ d.charges.length }})</h2>
        @if (d.charges.length === 0) { <p class="muted">No charges recorded.</p> } @else {
          <table>
            <thead><tr>
              <th>Code</th><th class="num">Qty</th><th>UOM</th>
              <th class="num">Unit</th><th class="num">Amount</th><th>Billable</th><th>Invoice</th>
            </tr></thead>
            <tbody>
              @for (c of d.charges; track c.id) {
                <tr>
                  <td><code>{{ c.chargeCode }}</code></td>
                  <td class="num">{{ c.quantity ? (c.quantity | number:'1.0-2') : '—' }}</td>
                  <td>{{ c.uomCode ?? '—' }}</td>
                  <td class="num">{{ c.unitPriceAmount ? (c.unitPriceAmount | number:'1.2-2') : '—' }} {{ c.unitPriceCurrency ?? '' }}</td>
                  <td class="num">{{ c.amountAmount ? (c.amountAmount | number:'1.2-2') : '—' }} {{ c.amountCurrency ?? '' }}</td>
                  <td>{{ c.isBillable ? 'yes' : 'no' }}</td>
                  <td><span class="inv inv--{{ c.invoiceStatus.toLowerCase() }}">{{ c.invoiceStatus }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <!-- v2 client doc: M1 Doc Generation buttons on Shipment Detail -->
      <section class="card">
        <h2>Generate documents</h2>
        <p class="muted">One-click generation from seeded SCMCube templates. Renders open in a new tab.</p>
        <div class="docgen-grid">
          @for (t of docTemplates; track t.code) {
            <button
              mat-stroked-button
              class="docgen-btn"
              (click)="generateDoc(t.code, d.shipment.id)"
              [disabled]="renderingCode() === t.code">
              <mat-icon>{{ t.icon }}</mat-icon>
              <span class="docgen-btn__label">{{ t.label }}</span>
              @if (renderingCode() === t.code) { <span class="docgen-btn__spin">…</span> }
            </button>
          }
        </div>
        @if (renderError(); as err) {
          <p class="error" style="margin-top:8px;">{{ err }}</p>
        }
      </section>

      <!-- v2 client doc: Activity & notes — unified timeline of memos + system events -->
      <section class="card">
        <h2>Activity &amp; notes ({{ timeline().length }})</h2>
        @if (timeline().length === 0) { <p class="muted">No activity yet.</p> } @else {
          <ul class="timeline">
            @for (e of timeline(); track $index) {
              <li class="tl tl--{{ e.kind }}" [class.tl--pinned]="e.pinned">
                <div class="tl__icon">
                  @switch (e.kind) {
                    @case ('memo')      { <mat-icon>chat_bubble_outline</mat-icon> }
                    @case ('milestone') { <mat-icon>flag</mat-icon> }
                    @case ('hold')      { <mat-icon>report_problem</mat-icon> }
                    @case ('status')    { <mat-icon>swap_horiz</mat-icon> }
                    @case ('document')  { <mat-icon>description</mat-icon> }
                  }
                </div>
                <div class="tl__body">
                  <div class="tl__head">
                    <strong>{{ e.title }}</strong>
                    <span class="tl__when">{{ e.whenIso | slice:0:19 }}</span>
                    @if (e.authorUserId) { <span class="muted">· user #{{ e.authorUserId }}</span> }
                    @if (e.pinned) { <mat-icon class="pin">push_pin</mat-icon> }
                  </div>
                  @if (e.detail) { <div class="tl__detail">{{ e.detail }}</div> }
                </div>
              </li>
            }
          </ul>
        }
        <div class="memo-add">
          <textarea rows="2" [(ngModel)]="newMemoBody" placeholder="Add an internal note or task entry…"></textarea>
          <label class="pin-toggle">
            <input type="checkbox" [(ngModel)]="newMemoPinned" />
            Pin
          </label>
          <button class="btn" (click)="addMemo(d.shipment.id)" [disabled]="memoSaving() || !newMemoBody.trim()">
            @if (memoSaving()) { Saving… } @else { Add note }
          </button>
        </div>
      </section>

      <!-- SCM Milestone 1+2: Holds -->
      <section class="card">
        <h2>Holds ({{ holds().length }})</h2>
        @if (holds().length === 0) { <p class="muted">No holds recorded.</p> } @else {
          <table>
            <thead><tr><th>Type</th><th>Reason</th><th>Raised</th><th>Cleared</th><th>Resolution</th><th></th></tr></thead>
            <tbody>
              @for (h of holds(); track h.id) {
                <tr [class.row-active]="h.isActive">
                  <td><span class="hold-pill hold-pill--{{ h.holdType.toLowerCase() }}">{{ h.holdType }}</span></td>
                  <td>{{ h.reason }}</td>
                  <td>{{ h.raisedAt | slice:0:16 }}</td>
                  <td>{{ h.clearedAt ? (h.clearedAt | slice:0:16) : '—' }}</td>
                  <td>{{ h.resolutionNote ?? '—' }}</td>
                  <td>
                    @if (h.isActive) {
                      <button class="btn-link" (click)="clearHold(h.id, d.shipment.id)" [disabled]="holdSaving()">Clear</button>
                    } @else {
                      <span class="muted">cleared</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
        <div class="hold-add">
          <select [(ngModel)]="newHoldType">
            <option value="Customs">Customs</option>
            <option value="Pga">PGA</option>
            <option value="MissingDoc">Missing doc</option>
            <option value="CustomerDispute">Customer dispute</option>
            <option value="Payment">Payment</option>
            <option value="Operations">Operations</option>
            <option value="Other">Other</option>
          </select>
          <input type="text" [(ngModel)]="newHoldReason" placeholder="Reason…" />
          <button class="btn" (click)="placeHold(d.shipment.id)" [disabled]="holdSaving() || !newHoldReason.trim()">
            Place hold
          </button>
        </div>
      </section>

      <!-- SCM Milestone 1+2: Reminders -->
      <section class="card">
        <h2>Reminders ({{ reminders().length }})</h2>
        @if (reminders().length === 0) { <p class="muted">No reminders set.</p> } @else {
          <table>
            <thead><tr><th>Kind</th><th>Title</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              @for (r of reminders(); track r.id) {
                <tr [class.row-overdue]="isOverdue(r)">
                  <td><span class="kind kind--{{ r.reminderKind.toLowerCase() }}">{{ r.reminderKind }}</span></td>
                  <td>
                    <div>{{ r.title }}</div>
                    @if (r.notes) { <div class="muted">{{ r.notes }}</div> }
                  </td>
                  <td>{{ r.dueAt | slice:0:16 }}</td>
                  <td><span class="status status--{{ r.status.toLowerCase() }}">{{ r.status }}</span></td>
                  <td>
                    @if (r.status === 'Pending' || r.status === 'Sent') {
                      <button class="btn-link" (click)="markReminderDone(r.id, d.shipment.id)">Done</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
        <div class="reminder-add">
          <select [(ngModel)]="newReminderKind">
            <option value="FollowUp">Follow-up</option>
            <option value="DocDue">Doc due</option>
            <option value="PodFollowup">POD follow-up</option>
            <option value="ReturnDue">Return due</option>
            <option value="PaymentDue">Payment due</option>
            <option value="Custom">Custom</option>
          </select>
          <input type="text" [(ngModel)]="newReminderTitle" placeholder="Title…" />
          <input type="datetime-local" [(ngModel)]="newReminderDueLocal" />
          <button class="btn" (click)="addReminder(d.shipment.id)" [disabled]="reminderSaving() || !newReminderTitle.trim() || !newReminderDueLocal">
            Add reminder
          </button>
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .back { color: #5B3FA0; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-block; margin-bottom: 12px; }
    .back:hover { text-decoration: underline; }
    .page-head h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; font-size: 13px; }
    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }
    .card { background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 20px; margin-bottom: 16px; }
    .card h2 { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .subhead { color: #6B5BA0; font-size: 12px; font-weight: 600; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .muted { color: #9A9AA3; }
    dl { display: grid; grid-template-columns: 100px 1fr 100px 1fr; gap: 8px 16px; margin: 0; }
    dt { color: #6B5BA0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    dd { margin: 0; color: #1A1A33; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 8px 12px; background: #F5F2FB; color: #3F2D7C;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.num { text-align: right; }
    tbody td { padding: 8px 12px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--booked,.status--draft     { background: #E8E2F4; color: #3F2D7C; }
    .status--loaded,.status--loading   { background: #DCEAF8; color: #1F4E8A; }
    .status--departed,.status--intransit,.status--onvessel { background: #FFF3D6; color: #946100; }
    .status--arrived,.status--discharged { background: #FFE6CC; color: #8A4F00; }
    .status--gateout,.status--gatedout,.status--delivered,.status--returned { background: #DCF5E4; color: #1F7A3D; }
    .status--cancelled { background: #FBE4E5; color: #B23F45; }
    .status--empty { background: #F0F0F0; color: #555; }

    .timeline { list-style: none; padding: 0; margin: 0; border-left: 2px solid #E8E2F4; }
    .timeline li { position: relative; padding: 6px 0 16px 18px; }
    .timeline li::before { content: ''; width: 10px; height: 10px; border-radius: 50%;
      background: #5B3FA0; position: absolute; left: -6px; top: 10px; }
    .timeline__when { color: #6B5BA0; font-size: 11px; }
    .timeline__what { font-size: 13px; color: #1A1A33; }
    .timeline__note { color: #6B5BA0; font-size: 12px; font-style: italic; margin-top: 2px; }
    .ms-code { font-weight: 700; color: #3F2D7C; }

    .bl-status { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .bl-status--draft     { background: #E8E2F4; color: #3F2D7C; }
    .bl-status--issued    { background: #DCEAF8; color: #1F4E8A; }
    .bl-status--released  { background: #DCF5E4; color: #1F7A3D; }
    .bl-status--cancelled { background: #FBE4E5; color: #B23F45; }

    .inv { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .inv--pending  { background: #FFF3D6; color: #946100; }
    .inv--invoiced { background: #DCEAF8; color: #1F4E8A; }
    .inv--paid     { background: #DCF5E4; color: #1F7A3D; }
    .inv--disputed { background: #FBE4E5; color: #B23F45; }

    /* v2 client doc: Generate-documents grid */
    .docgen-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 12px; }
    .docgen-btn { justify-content: flex-start !important; gap: 8px; }
    .docgen-btn .docgen-btn__label { font-size: 13px; }
    .docgen-btn .docgen-btn__spin { margin-left: auto; color: #5B3FA0; font-weight: 700; }

    /* v2 client doc: Activity & notes timeline */
    .timeline { list-style: none; padding: 0; margin: 0 0 16px; }
    .tl { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F0EBF8; }
    .tl:last-child { border-bottom: none; }
    .tl--pinned { background: #FFFAEC; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; border: none; }
    .tl__icon { width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .tl__icon mat-icon { font-size: 18px; width: 18px; height: 18px; line-height: 18px; }
    .tl--memo .tl__icon      { background: #EDE5FA; color: #5B3FA0; }
    .tl--milestone .tl__icon { background: #DCEAF8; color: #1F4E8A; }
    .tl--hold .tl__icon      { background: #FCDDE0; color: #B23F45; }
    .tl--status .tl__icon    { background: #DCF5E4; color: #1F7A3D; }
    .tl--document .tl__icon  { background: #FFF3D6; color: #946100; }
    .tl__body { flex: 1 1 auto; min-width: 0; }
    .tl__head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12.5px; }
    .tl__head strong { color: #1A1A33; font-weight: 700; }
    .tl__when { color: #6B5BA0; font-size: 11px; }
    .tl__detail { color: #1A1A33; font-size: 13px; margin-top: 2px; white-space: pre-wrap; }

    /* SCM Milestone 1 — memo notes (legacy classes still used by the add-form below the timeline) */
    .memos { list-style: none; padding: 0; margin: 0 0 16px; }
    .memos li { border-bottom: 1px solid #F0EBF8; padding: 10px 0; }
    .memos li:last-child { border-bottom: none; }
    .memos li.memo--pinned { background: #FFFAEC; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; border: none; }
    .memo__when { color: #6B5BA0; font-size: 11px; display: flex; align-items: center; gap: 6px; }
    .memo__body { color: #1A1A33; font-size: 13px; margin-top: 4px; white-space: pre-wrap; }
    .pin { color: #946100; font-size: 14px !important; width: 14px !important; height: 14px !important; }
    .memo-add { display: flex; gap: 8px; align-items: flex-start; margin-top: 12px; }
    .memo-add textarea { flex: 1; padding: 8px 10px; border: 1px solid #E8E2F4; border-radius: 6px; font-family: inherit; font-size: 13px; resize: vertical; }
    .pin-toggle { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #6B5BA0; }
    .btn { padding: 8px 14px; background: #5B3FA0; color: #FFF; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* SCM Milestone 1+2 — Holds + Reminders cards */
    .hold-add, .reminder-add {
      display: flex; gap: 8px; align-items: center; margin-top: 12px; flex-wrap: wrap;
    }
    .hold-add select, .hold-add input,
    .reminder-add select, .reminder-add input {
      padding: 6px 10px; border: 1px solid #E8E2F4; border-radius: 6px;
      font-family: inherit; font-size: 13px;
    }
    .hold-add input, .reminder-add input[type="text"] { flex: 1; min-width: 200px; }
    tbody tr.row-active td { background: #FFF6F6; }
    tbody tr.row-overdue td { background: #FFFAEC; }
    .btn-link { background: none; border: none; cursor: pointer; color: #5B3FA0;
      font-weight: 600; font-size: 12px; padding: 2px 6px; font-family: inherit; }
    .btn-link:hover { text-decoration: underline; }
    .btn-link:disabled { opacity: 0.5; cursor: not-allowed; }
    .hold-pill { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .hold-pill--customs         { background: #FBE4E5; color: #B23F45; }
    .hold-pill--pga             { background: #FFE6CC; color: #8A4F00; }
    .hold-pill--missingdoc      { background: #FFF3D6; color: #946100; }
    .hold-pill--customerdispute { background: #DCEAF8; color: #1F4E8A; }
    .hold-pill--payment         { background: #E8E2F4; color: #3F2D7C; }
    .hold-pill--operations      { background: #F5F2FB; color: #5B3FA0; }
    .hold-pill--other           { background: #F5F5F5; color: #777; }
    .kind { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .kind--followup    { background: #E8E2F4; color: #3F2D7C; }
    .kind--docdue      { background: #DCEAF8; color: #1F4E8A; }
    .kind--podfollowup { background: #DCF5E4; color: #1F7A3D; }
    .kind--returndue   { background: #FFE6CC; color: #8A4F00; }
    .kind--paymentdue  { background: #FFF3D6; color: #946100; }
    .kind--custom      { background: #F5F2FB; color: #5B3FA0; }
    .status--pending   { background: #FFF3D6; color: #946100; }
    .status--sent      { background: #DCEAF8; color: #1F4E8A; }
    .status--snoozed   { background: #E8E2F4; color: #3F2D7C; }
    .status--done      { background: #DCF5E4; color: #1F7A3D; }
    .status--dismissed { background: #F5F5F5; color: #777; }
  `],
})
export class ShipmentDetailComponent implements OnInit {
  private readonly api    = inject(FreightForwardingApiService);
  private readonly docGen = inject(DocumentGenerationApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly snack  = inject(MatSnackBar);

  readonly data    = signal<ShipmentDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  // v2 client doc: 1-click generation buttons for the shipment-relevant
  // SCMCube templates (HBL, AWB, Arrival Notice, D/O, Release, LoG).
  readonly docTemplates: DocTemplate[] = [
    { code: 'HBL',                  label: 'HBL',                     icon: 'menu_book' },
    { code: 'AWB',                  label: 'AWB',                     icon: 'flight' },
    { code: 'ARRIVAL_NOTICE',       label: 'Arrival Notice',          icon: 'mark_email_read' },
    { code: 'ARRIVAL_NOTICE_RATED', label: 'Arrival Notice (rated)',  icon: 'mark_email_read' },
    { code: 'DELIVERY_ORDER',       label: 'Delivery Order (D/O)',    icon: 'local_shipping' },
    { code: 'RELEASE_INSTRUCTIONS', label: 'Release Instructions',    icon: 'lock_open' },
    { code: 'LETTER_OF_GUARANTEE',  label: 'Letter of Guarantee',     icon: 'verified' },
    { code: 'PACKING_LIST',         label: 'Packing List',            icon: 'inventory_2' },
    { code: 'COO',                  label: 'Certificate of Origin',   icon: 'public' },
  ];
  readonly renderingCode = signal<string | null>(null);
  readonly renderError   = signal<string | null>(null);

  // SCM Milestone 1 — memo state
  readonly memos      = signal<ShipmentMemoDto[]>([]);
  readonly memoSaving = signal(false);
  newMemoBody = '';
  newMemoPinned = false;

  // v2 client doc: unified Activity & notes timeline.
  // Composes user memos with system events derived from currently loaded data
  // (milestones, holds, status). Sorted DESC by whenIso. Pinned memos float
  // to the top of their time bucket.
  readonly timeline = computed<TimelineEntry[]>(() => {
    const out: TimelineEntry[] = [];
    const d = this.data();

    for (const m of this.memos()) {
      out.push({
        whenIso: m.createdAt, kind: 'memo',
        title: m.body.length > 80 ? m.body.substring(0, 80) + '…' : m.body,
        detail: m.body.length > 80 ? m.body : null,
        pinned: m.isPinned, authorUserId: m.authorUserId,
      });
    }

    if (d) {
      for (const ms of d.milestones) {
        out.push({
          whenIso: ms.occurredAt, kind: 'milestone',
          title: `Milestone: ${ms.milestoneCode}`,
          detail: ms.remarks ?? (ms.locationPortId ? `at port ${ms.locationPortId}` : null),
        });
      }
      out.push({
        whenIso: d.shipment.createdAt, kind: 'status',
        title: `Shipment created (status: ${d.shipment.status})`,
        detail: `${d.shipment.mode} via ${d.shipment.vesselOrFlight ?? 'TBD'}`,
      });
      if (d.shipment.modifiedAt && d.shipment.modifiedAt !== d.shipment.createdAt) {
        out.push({
          whenIso: d.shipment.modifiedAt, kind: 'status',
          title: `Shipment updated (status: ${d.shipment.status})`,
        });
      }
    }

    for (const h of this.holds()) {
      out.push({
        whenIso: h.raisedAt, kind: 'hold',
        title: `Hold raised: ${h.holdType}`,
        detail: h.reason,
      });
      if (h.clearedAt) {
        out.push({
          whenIso: h.clearedAt, kind: 'hold',
          title: `Hold cleared: ${h.holdType}`,
          detail: h.resolutionNote ?? null,
        });
      }
    }

    // Sort: pinned memos first, then DESC by whenIso.
    out.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.whenIso.localeCompare(a.whenIso);
    });
    return out;
  });

  async generateDoc(code: string, shipmentId: number) {
    if (this.renderingCode()) return;
    this.renderingCode.set(code);
    this.renderError.set(null);
    try {
      const res = await this.docGen.render({
        code,
        countryCode: this.data()?.shipment.countryCode ?? null,
        sourceModule: 'M5',
        sourceEntityId: shipmentId,
        payload: {
          shipmentId,
          shipmentNumber: this.data()?.shipment.shipmentNumber ?? '',
          mode: this.data()?.shipment.mode ?? '',
        },
      });
      if (res.body) {
        // Open the rendered HTML in a new tab.
        const blob = new Blob([res.body], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Revoke after a beat so the new tab can finish loading.
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        this.snack.open(`Generated ${code} (${res.durationMs ?? '—'} ms)`, 'Dismiss', { duration: 4000 });
      } else {
        this.renderError.set(res.error ?? 'Render returned no body');
      }
    } catch (e: any) {
      this.renderError.set(e?.error?.error ?? e?.message ?? 'Render failed');
    } finally {
      this.renderingCode.set(null);
    }
  }

  // SCM Milestone 1+2 — holds + reminders state
  readonly holds        = signal<ShipmentHoldDto[]>([]);
  readonly reminders    = signal<ShipmentReminderDto[]>([]);
  readonly holdSaving   = signal(false);
  readonly reminderSaving = signal(false);
  newHoldType: HoldType = 'Customs';
  newHoldReason = '';
  newReminderKind: ReminderKind = 'FollowUp';
  newReminderTitle = '';
  newReminderDueLocal = '';   // datetime-local string (no TZ)

  isOverdue(r: ShipmentReminderDto): boolean {
    return r.status === 'Pending' && new Date(r.dueAt).getTime() <= Date.now();
  }

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('invalid shipment id');
      this.loading.set(false);
      return;
    }
    try {
      this.data.set(await this.api.getShipment(id));
      // Load auxiliary data in parallel for snappier first paint.
      const [memos, holds, reminders] = await Promise.all([
        this.api.listShipmentMemos(id),
        this.api.listShipmentHolds(id, /* includeCleared */ true),
        this.api.listShipmentReminders(id),
      ]);
      this.memos.set(memos);
      this.holds.set(holds);
      this.reminders.set(reminders);
    }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load shipment'); }
    finally { this.loading.set(false); }
  }

  async addMemo(shipmentId: number) {
    const body = this.newMemoBody.trim();
    if (!body || this.memoSaving()) return;
    this.memoSaving.set(true);
    try {
      await this.api.addShipmentMemo(shipmentId, body, this.newMemoPinned);
      this.newMemoBody = '';
      this.newMemoPinned = false;
      this.memos.set(await this.api.listShipmentMemos(shipmentId));
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Failed to add memo');
    } finally {
      this.memoSaving.set(false);
    }
  }

  /* SCM Milestone 1+2 — Holds */
  async placeHold(shipmentId: number) {
    if (this.holdSaving() || !this.newHoldReason.trim()) return;
    this.holdSaving.set(true);
    try {
      await this.api.placeShipmentHold(shipmentId, this.newHoldType, this.newHoldReason.trim());
      this.newHoldReason = '';
      this.holds.set(await this.api.listShipmentHolds(shipmentId, true));
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Failed to place hold');
    } finally {
      this.holdSaving.set(false);
    }
  }
  async clearHold(holdId: number, shipmentId: number) {
    if (this.holdSaving()) return;
    this.holdSaving.set(true);
    try {
      await this.api.clearShipmentHold(holdId, null);
      this.holds.set(await this.api.listShipmentHolds(shipmentId, true));
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Failed to clear hold');
    } finally {
      this.holdSaving.set(false);
    }
  }

  /* SCM Milestone 1+2 — Reminders */
  async addReminder(shipmentId: number) {
    if (this.reminderSaving() || !this.newReminderTitle.trim() || !this.newReminderDueLocal) return;
    this.reminderSaving.set(true);
    try {
      // datetime-local has no TZ; treat as local then convert to UTC ISO.
      const dueIso = new Date(this.newReminderDueLocal).toISOString();
      await this.api.addShipmentReminder(shipmentId, {
        reminderKind: this.newReminderKind,
        title: this.newReminderTitle.trim(),
        dueAt: dueIso,
      });
      this.newReminderTitle = '';
      this.newReminderDueLocal = '';
      this.reminders.set(await this.api.listShipmentReminders(shipmentId));
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Failed to add reminder');
    } finally {
      this.reminderSaving.set(false);
    }
  }
  async markReminderDone(id: number, shipmentId: number) {
    try {
      await this.api.changeReminderStatus(id, 'Done');
      this.reminders.set(await this.api.listShipmentReminders(shipmentId));
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Update failed');
    }
  }
}
