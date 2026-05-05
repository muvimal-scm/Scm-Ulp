import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M2ApiService } from '../shared/m2-api.service';
import { OpportunityDetailDto } from '../shared/m2-types';

@Component({
  selector: 'ulp-m2-opportunity-detail',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    }
    @if (data(); as d) {
      <a routerLink=".." class="back">← Back to opportunities</a>

      <header class="page-head">
        <h1>{{ d.opportunity.title }}</h1>
        <p>
          <code>{{ d.opportunity.oppNumber }}</code> · {{ d.opportunity.countryCode }} · party #{{ d.opportunity.partyId }}
          · <span class="stage stage--{{ d.opportunity.stage.toLowerCase() }}">{{ d.opportunity.stage }}</span>
        </p>
      </header>

      <section class="card">
        <h2>Summary</h2>
        <dl>
          <dt>Estimated value</dt> <dd>{{ d.opportunity.estimatedValue ? (d.opportunity.estimatedValue | number:'1.0-0') : '—' }} {{ d.opportunity.estimatedCurrency ?? '' }}</dd>
          <dt>Probability</dt>     <dd>{{ d.opportunity.probabilityPct !== null ? (d.opportunity.probabilityPct | number:'1.0-1') + '%' : '—' }}</dd>
          <dt>Expected close</dt>  <dd>{{ d.opportunity.expectedClose ? (d.opportunity.expectedClose | slice:0:10) : '—' }}</dd>
          <dt>Owner</dt>           <dd>{{ d.opportunity.ownerUserId ? ('user #' + d.opportunity.ownerUserId) : '—' }}</dd>
          <dt>Created</dt>         <dd>{{ d.opportunity.createdAt | slice:0:19 }}</dd>
          <dt>Modified</dt>        <dd>{{ d.opportunity.modifiedAt | slice:0:19 }}</dd>
        </dl>
      </section>

      <section class="card">
        <h2>Linked quotes</h2>
        @if (d.linkedQuoteIds.length === 0) {
          <p class="muted">No M14 quotes linked yet.</p>
        } @else {
          <ul class="link-list">
            @for (qid of d.linkedQuoteIds; track qid) {
              <li><a [routerLink]="['/app/m14/quotes', qid]">Quote #{{ qid }} →</a></li>
            }
          </ul>
        }
      </section>

      <section class="card">
        <h2>Activities ({{ d.activities.length }})</h2>
        @if (d.activities.length === 0) {
          <p class="muted">No activities recorded.</p>
        } @else {
          <ol class="timeline">
            @for (a of d.activities; track a.id) {
              <li>
                <div class="timeline__when">{{ a.occurredAt | slice:0:19 }}</div>
                <div class="timeline__what">
                  <span class="ms-code">{{ a.activityType }}</span>
                  @if (a.subject) { · {{ a.subject }} }
                  @if (a.ownerUserId) { <span class="muted">· user #{{ a.ownerUserId }}</span> }
                </div>
              </li>
            }
          </ol>
        }
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
    .muted { color: #9A9AA3; }
    dl { display: grid; grid-template-columns: 160px 1fr; gap: 8px 16px; margin: 0; }
    dt { color: #6B5BA0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    dd { margin: 0; color: #1A1A33; font-size: 13px; }
    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .stage { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .stage--prospecting   { background: #E8E2F4; color: #3F2D7C; }
    .stage--qualification { background: #DCEAF8; color: #1F4E8A; }
    .stage--proposal      { background: #FFF3D6; color: #946100; }
    .stage--negotiation   { background: #FFE6CC; color: #8A4F00; }
    .stage--closedwon     { background: #DCF5E4; color: #1F7A3D; }
    .stage--closedlost    { background: #FBE4E5; color: #B23F45; }
    .link-list { list-style: none; padding: 0; margin: 0; }
    .link-list li { padding: 4px 0; }
    .link-list a { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link-list a:hover { text-decoration: underline; }
    .timeline { list-style: none; padding: 0; margin: 0; border-left: 2px solid #E8E2F4; }
    .timeline li { position: relative; padding: 6px 0 16px 18px; }
    .timeline li::before { content: ''; width: 10px; height: 10px; border-radius: 50%;
      background: #5B3FA0; position: absolute; left: -6px; top: 10px; }
    .timeline__when { color: #6B5BA0; font-size: 11px; }
    .timeline__what { font-size: 13px; color: #1A1A33; }
    .ms-code { font-weight: 700; color: #3F2D7C; }
  `],
})
export class OpportunityDetailComponent implements OnInit {
  private readonly api   = inject(M2ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly data    = signal<OpportunityDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('invalid opportunity id');
      this.loading.set(false);
      return;
    }
    try { this.data.set(await this.api.getOpportunity(id)); }
    catch (e: any) { this.error.set(e?.message ?? 'Failed to load opportunity'); }
    finally { this.loading.set(false); }
  }
}
