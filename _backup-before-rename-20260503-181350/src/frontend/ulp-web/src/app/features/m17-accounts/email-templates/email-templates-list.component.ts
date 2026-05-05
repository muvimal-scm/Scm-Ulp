import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M17ExtApiService } from '../shared/m17-ext-api.service';
import { EmailTemplateDto } from '../shared/m17-ext-types';

@Component({
  selector: 'ulp-m17-email-templates',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Email Templates</h1>
      <p>Custom + predefined templates for invoices, statements, dunning, receipts.
         Supports {{ '{{' }} placeholder {{ '}}' }} substitution at send time. Closes the SCM client M3
         "custom email templates" item.</p>
    </header>
    @if (loading()) { <div class="loading"><mat-spinner diameter="32"></mat-spinner></div> }
    @else {
      <div class="card-grid">
        @for (t of rows(); track t.id) {
          <article class="card" [class.card--predef]="t.isPredefined">
            <header class="card-head">
              <h3>{{ t.templateName }}</h3>
              <span class="cat cat--{{ t.category.toLowerCase() }}">{{ t.category }}</span>
              @if (t.isPredefined) { <span class="badge">Predefined</span> }
              @else { <span class="badge badge--custom">Custom</span> }
              @if (!t.isActive) { <span class="badge badge--inactive">Inactive</span> }
            </header>
            <div class="code mono">{{ t.templateCode }}</div>
            <div class="subj"><strong>Subject:</strong> {{ t.subjectTemplate }}</div>
            <pre class="body">{{ t.bodyTemplate }}</pre>
            @if (t.availablePlaceholders && t.availablePlaceholders.length > 0) {
              <div class="placeholders">
                <strong>Placeholders:</strong>
                @for (p of t.availablePlaceholders; track p) {
                  <code>{{ '{{' }} {{ p }} {{ '}}' }}</code>
                }
              </div>
            }
          </article>
        } @empty { <div class="empty">No email templates.</div> }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .page-head p { color: #6B5BA0; margin: 0 0 16px; max-width: 720px; }
    .loading, .empty { padding: 24px; text-align: center; color: #6B5BA0; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 16px; }
    .card { background: #FFF; border: 1px solid #E8E2F4; border-radius: 12px;
            box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); padding: 18px; }
    .card--predef { background: #FBFAFE; }
    .card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
    .card-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: #1A1A33; flex: 1; }
    .code { color: #6B5BA0; font-size: 11px; margin-bottom: 8px; }
    .mono { font-family: 'SF Mono', Consolas, monospace; }
    .subj { font-size: 13px; color: #1A1A33; margin: 8px 0; }
    .subj strong { color: #3F2D7C; }
    .body { background: #F5F2FB; border-radius: 8px; padding: 12px; font-family: 'SF Mono', Consolas, monospace;
            font-size: 12px; color: #1A1A33; white-space: pre-wrap; max-height: 200px; overflow: auto; margin: 8px 0 0; }
    .placeholders { margin-top: 8px; font-size: 11px; color: #6B5BA0; }
    .placeholders strong { color: #3F2D7C; margin-right: 6px; }
    .placeholders code { background: #E8E2F4; color: #3F2D7C; padding: 1px 6px; border-radius: 4px;
                         margin-right: 4px; font-size: 11px; }
    .cat { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .cat--invoice           { background: #DCEAF8; color: #1F4E8A; }
    .cat--pastdue           { background: #FBE4E5; color: #B23F45; }
    .cat--statement         { background: #DCF5E4; color: #1F7A3D; }
    .cat--receipt           { background: #FFE6CC; color: #8A4F00; }
    .cat--paymentremittance { background: #E8E2F4; color: #3F2D7C; }
    .cat--custom            { background: #F5F2FB; color: #5B3FA0; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
             background: #E8E2F4; color: #3F2D7C; }
    .badge--custom   { background: #DCF5E4; color: #1F7A3D; }
    .badge--inactive { background: #F5F5F5; color: #777; }
  `],
})
export class EmailTemplatesListComponent implements OnInit {
  private readonly api = inject(M17ExtApiService);
  readonly rows = signal<EmailTemplateDto[]>([]);
  readonly loading = signal(true);
  async ngOnInit() {
    try { this.rows.set(await this.api.listEmailTemplates()); }
    finally { this.loading.set(false); }
  }
}
