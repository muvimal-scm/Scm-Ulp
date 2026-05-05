import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';

/**
 * SCM Milestone 1 — Profile Detail page.
 *
 * Loads `/api/v1/master-data/parties/:id/profile-extensions` once and renders the
 * three sections (POAs, permits, misc docs) with inline "add new" forms.
 * Stays as a simple read-then-add page; full edit/delete deferred.
 */

type PoaStatus      = 'Incomplete' | 'Pending' | 'Complete' | 'Expired' | 'Revoked';
type PermitKind     = 'Company' | 'Commodity';
type PermitStatus   = 'Active' | 'Expiring' | 'Expired' | 'Suspended';
type MiscDocCategory= 'Agreement' | 'Tax' | 'Insurance' | 'Bank' | 'Other';

interface PartyPoa {
  id: number; partyId: number;
  poaNumber: string | null; grantedTo: string | null;
  effectiveDate: string | null; expirationDate: string | null;
  status: PoaStatus; documentId: number | null; notes: string | null;
}
interface PartyPermit {
  id: number; partyId: number;
  kind: PermitKind; permitCode: string; permitName: string;
  issuingAuthority: string | null; hsCode: string | null; productId: number | null;
  effectiveDate: string | null; expirationDate: string | null;
  status: PermitStatus; documentId: number | null; notes: string | null;
}
interface PartyMiscDoc {
  id: number; partyId: number;
  docCategory: MiscDocCategory; title: string;
  documentId: number | null;
  effectiveDate: string | null; expirationDate: string | null;
  notes: string | null;
}
interface ProfileExtensionsBundle {
  partyId: number;
  poas: PartyPoa[];
  permits: PartyPermit[];
  miscDocs: PartyMiscDoc[];
}

