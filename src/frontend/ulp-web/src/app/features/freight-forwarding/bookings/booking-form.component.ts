import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { FreightForwardingApiService } from '../shared/freight-forwarding-api.service';

// Demo PO list for "Attach Existing PO" lookup
const DEMO_POS = [
  { internalNo: 'OR2026-0000001', poNo: 'PO-3197', piNo: 'PI-36079', crd: '2026-06-15', seller: 'Combine Thai Foods' },
  { internalNo: 'OR2026-0000002', poNo: 'PO-6722', piNo: 'PI-40021', crd: '2026-07-01', seller: 'Feng Mian Exports' },
  { internalNo: 'OR2026-0000003', poNo: 'PO-0018', piNo: '',         crd: '2026-07-20', seller: 'Demo Apparel 3' },
];

@Component({
  selector: 'ulp-ff-booking-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule, MatRadioModule,
    MatCheckboxModule, MatTooltipModule, MatChipsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <a routerLink="/app/freight-forwarding/bookings" class="back-link">‹ Back to bookings</a>
      <h1>New Booking Request</h1>
      <p>Complete the form below. Fields marked * are required.</p>
    </header>

    @if (apiError()) {
      <div class="api-error"><mat-icon>error_outline</mat-icon> {{ apiError() }}</div>
    }

    <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">

      <!-- Section: Attach PO -->
      <h2 class="section-head">Attach Existing PO <span class="opt">(optional)</span></h2>
      <div class="attach-po">
        <mat-checkbox formControlName="attachPo" color="primary">Attach to an existing Purchase Order</mat-checkbox>
        @if (form.get('attachPo')?.value) {
          <div class="po-search">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Search PO by Internal #, PO #, PI #</mat-label>
              <input matInput formControlName="poSearch" placeholder="OR2026-…" />
            </mat-form-field>
            <div class="po-results">
              @for (p of filteredPos(); track p.internalNo) {
                <div class="po-row" (click)="selectPo(p)">
                  <span><strong>{{ p.internalNo }}</strong> · {{ p.poNo }}</span>
                  @if (p.piNo) { <span class="muted">PI: {{ p.piNo }}</span> }
                  <span class="muted">CRD: {{ p.crd }}</span>
                  <span>{{ p.seller }}</span>
                </div>
              }
            </div>
            @if (selectedPo()) {
              <div class="selected-po">
                <mat-icon>link</mat-icon>
                Attached: {{ selectedPo()!.internalNo }} / {{ selectedPo()!.poNo }}
                @if (selectedPo()!.piNo) { / {{ selectedPo()!.piNo }} }
                <button mat-icon-button type="button" (click)="selectedPo.set(null)"><mat-icon>close</mat-icon></button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Section: Identity -->
      <h2 class="section-head">Identity</h2>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>Country code *</mat-label>
          <mat-select formControlName="countryCode">
            <mat-option value="IN">IN — India</mat-option>
            <mat-option value="US">US — United States</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Booking # *</mat-label>
          <input matInput formControlName="bookingNumber" placeholder="BKG-2026-0001" />
          <mat-hint>Immutable once created</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Customer Party (shipper / cnee / booking agent)</mat-label>
          <input matInput formControlName="customerPartyName" placeholder="Company name" />
        </mat-form-field>
      </div>

      <!-- Section: ID Number -->
      <h2 class="section-head">ID No</h2>
      <div class="id-section">
        <mat-radio-group formControlName="idNoType" class="id-radio">
          <mat-radio-button value="none">No ID #</mat-radio-button>
          <mat-radio-button value="usa">USA</mat-radio-button>
          <mat-radio-button value="other">Other Countries</mat-radio-button>
        </mat-radio-group>
        @if (form.get('idNoType')?.value === 'usa') {
          <div class="row-2 mt8">
            <mat-form-field appearance="outline">
              <mat-label>ID Type</mat-label>
              <mat-select formControlName="usaIdType">
                <mat-option value="IRS">IRS #</mat-option>
                <mat-option value="CBP">CBP #</mat-option>
                <mat-option value="SSN">SSN</mat-option>
                <mat-option value="DUNS">DUNS #</mat-option>
                <mat-option value="Passport">Passport #</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>ID Value</mat-label>
              <input matInput formControlName="idNoValue" />
            </mat-form-field>
          </div>
        }
        @if (form.get('idNoType')?.value === 'other') {
          <div class="row-2 mt8">
            <mat-form-field appearance="outline">
              <mat-label>ID Type</mat-label>
              <mat-select formControlName="otherIdType">
                <mat-option value="VAT">VAT Tax #</mat-option>
                <mat-option value="BRN">Business Registration #</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>ID Value</mat-label>
              <input matInput formControlName="idNoValue" />
            </mat-form-field>
          </div>
        }
      </div>

      <!-- Section: Service Type -->
      <h2 class="section-head">Service Type *</h2>
      <div class="service-selector">
        @for (s of serviceTypes; track s.key) {
          <button type="button" class="svc-btn" [class.svc-btn--active]="form.get('serviceType')?.value === s.key"
                  (click)="form.get('serviceType')!.setValue(s.key)">
            <mat-icon>{{ s.icon }}</mat-icon>
            <span>{{ s.label }}</span>
          </button>
        }
      </div>

      @if (form.get('serviceType')?.value === 'Ocean') {
        <div class="sub-section">
          <mat-radio-group formControlName="oceanMode" class="id-radio">
            <mat-radio-button value="FCL">FCL — Full Container Load</mat-radio-button>
            <mat-radio-button value="LCL">LCL — Less than Container Load</mat-radio-button>
          </mat-radio-group>
          @if (form.get('oceanMode')?.value === 'FCL') {
            <mat-form-field appearance="outline" class="mt8 half">
              <mat-label>Container Type</mat-label>
              <mat-select formControlName="containerType">
                <mat-option value="20DC">20'DC — Dry Container</mat-option>
                <mat-option value="40DC">40'DC — Dry Container</mat-option>
                <mat-option value="40HC">40'HC — High Cube</mat-option>
                <mat-option value="20RF">20'RF — Reefer</mat-option>
                <mat-option value="40RF">40'RF — Reefer</mat-option>
                <mat-option value="SOC">SOC — Shipper Owned Container</mat-option>
              </mat-select>
            </mat-form-field>
          }
          <div class="add-services">
            <div class="add-svc-label">Additional services at origin / destination:</div>
            <mat-checkbox formControlName="needCustoms" color="primary">Customs Clearance</mat-checkbox>
            <mat-checkbox formControlName="needTrucking" color="primary">Trucking</mat-checkbox>
            <mat-checkbox formControlName="needWarehousing" color="primary">Warehousing</mat-checkbox>
          </div>
        </div>
      }

      @if (form.get('serviceType')?.value === 'CustomsClearance') {
        <div class="sub-section">
          <div class="sub-label">Does importer need bond?</div>
          <mat-radio-group formControlName="bondType" class="id-radio">
            <mat-radio-button value="SingleEntry">Single Entry Bond + ISF Bond</mat-radio-button>
            <mat-radio-button value="Continuous">Continuous Bond</mat-radio-button>
            <mat-radio-button value="None">None — Already Have Active Bond</mat-radio-button>
          </mat-radio-group>
          <div class="add-services mt8">
            <mat-checkbox formControlName="needTrucking" color="primary">Trucking</mat-checkbox>
            <mat-checkbox formControlName="needWarehousing" color="primary">Warehousing</mat-checkbox>
          </div>
        </div>
      }

      @if (form.get('serviceType')?.value === 'DomesticTransport') {
        <div class="sub-section">
          <mat-form-field appearance="outline" class="half">
            <mat-label>Truck Type</mat-label>
            <mat-select formControlName="truckType">
              <mat-option value="FTL">FTL — Full Truck Load</mat-option>
              <mat-option value="LTL">LTL — Less Than Truck Load</mat-option>
              <mat-option value="Drayage">Drayage</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-checkbox formControlName="needWarehousing" color="primary">Warehousing</mat-checkbox>
        </div>
      }

      @if (form.get('serviceType')?.value === 'Air') {
        <div class="sub-section add-services">
          <div class="add-svc-label">Additional services:</div>
          <mat-checkbox formControlName="needCustoms" color="primary">Customs Clearance</mat-checkbox>
          <mat-checkbox formControlName="needTrucking" color="primary">Trucking</mat-checkbox>
          <mat-checkbox formControlName="needWarehousing" color="primary">Warehousing</mat-checkbox>
        </div>
      }

      <!-- Section: Commodity -->
      <h2 class="section-head">Commodity Type *</h2>
      <mat-radio-group formControlName="commodityType" class="id-radio">
        <mat-radio-button value="Foodstuff">Foodstuff</mat-radio-button>
        <mat-radio-button value="GeneralCargo">General Cargo</mat-radio-button>
        <mat-radio-button value="DG">
          Dangerous Goods (DG)
          <mat-icon class="dg-info" matTooltip="Examples: batteries, hazardous materials, magnets, creams, liquids, powders">
            help_outline
          </mat-icon>
        </mat-radio-button>
      </mat-radio-group>

      <!-- Section: Shipment Details -->
      <h2 class="section-head">Shipment Details</h2>
      <div class="row-2">
        <mat-form-field appearance="outline">
          <mat-label>POL — Port of Loading</mat-label>
          <input matInput formControlName="pol" placeholder="CNSGH / THBKK" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>POD — Port of Discharge</mat-label>
          <input matInput formControlName="pod" placeholder="USLAX / USNYC" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Place of Delivery</mat-label>
          <input matInput formControlName="placeOfDelivery" placeholder="Final destination address" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Estimated CRD *</mat-label>
          <input matInput formControlName="estimatedCrd" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Volume of Containers *</mat-label>
          <input matInput formControlName="containerVolume" placeholder="2 x 40HC" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Incoterm</mat-label>
          <mat-select formControlName="incoterm">
            <mat-option value="FOB">FOB</mat-option>
            <mat-option value="EXW">EXW</mat-option>
            <mat-option value="CIF">CIF</mat-option>
            <mat-option value="CFR">CFR</mat-option>
            <mat-option value="DDP">DDP</mat-option>
            <mat-option value="DAP">DAP</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Trade Direction</mat-label>
          <mat-select formControlName="tradeDirection">
            <mat-option value="Import">Import</mat-option>
            <mat-option value="Export">Export</mat-option>
            <mat-option value="CrossTrade">Cross Trade</mat-option>
            <mat-option value="Domestic">Domestic</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Notes / Special Instructions</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </div>

      <!-- Templates -->
      <h2 class="section-head">Booking Templates</h2>
      <div class="templates-row">
        <mat-form-field appearance="outline" class="flex1">
          <mat-label>Template name</mat-label>
          <input matInput formControlName="templateName" placeholder="e.g. Bangkok→LA 40HC" />
        </mat-form-field>
        <button mat-stroked-button type="button" (click)="saveTemplate()">
          <mat-icon>save</mat-icon> Save Template
        </button>
        @if (savedTemplates().length > 0) {
          <mat-form-field appearance="outline" class="flex1">
            <mat-label>Load Template</mat-label>
            <mat-select (valueChange)="loadTemplate($event)">
              @for (t of savedTemplates(); track t.name) {
                <mat-option [value]="t.name">{{ t.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <a mat-stroked-button routerLink="/app/freight-forwarding/bookings">Cancel</a>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || submitting()">
          @if (submitting()) { <mat-spinner diameter="18"></mat-spinner> }
          @else { <mat-icon>send</mat-icon> Submit Booking Request }
        </button>
      </div>
    </form>
  `,
  styles: [`
    :host { display: block; max-width: 860px; margin: 0 auto; }
    .back-link { color: #5B3FA0; text-decoration: none; font-size: 13px; font-weight: 600; }
    .back-link:hover { text-decoration: underline; }
    .page-head h1 { font-size: 26px; font-weight: 800; margin: 8px 0 4px;
      background: linear-gradient(90deg, #E54A8A, #5B3FA0, #3F2D7C);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; font-size: 13px; }
    .api-error { display: flex; align-items: center; gap: 8px; color: #B23F45; background: #FBE4E5;
      border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; }
    .form-card { background: #fff; border: 1px solid #E8E2F4; border-radius: 14px; padding: 28px;
      box-shadow: 0 4px 16px rgba(63,45,124,.06); }
    .section-head { font-size: 13px; font-weight: 700; color: #3F2D7C; text-transform: uppercase;
      letter-spacing: .5px; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #E8E2F4; }
    .section-head:first-of-type { margin-top: 0; }
    .opt { font-size: 11px; font-weight: 400; color: #9A9AA3; text-transform: none; letter-spacing: 0; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full { grid-column: 1 / -1; width: 100%; }
    .half { width: 50%; }
    .mt8 { margin-top: 8px; }
    .flex1 { flex: 1; min-width: 180px; }
    .muted { color: #9A9AA3; font-size: 12px; }
    mat-form-field { width: 100%; }
    .id-section { display: flex; flex-direction: column; gap: 8px; }
    .id-radio { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
    .dg-info { font-size: 16px; width: 16px; height: 16px; color: #9A9AA3; cursor: help;
      vertical-align: middle; margin-left: 4px; }
    /* Attach PO */
    .attach-po { display: flex; flex-direction: column; gap: 10px; }
    .po-search { margin-top: 8px; }
    .po-results { border: 1px solid #E8E2F4; border-radius: 8px; overflow: hidden; margin-top: 4px; }
    .po-row { display: flex; gap: 16px; align-items: center; padding: 8px 12px; font-size: 12px;
      cursor: pointer; border-bottom: 1px solid #F0EBF8; }
    .po-row:last-child { border-bottom: none; }
    .po-row:hover { background: #F5F2FB; }
    .selected-po { display: flex; align-items: center; gap: 8px; background: #F0F4FF;
      border: 1px solid #C9BEEC; border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #3F2D7C; }
    .selected-po mat-icon { color: #5B3FA0; }
    /* Service buttons */
    .service-selector { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
    .svc-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 16px;
      border: 2px solid #E8E2F4; border-radius: 10px; background: #fff; cursor: pointer;
      font-family: inherit; font-size: 12px; font-weight: 600; color: #6B5BA0; min-width: 100px; }
    .svc-btn mat-icon { font-size: 24px; width: 24px; height: 24px; color: #9A9AA3; }
    .svc-btn--active { border-color: #5B3FA0; background: #F0EFFE; color: #3F2D7C; }
    .svc-btn--active mat-icon { color: #5B3FA0; }
    .sub-section { background: #F8F9FF; border: 1px solid #E8E2F4; border-radius: 8px; padding: 14px; margin-top: 10px; }
    .sub-label { font-size: 12px; font-weight: 700; color: #3F2D7C; margin-bottom: 8px; }
    .add-services { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .add-svc-label { font-size: 12px; color: #6B5BA0; width: 100%; }
    /* Templates */
    .templates-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    /* Actions */
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 28px;
      padding-top: 20px; border-top: 1px solid #E8E2F4; }
    @media (max-width: 680px) {
      .row-2 { grid-template-columns: 1fr; }
      .half { width: 100%; }
    }
  `],
})
export class BookingFormComponent implements OnInit {
  private readonly api    = inject(FreightForwardingApiService);
  private readonly router = inject(Router);
  private readonly fb     = inject(FormBuilder);

  readonly submitting     = signal(false);
  readonly apiError       = signal<string | null>(null);
  readonly selectedPo     = signal<typeof DEMO_POS[0] | null>(null);
  readonly savedTemplates = signal<{ name: string; values: Record<string, unknown> }[]>([]);

  readonly serviceTypes = [
    { key: 'Ocean',            label: 'Ocean',      icon: 'directions_boat' },
    { key: 'Air',              label: 'Air',         icon: 'flight' },
    { key: 'CustomsClearance', label: 'Customs',     icon: 'gavel' },
    { key: 'DomesticTransport',label: 'Domestic',    icon: 'local_shipping' },
    { key: 'Warehousing',      label: 'Warehousing', icon: 'warehouse' },
  ];

  readonly form = this.fb.group({
    // Attach PO
    attachPo:          [false],
    poSearch:          [''],
    // Identity
    countryCode:       ['IN', Validators.required],
    bookingNumber:     ['', Validators.required],
    customerPartyName: [''],
    // ID No
    idNoType:          ['none'],
    usaIdType:         ['IRS'],
    otherIdType:       ['VAT'],
    idNoValue:         [''],
    // Service
    serviceType:       ['Ocean', Validators.required],
    oceanMode:         ['FCL'],
    containerType:     ['40HC'],
    bondType:          ['None'],
    truckType:         ['FTL'],
    needCustoms:       [false],
    needTrucking:      [false],
    needWarehousing:   [false],
    // Commodity
    commodityType:     ['GeneralCargo', Validators.required],
    // Shipment
    pol:               [''],
    pod:               [''],
    placeOfDelivery:   [''],
    estimatedCrd:      ['', Validators.required],
    containerVolume:   ['', Validators.required],
    incoterm:          ['FOB'],
    tradeDirection:    ['Import', Validators.required],
    notes:             [''],
    // Template
    templateName:      [''],
  });

  ngOnInit() {
    const stored = localStorage.getItem('booking_templates');
    if (stored) {
      try { this.savedTemplates.set(JSON.parse(stored)); } catch { /* ignore */ }
    }

    // Auto-generate booking number
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dd = `${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    this.form.patchValue({ bookingNumber: `BKG-${yyyymm}-${dd}` });

    // Clear selected PO when search changes
    this.form.get('poSearch')!.valueChanges.subscribe(() => this.selectedPo.set(null));
  }

  filteredPos() {
    const q = (this.form.get('poSearch')?.value ?? '').toLowerCase();
    if (!q) return DEMO_POS;
    return DEMO_POS.filter(p =>
      p.internalNo.toLowerCase().includes(q) || p.poNo.toLowerCase().includes(q) ||
      p.piNo.toLowerCase().includes(q) || p.seller.toLowerCase().includes(q));
  }

  selectPo(p: typeof DEMO_POS[0]) { this.selectedPo.set(p); }

  saveTemplate() {
    const name = this.form.get('templateName')?.value;
    if (!name) return;
    const templates = [...this.savedTemplates(), { name, values: this.form.value as Record<string, unknown> }];
    this.savedTemplates.set(templates);
    localStorage.setItem('booking_templates', JSON.stringify(templates));
  }

  loadTemplate(name: string) {
    const t = this.savedTemplates().find(x => x.name === name);
    if (t) this.form.patchValue(t.values);
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.apiError.set(null);
    const v = this.form.value;
    try {
      await this.api.createBooking({
        countryCode:          v.countryCode!,
        bookingNumber:        v.bookingNumber!,
        customerPartyId:      1,
        tradeDirection:       (v.tradeDirection as 'Import' | 'Export' | 'CrossTrade' | 'Domestic'),
        mode:                 v.serviceType === 'Air' ? 'Air' : v.oceanMode === 'LCL' ? 'OceanLcl' : 'OceanFcl',
        serviceType:          'PortPort',
        incoterm:             v.incoterm ?? null,
        originPortId:         1,
        destinationPortId:    2,
        expectedPickupDate:   v.estimatedCrd ?? null,
        expectedDeliveryDate: null,
        estimatedCrd:         v.estimatedCrd ?? null,
        remarks:              v.notes ?? null,
      });
      await this.router.navigate(['/app/freight-forwarding/bookings']);
    } catch (e: any) {
      this.apiError.set(e?.error?.error ?? e?.message ?? 'Booking request failed');
    } finally {
      this.submitting.set(false);
    }
  }
}
