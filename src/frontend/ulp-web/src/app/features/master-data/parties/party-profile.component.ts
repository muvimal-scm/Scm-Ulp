import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MasterDataApiService } from '../shared/master-data-api.service';
import { Party, PartyIdentifier } from '../shared/master-data-types';

type Tab = 'financial' | 'relations' | 'memos' | 'documents';

const RELATION_TYPES = [
  'SCAC', 'IATA', 'FirmsCode', 'FTZ_ID', 'GLN', 'LEI', 'CTPAT',
  'GSTIN', 'PAN', 'EIN', 'DUNS', 'VAT', 'BRN', 'Other',
];

interface Memo { id: number; group: string; text: string; createdAt: string; }
type MemoGroup = 'FreightForwarding' | 'CustomsBrokerage' | 'Trucking' | 'Warehousing' | 'ALL';

@Component({
  selector: 'ulp-party-profile',
  standalone: true,
  imports: [
    SlicePipe, RouterLink, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCheckboxModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (!party()) {
      <div class="err"><mat-icon>error_outline</mat-icon> Party not found.</div>
    } @else {
      <div class="profile-page">
        <!-- Header -->
        <div class="profile-header">
          <div>
            <a routerLink=".." class="back-link"><mat-icon>arrow_back</mat-icon> Back to parties</a>
            <h1>{{ party()!.legalName }}</h1>
            <div class="header-meta">
              <span class="badge badge--type">{{ party()!.partyType }}</span>
              <span class="badge" [class.badge--active]="party()!.isActive" [class.badge--inactive]="!party()!.isActive">
                {{ party()!.isActive ? 'Active' : 'Inactive' }}
              </span>
              @if (party()!.tradeName) { <span class="muted">DBA: {{ party()!.tradeName }}</span> }
              <span class="muted">{{ party()!.countryCode }}</span>
            </div>
          </div>
          <a mat-stroked-button [routerLink]="['/app/master-data/parties', party()!.id]">
            <mat-icon>edit</mat-icon> Edit Party
          </a>
        </div>

        <!-- Tabs -->
        <nav class="tabs">
          @for (t of tabs; track t.key) {
            <button class="tab" [class.tab--active]="activeTab() === t.key" (click)="onTabChange(t.key)">
              <mat-icon>{{ t.icon }}</mat-icon> {{ t.label }}
            </button>
          }
        </nav>

        <!-- Financial Tab -->
        @if (activeTab() === 'financial') {
          <div class="tab-content">
            <div class="card">
              <div class="card-title">Financial Settings</div>
              <div class="field-grid">
                <div class="field">
                  <span class="field-label">Payment Terms</span>
                  <span>{{ party()!.defaultPaymentTerms ?? '—' }}</span>
                </div>
                <div class="field">
                  <span class="field-label">Preferred Currency</span>
                  <span>{{ party()!.preferredCurrency ?? '—' }}</span>
                </div>
                <div class="field">
                  <span class="field-label">Credit Limit</span>
                  <span>
                    @if (party()!.creditLimit) {
                      {{ party()!.creditLimit!.amount }} {{ party()!.creditLimit!.currency }}
                    } @else { — }
                  </span>
                </div>
                <div class="field">
                  <span class="field-label">Tax Status</span>
                  <span>{{ party()!.taxStatus ?? '—' }}</span>
                </div>
                <div class="field">
                  <span class="field-label">Sanctions Screened</span>
                  <span>{{ party()!.sanctionsScreened ? '✅ Yes' : '❌ No' }}</span>
                </div>
              </div>
            </div>

            <!-- Quick edit financial -->
            <div class="card mt">
              <div class="card-title">Update Financial</div>
              <form [formGroup]="financialForm" (ngSubmit)="saveFinancial()" class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Payment Terms</mat-label>
                  <mat-select formControlName="paymentTerms">
                    <mat-option value="">— None —</mat-option>
                    <mat-option value="Net 7">Net 7</mat-option>
                    <mat-option value="Net 15">Net 15</mat-option>
                    <mat-option value="Net 30">Net 30</mat-option>
                    <mat-option value="Net 45">Net 45</mat-option>
                    <mat-option value="Net 60">Net 60</mat-option>
                    <mat-option value="Due on Receipt">Due on Receipt</mat-option>
                    <mat-option value="Credit Terms">Credit Terms</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Credit Limit Amount</mat-label>
                  <input matInput formControlName="creditAmount" type="number" step="100" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Credit Currency</mat-label>
                  <input matInput formControlName="creditCurrency" placeholder="USD" maxlength="3" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Tax Status / Zone</mat-label>
                  <input matInput formControlName="taxStatus" placeholder="Regular GST / Tax Exempt" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Preferred Currency</mat-label>
                  <input matInput formControlName="preferredCurrency" placeholder="USD" maxlength="3" />
                </mat-form-field>
                <mat-checkbox formControlName="autoApproveFreight" color="primary">
                  Auto-approve freight cost
                </mat-checkbox>
                <div class="form-actions full">
                  <button mat-flat-button color="primary" type="submit" [disabled]="savingFinancial()">
                    @if (savingFinancial()) { <mat-spinner diameter="16"></mat-spinner> } @else { Save }
                  </button>
                  @if (financialSaved()) { <span class="saved-msg">✅ Saved</span> }
                </div>
              </form>
            </div>
          </div>
        }

        <!-- Relations Tab -->
        @if (activeTab() === 'relations') {
          <div class="tab-content">
            <div class="card">
              <div class="card-title">Party Identifiers &amp; Relations</div>
              @if (party()!.identifiers.length === 0) {
                <p class="empty-msg">No identifiers added yet.</p>
              } @else {
                <table class="ident-table">
                  <thead><tr><th>Type</th><th>Value</th><th>Primary</th><th>Status</th></tr></thead>
                  <tbody>
                    @for (i of party()!.identifiers; track i.id) {
                      <tr>
                        <td><span class="id-type">{{ i.identifierType }}</span></td>
                        <td><code>{{ i.identifierValue }}</code></td>
                        <td>{{ i.isPrimary ? '★ Yes' : '—' }}</td>
                        <td><span class="vstatus vstatus--{{ i.validationStatus.toLowerCase() }}">{{ i.validationStatus }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>

            <div class="card mt">
              <div class="card-title">Add Identifier</div>
              <p class="hint">Logistics relations: SCAC, IATA, FirmsCode, FTZ_ID, GLN, LEI, C-TPAT. Tax: GSTIN, EIN, PAN, DUNS.</p>
              <form [formGroup]="identForm" (ngSubmit)="addIdentifier()" class="form-row">
                <mat-form-field appearance="outline" class="flex1">
                  <mat-label>Identifier Type</mat-label>
                  <mat-select formControlName="identifierType">
                    @for (t of relTypes; track t) {
                      <mat-option [value]="t">{{ t }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="flex2">
                  <mat-label>Value</mat-label>
                  <input matInput formControlName="identifierValue" placeholder="e.g. MAEU" />
                </mat-form-field>
                <mat-checkbox formControlName="isPrimary" color="primary">Primary</mat-checkbox>
                <button mat-flat-button color="primary" type="submit" [disabled]="identForm.invalid || addingIdent()">
                  @if (addingIdent()) { <mat-spinner diameter="16"></mat-spinner> } @else { Add }
                </button>
              </form>
            </div>
          </div>
        }

        <!-- Memos Tab -->
        @if (activeTab() === 'memos') {
          <div class="tab-content">
            <div class="card">
              <div class="card-title">Service Memos</div>
              <p class="hint">Special instructions pulled into documents when this party is selected.</p>

              <!-- Group filters -->
              <nav class="memo-tabs">
                @for (g of memoGroups; track g) {
                  <button class="memo-tab" [class.memo-tab--active]="memoFilter() === g" (click)="memoFilter.set(g)">
                    {{ memoGroupLabel(g) }}
                  </button>
                }
              </nav>

              <div class="memo-list">
                @for (m of filteredMemos(); track m.id) {
                  <div class="memo-item">
                    <span class="memo-group-badge">{{ memoGroupLabel(m.group) }}</span>
                    <p class="memo-text">{{ m.text }}</p>
                    <span class="memo-time">{{ m.createdAt | slice:0:10 }}</span>
                  </div>
                } @empty {
                  <p class="empty-msg">No memos for this group.</p>
                }
              </div>
            </div>

            <!-- Add memo -->
            <div class="card mt">
              <div class="card-title">Add Memo</div>
              <form [formGroup]="memoForm" (ngSubmit)="addMemo()" class="form-col">
                <mat-form-field appearance="outline">
                  <mat-label>Service Group</mat-label>
                  <mat-select formControlName="group">
                    @for (g of memoGroups; track g) {
                      <mat-option [value]="g">{{ memoGroupLabel(g) }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Memo text / special instructions</mat-label>
                  <textarea matInput formControlName="text" rows="3" [maxlength]="1000"></textarea>
                </mat-form-field>
                <div>
                  <button mat-flat-button color="primary" type="submit" [disabled]="memoForm.invalid">Add Memo</button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- Documents Tab -->
        @if (activeTab() === 'documents') {
          <div class="tab-content">
            @if (docsLoading()) {
              <div class="loading"><mat-spinner diameter="24"></mat-spinner></div>
            } @else {
              <!-- POAs -->
              <div class="card">
                <div class="card-title">Powers of Attorney (POA)</div>
                @if (bundle()?.poas?.length === 0) {
                  <p class="empty-msg">No POAs on file.</p>
                } @else {
                  <table class="doc-table">
                    <thead><tr><th>POA #</th><th>Granted To</th><th>Effective</th><th>Expiry</th><th>Status</th></tr></thead>
                    <tbody>
                      @for (p of bundle()!.poas; track p.id) {
                        <tr>
                          <td>{{ p.poaNumber ?? '—' }}</td>
                          <td>{{ p.grantedTo ?? '—' }}</td>
                          <td>{{ p.effectiveDate ?? '—' }}</td>
                          <td [class.expiry-warn]="isExpiringSoon(p.expirationDate)">{{ p.expirationDate ?? 'Permanent' }}</td>
                          <td><span class="vstatus vstatus--{{ p.status.toLowerCase() }}">{{ p.status }}</span></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
                <!-- Add POA form -->
                <form [formGroup]="poaForm" (ngSubmit)="addPoa()" class="form-row mt">
                  <mat-form-field appearance="outline"><mat-label>POA #</mat-label><input matInput formControlName="poaNumber" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Granted To</mat-label><input matInput formControlName="grantedTo" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Expiry</mat-label><input matInput formControlName="expirationDate" type="date" /></mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Status</mat-label>
                    <mat-select formControlName="status">
                      <mat-option value="Pending">Pending</mat-option>
                      <mat-option value="Complete">Complete</mat-option>
                      <mat-option value="Expired">Expired</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <button mat-stroked-button type="submit" [disabled]="poaForm.invalid || addingPoa()">
                    @if (addingPoa()) { <mat-spinner diameter="14"></mat-spinner> } @else { Add POA }
                  </button>
                </form>
              </div>

              <!-- Misc Docs -->
              <div class="card mt">
                <div class="card-title">Additional Documents</div>
                @if (bundle()?.miscDocs?.length === 0) {
                  <p class="empty-msg">No additional documents.</p>
                } @else {
                  <table class="doc-table">
                    <thead><tr><th>Category</th><th>Title</th><th>Effective</th><th>Expiry</th></tr></thead>
                    <tbody>
                      @for (d of bundle()!.miscDocs; track d.id) {
                        <tr>
                          <td>{{ d.docCategory }}</td>
                          <td>{{ d.title }}</td>
                          <td>{{ d.effectiveDate ?? '—' }}</td>
                          <td [class.expiry-warn]="isExpiringSoon(d.expirationDate)">{{ d.expirationDate ?? '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display:block; }
    .loading,.err { padding:32px;text-align:center;color:#6B5BA0; }
    .profile-page { max-width:1000px;margin:0 auto; }
    .back-link { display:flex;align-items:center;gap:4px;color:#6B5BA0;text-decoration:none;font-size:13px;margin-bottom:8px; }
    .profile-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px; }
    .profile-header h1 { font-size:26px;font-weight:800;margin:0 0 8px;
      background:linear-gradient(90deg,#E54A8A,#5B3FA0,#3F2D7C);
      -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent; }
    .header-meta { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
    .badge { padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:#E8E2F4;color:#3F2D7C; }
    .badge--type { background:#DCEAF8;color:#1F4E8A; }
    .badge--active { background:#DCF5E4;color:#1F7A3D; }
    .badge--inactive { background:#FBE4E5;color:#B23F45; }
    .muted { color:#9A9AA3;font-size:13px; }
    .tabs { display:flex;gap:4px;border-bottom:2px solid #E8E2F4;margin-bottom:20px;flex-wrap:wrap; }
    .tab { background:transparent;border:none;cursor:pointer;padding:10px 16px;font-size:13px;font-weight:600;
           color:#6B5BA0;border-bottom:3px solid transparent;margin-bottom:-2px;
           display:flex;align-items:center;gap:6px;font-family:inherit; }
    .tab--active { color:#3F2D7C;border-bottom-color:#5B3FA0; }
    .tab mat-icon { font-size:18px;width:18px;height:18px; }
    .card { background:#fff;border:1px solid #E8E2F4;border-radius:12px;padding:20px;
      box-shadow:0 2px 8px rgba(63,45,124,.05); }
    .card.mt { margin-top:16px; }
    .card-title { font-size:13px;font-weight:700;color:#3F2D7C;text-transform:uppercase;letter-spacing:.5px;margin-bottom:16px; }
    .field-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px; }
    .field { display:flex;flex-direction:column;gap:3px; }
    .field-label { font-size:10px;font-weight:600;color:#9A9AA3;text-transform:uppercase; }
    .form-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:center; }
    .form-row { display:flex;gap:8px;align-items:center;flex-wrap:wrap; }
    .form-col { display:flex;flex-direction:column;gap:12px; }
    .flex1 { flex:1;min-width:120px; }
    .flex2 { flex:2;min-width:160px; }
    .full { grid-column:1/-1; }
    .form-actions { display:flex;align-items:center;gap:12px; }
    .saved-msg { color:#1F7A3D;font-size:13px; }
    .hint { color:#9A9AA3;font-size:12px;margin:0 0 12px; }
    .empty-msg { color:#9A9AA3;font-size:13px; }
    .ident-table,.doc-table { width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px; }
    .ident-table th,.doc-table th { text-align:left;padding:8px 10px;background:#F5F2FB;color:#3F2D7C;font-size:11px;font-weight:700;text-transform:uppercase; }
    .ident-table td,.doc-table td { padding:8px 10px;border-bottom:1px solid #F0EBF8; }
    code { background:#F5F2FB;padding:1px 6px;border-radius:4px;font-size:12px; }
    .id-type { background:#E8E2F4;color:#3F2D7C;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700; }
    .vstatus { padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#E8E2F4;color:#3F2D7C; }
    .vstatus--valid { background:#DCF5E4;color:#1F7A3D; }
    .vstatus--pending { background:#FFF3D6;color:#946100; }
    .vstatus--invalid,.vstatus--expired { background:#FBE4E5;color:#B23F45; }
    .vstatus--complete { background:#DCF5E4;color:#1F7A3D; }
    .expiry-warn { color:#946100;font-weight:600; }
    .memo-tabs { display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap; }
    .memo-tab { background:#F5F2FB;border:none;cursor:pointer;padding:6px 12px;border-radius:999px;
      font-size:12px;font-weight:600;color:#6B5BA0;font-family:inherit; }
    .memo-tab--active { background:#3F2D7C;color:#fff; }
    .memo-list { display:flex;flex-direction:column;gap:8px; }
    .memo-item { border:1px solid #E8E2F4;border-radius:8px;padding:12px;background:#FAFAFE; }
    .memo-group-badge { padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#DCEAF8;color:#1F4E8A; }
    .memo-text { margin:8px 0 4px;font-size:13px;color:#1A1A33;white-space:pre-wrap; }
    .memo-time { font-size:11px;color:#9A9AA3; }
  `],
})
export class PartyProfileComponent implements OnInit {
  private readonly api   = inject(MasterDataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb    = inject(FormBuilder);

  readonly party       = signal<Party | null>(null);
  readonly loading     = signal(true);
  readonly docsLoading = signal(false);
  readonly bundle      = signal<any | null>(null);
  readonly activeTab   = signal<Tab>('financial');
  readonly memoFilter  = signal<MemoGroup>('ALL');
  readonly memos       = signal<Memo[]>([]);
  readonly savingFinancial = signal(false);
  readonly financialSaved  = signal(false);
  readonly addingIdent     = signal(false);
  readonly addingPoa       = signal(false);

  readonly relTypes = RELATION_TYPES;
  readonly memoGroups: MemoGroup[] = ['ALL', 'FreightForwarding', 'CustomsBrokerage', 'Trucking', 'Warehousing'];

  readonly tabs = [
    { key: 'financial' as Tab, label: 'Financial',  icon: 'account_balance' },
    { key: 'relations' as Tab, label: 'Relations',  icon: 'hub' },
    { key: 'memos'     as Tab, label: 'Memos',      icon: 'sticky_note_2' },
    { key: 'documents' as Tab, label: 'Documents',  icon: 'folder' },
  ];

  readonly filteredMemos = computed(() =>
    this.memoFilter() === 'ALL'
      ? this.memos()
      : this.memos().filter(m => m.group === this.memoFilter()));

  readonly financialForm = this.fb.group({
    paymentTerms:     [''],
    creditAmount:     [null as number | null],
    creditCurrency:   [''],
    taxStatus:        [''],
    preferredCurrency:[''],
    autoApproveFreight: [false],
  });

  readonly identForm = this.fb.group({
    identifierType:  ['', Validators.required],
    identifierValue: ['', Validators.required],
    isPrimary:       [false],
  });

  readonly memoForm = this.fb.group({
    group: ['FreightForwarding' as MemoGroup, Validators.required],
    text:  ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly poaForm = this.fb.group({
    poaNumber:      [''],
    grantedTo:      [''],
    expirationDate: [''],
    status:         ['Pending'],
  });

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try {
      const p = await this.api.getParty(id);
      this.party.set(p);
      this.financialForm.patchValue({
        paymentTerms: p.defaultPaymentTerms ?? '',
        creditAmount: p.creditLimit?.amount ? Number(p.creditLimit.amount) : null,
        creditCurrency: p.creditLimit?.currency ?? '',
        taxStatus: p.taxStatus ?? '',
        preferredCurrency: p.preferredCurrency ?? '',
      });
    } catch {}
    finally { this.loading.set(false); }

    // Lazy-load docs when tab is opened
    // Load stored memos from localStorage (simple persistence)
    const stored = localStorage.getItem(`memos_${id}`);
    if (stored) this.memos.set(JSON.parse(stored));
  }

  async loadDocs() {
    if (this.bundle()) return;
    this.docsLoading.set(true);
    try { this.bundle.set(await this.api.getProfileExtensions(this.party()!.id)); }
    finally { this.docsLoading.set(false); }
  }

  onTabChange(tab: Tab) {
    this.activeTab.set(tab);
    if (tab === 'documents') this.loadDocs();
  }

  async saveFinancial() {
    if (!this.party()) return;
    this.savingFinancial.set(true);
    try {
      const v = this.financialForm.value;
      const p = this.party()!;
      const updated = await this.api.updateParty(p.id, {
        partyType: p.partyType,
        legalName: p.legalName,
        tradeName: p.tradeName,
        parentPartyId: p.parentPartyId,
        isActive: p.isActive,
        preferredLocale: p.preferredLocale,
        preferredCurrency: v.preferredCurrency || null,
        defaultPaymentTerms: v.paymentTerms || null,
        creditLimit: v.creditAmount && v.creditCurrency
          ? { amount: String(v.creditAmount), currency: v.creditCurrency }
          : null,
        taxStatus: v.taxStatus || null,
      });
      this.party.set(updated);
      this.financialSaved.set(true);
      setTimeout(() => this.financialSaved.set(false), 2500);
    } finally { this.savingFinancial.set(false); }
  }

  async addIdentifier() {
    if (this.identForm.invalid || !this.party()) return;
    this.addingIdent.set(true);
    try {
      const v = this.identForm.value;
      const newIdent = await this.api.addIdentifier(this.party()!.id, {
        identifierType:  v.identifierType!,
        identifierValue: v.identifierValue!,
        isPrimary:       v.isPrimary ?? false,
      });
      this.party.update(p => p ? { ...p, identifiers: [...p.identifiers, newIdent as PartyIdentifier] } : p);
      this.identForm.reset({ isPrimary: false });
    } finally { this.addingIdent.set(false); }
  }

  addMemo() {
    if (this.memoForm.invalid || !this.party()) return;
    const v = this.memoForm.value;
    const memo: Memo = { id: Date.now(), group: v.group!, text: v.text!, createdAt: new Date().toISOString() };
    const updated = [...this.memos(), memo];
    this.memos.set(updated);
    localStorage.setItem(`memos_${this.party()!.id}`, JSON.stringify(updated));
    this.memoForm.reset({ group: 'FreightForwarding' });
  }

  async addPoa() {
    if (this.poaForm.invalid || !this.party()) return;
    this.addingPoa.set(true);
    try {
      const v = this.poaForm.value;
      await this.api.addPoa(this.party()!.id, {
        poaNumber: v.poaNumber || null,
        grantedTo: v.grantedTo || null,
        expirationDate: v.expirationDate || null,
        status: v.status,
      });
      this.bundle.set(await this.api.getProfileExtensions(this.party()!.id));
      this.poaForm.reset({ status: 'Pending' });
    } finally { this.addingPoa.set(false); }
  }

  memoGroupLabel(g: string): string {
    return g === 'FreightForwarding' ? 'Freight Forwarding'
         : g === 'CustomsBrokerage'  ? 'Customs Brokerage'
         : g;
  }

  isExpiringSoon(date?: string | null): boolean {
    if (!date) return false;
    return (new Date(date).getTime() - Date.now()) / 86400000 <= 30;
  }
}