@Component({
  selector: 'ulp-party-profile',
  standalone: true,
  imports: [FormsModule, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    }
    @if (data(); as d) {
      <a [routerLink]="['..']" class="back">← Back to party</a>
      <header class="page-head">
        <h1>Profile detail · party #{{ d.partyId }}</h1>
        <p>POAs, permits, and miscellaneous documents — SCM Milestone 1.</p>
      </header>

      <section class="card">
        <header class="card-head">
          <h2>Power of Attorney ({{ d.poas.length }})</h2>
          <span class="muted">{{ expiringPoaCount() }} expiring within 30 days</span>
        </header>
        @if (d.poas.length === 0) { <p class="muted pad">No POAs recorded.</p> } @else {
          <table>
            <thead><tr>
              <th>POA #</th><th>Granted to</th>
              <th>Effective</th><th>Expires</th>
              <th>Status</th><th>Notes</th>
            </tr></thead>
            <tbody>
              @for (p of d.poas; track p.id) {
                <tr [class.row-warn]="isExpiringSoon(p.expirationDate)">
                  <td><code>{{ p.poaNumber ?? '—' }}</code></td>
                  <td>{{ p.grantedTo ?? '—' }}</td>
                  <td>{{ p.effectiveDate ? (p.effectiveDate | slice:0:10) : '—' }}</td>
                  <td>{{ p.expirationDate ? (p.expirationDate | slice:0:10) : '—' }}</td>
                  <td><span class="status status--{{ p.status.toLowerCase() }}">{{ p.status }}</span></td>
                  <td>{{ p.notes ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
        <details class="add">
          <summary>+ Add POA</summary>
          <div class="form-grid">
            <label>POA #<input [(ngModel)]="newPoa.poaNumber" /></label>
            <label>Granted to<input [(ngModel)]="newPoa.grantedTo" /></label>
            <label>Effective<input type="date" [(ngModel)]="newPoa.effectiveDate" /></label>
            <label>Expires<input type="date" [(ngModel)]="newPoa.expirationDate" /></label>
            <label>Status
              <select [(ngModel)]="newPoa.status">
                <option value="Incomplete">Incomplete</option>
                <option value="Pending">Pending</option>
                <option value="Complete">Complete</option>
                <option value="Expired">Expired</option>
                <option value="Revoked">Revoked</option>
              </select>
            </label>
          </div>
          <label class="full">Notes<textarea rows="2" [(ngModel)]="newPoa.notes"></textarea></label>
          <button class="btn" (click)="addPoa()" [disabled]="saving()">Save POA</button>
        </details>
      </section>

      <section class="card">
        <header class="card-head">
          <h2>Permits ({{ d.permits.length }})</h2>
          <span class="muted">{{ expiringPermitCount() }} expiring within 30 days</span>
        </header>
        @if (d.permits.length === 0) { <p class="muted pad">No permits recorded.</p> } @else {
          <table>
            <thead><tr>
              <th>Kind</th><th>Code</th><th>Name</th><th>Authority</th>
              <th>HS / Product</th><th>Expires</th><th>Status</th>
            </tr></thead>
            <tbody>
              @for (p of d.permits; track p.id) {
                <tr [class.row-warn]="isExpiringSoon(p.expirationDate)">
                  <td><span class="kind kind--{{ p.kind.toLowerCase() }}">{{ p.kind }}</span></td>
                  <td><code>{{ p.permitCode }}</code></td>
                  <td>{{ p.permitName }}</td>
                  <td>{{ p.issuingAuthority ?? '—' }}</td>
                  <td>{{ p.hsCode ?? (p.productId ? ('product #' + p.productId) : '—') }}</td>
                  <td>{{ p.expirationDate ? (p.expirationDate | slice:0:10) : '—' }}</td>
                  <td><span class="status status--{{ p.status.toLowerCase() }}">{{ p.status }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        }
        <details class="add">
          <summary>+ Add permit</summary>
          <div class="form-grid">
            <label>Kind
              <select [(ngModel)]="newPermit.kind">
                <option value="Company">Company</option>
                <option value="Commodity">Commodity</option>
              </select>
            </label>
            <label>Code<input [(ngModel)]="newPermit.permitCode" /></label>
            <label>Name<input [(ngModel)]="newPermit.permitName" /></label>
            <label>Authority<input [(ngModel)]="newPermit.issuingAuthority" /></label>
            <label>HS code<input [(ngModel)]="newPermit.hsCode" /></label>
            <label>Effective<input type="date" [(ngModel)]="newPermit.effectiveDate" /></label>
            <label>Expires<input type="date" [(ngModel)]="newPermit.expirationDate" /></label>
            <label>Status
              <select [(ngModel)]="newPermit.status">
                <option value="Active">Active</option>
                <option value="Expiring">Expiring</option>
                <option value="Expired">Expired</option>
                <option value="Suspended">Suspended</option>
              </select>
            </label>
          </div>
          <button class="btn" (click)="addPermit()" [disabled]="saving()">Save permit</button>
        </details>
      </section>

      <section class="card">
        <header class="card-head">
          <h2>Miscellaneous documents ({{ d.miscDocs.length }})</h2>
        </header>
        @if (d.miscDocs.length === 0) { <p class="muted pad">No misc documents.</p> } @else {
          <table>
            <thead><tr>
              <th>Category</th><th>Title</th>
              <th>Effective</th><th>Expires</th><th>Notes</th>
            </tr></thead>
            <tbody>
              @for (m of d.miscDocs; track m.id) {
                <tr [class.row-warn]="isExpiringSoon(m.expirationDate)">
                  <td><span class="cat cat--{{ m.docCategory.toLowerCase() }}">{{ m.docCategory }}</span></td>
                  <td>{{ m.title }}</td>
                  <td>{{ m.effectiveDate ? (m.effectiveDate | slice:0:10) : '—' }}</td>
                  <td>{{ m.expirationDate ? (m.expirationDate | slice:0:10) : '—' }}</td>
                  <td>{{ m.notes ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
        <details class="add">
          <summary>+ Add misc document</summary>
          <div class="form-grid">
            <label>Category
              <select [(ngModel)]="newMisc.docCategory">
                <option value="Agreement">Agreement</option>
                <option value="Tax">Tax</option>
                <option value="Insurance">Insurance</option>
                <option value="Bank">Bank</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>Title<input [(ngModel)]="newMisc.title" /></label>
            <label>Effective<input type="date" [(ngModel)]="newMisc.effectiveDate" /></label>
            <label>Expires<input type="date" [(ngModel)]="newMisc.expirationDate" /></label>
          </div>
          <label class="full">Notes<textarea rows="2" [(ngModel)]="newMisc.notes"></textarea></label>
          <button class="btn" (click)="addMisc()" [disabled]="saving()">Save document</button>
        </details>
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
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
      padding: 20px; margin-bottom: 16px; }
    .card-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
    .card h2 { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .muted { color: #9A9AA3; font-size: 12px; }
    .pad { padding: 8px 0; }

    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: 8px 12px; background: #F5F2FB; color: #3F2D7C;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 8px 12px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr.row-warn td { background: #FFFAEC; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--incomplete { background: #FFE6CC; color: #8A4F00; }
    .status--pending    { background: #FFF3D6; color: #946100; }
    .status--complete,
    .status--active     { background: #DCF5E4; color: #1F7A3D; }
    .status--expired,
    .status--revoked,
    .status--suspended  { background: #FBE4E5; color: #B23F45; }
    .status--expiring   { background: #FFF3D6; color: #946100; }
    .kind { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .kind--company   { background: #E8E2F4; color: #3F2D7C; }
    .kind--commodity { background: #DCEAF8; color: #1F4E8A; }
    .cat { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #F5F2FB; color: #5B3FA0; }

    .add { margin-top: 14px; padding: 12px; background: #FAFAFE; border: 1px dashed #E8E2F4; border-radius: 8px; }
    .add summary { cursor: pointer; color: #5B3FA0; font-weight: 600; font-size: 13px; margin-bottom: 8px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-top: 8px; }
    .form-grid label, .full { display: flex; flex-direction: column; font-size: 11px; color: #6B5BA0; font-weight: 600; gap: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
    .full { grid-column: 1 / -1; margin-top: 8px; }
    .form-grid input, .form-grid select, .full textarea {
      padding: 6px 10px; border: 1px solid #E8E2F4; border-radius: 6px;
      font-size: 13px; color: #1A1A33; font-family: inherit;
    }
    .full textarea { resize: vertical; }
    .btn { margin-top: 10px; padding: 8px 14px; background: #5B3FA0; color: #FFF;
      border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class PartyProfileComponent implements OnInit {
  private readonly http  = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly base  = `${environment.apiBaseUrl}/api/v1/master-data/parties`;

  readonly data    = signal<ProfileExtensionsBundle | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly saving  = signal(false);

  partyId = 0;

  // Inline-form bindings — kept simple, refresh after each save.
  newPoa: any    = { status: 'Incomplete' };
  newPermit: any = { kind: 'Company', status: 'Active' };
  newMisc: any   = { docCategory: 'Other' };

  readonly expiringPoaCount = computed(() => (this.data()?.poas ?? []).filter(p => this.isExpiringSoon(p.expirationDate)).length);
  readonly expiringPermitCount = computed(() => (this.data()?.permits ?? []).filter(p => this.isExpiringSoon(p.expirationDate)).length);

  isExpiringSoon(iso: string | null): boolean {
    if (!iso) return false;
    const exp = new Date(iso).getTime();
    const now = Date.now();
    const days = (exp - now) / 86400000;
    return days >= 0 && days <= 30;
  }

  async ngOnInit() {
    this.partyId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(this.partyId) || this.partyId <= 0) {
      this.error.set('invalid party id'); this.loading.set(false); return;
    }
    await this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const r = await firstValueFrom(this.http.get<ProfileExtensionsBundle>(`${this.base}/${this.partyId}/profile-extensions`));
      this.data.set(r);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load profile extensions');
    } finally {
      this.loading.set(false);
    }
  }

  async addPoa() {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.http.post(`${this.base}/${this.partyId}/poas`, this.newPoa));
      this.newPoa = { status: 'Incomplete' };
      await this.reload();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }

  async addPermit() {
    if (this.saving()) return;
    if (!this.newPermit.permitCode || !this.newPermit.permitName) {
      this.error.set('permit code and name are required'); return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.http.post(`${this.base}/${this.partyId}/permits`, this.newPermit));
      this.newPermit = { kind: 'Company', status: 'Active' };
      await this.reload();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }

  async addMisc() {
    if (this.saving()) return;
    if (!this.newMisc.title) { this.error.set('title is required'); return; }
    this.saving.set(true);
    try {
      await firstValueFrom(this.http.post(`${this.base}/${this.partyId}/misc-docs`, this.newMisc));
      this.newMisc = { docCategory: 'Other' };
      await this.reload();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }
}
