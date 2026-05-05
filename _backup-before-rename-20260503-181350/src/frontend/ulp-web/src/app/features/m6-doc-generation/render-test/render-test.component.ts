import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M6ApiService } from '../shared/m6-api.service';
import { RenderResponseDto, TemplateDto } from '../shared/m6-types';

const SAMPLE_PAYLOAD = `{
  "tenant_name": "Acme Logistics India Pvt Ltd",
  "tenant_gstin": "29ABCDE1234F1Z5",
  "invoice_number": "INV-2026-001",
  "invoice_date": "2026-05-03",
  "irn": "abcd1234efgh5678ijklmnop",
  "customer_name": "Globex Ltd",
  "customer_gstin": "27ZYXWV9876B1Z2",
  "currency": "INR",
  "subtotal": 100000.00,
  "cgst": 9000.00,
  "sgst": 9000.00,
  "igst": 0.00,
  "total": 118000.00
}`;

@Component({
  selector: 'ulp-m6-render-test',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Render test</h1>
      <p>Pick a template, paste a JSON payload, and inspect the rendered HTML inline.</p>
    </header>

    @if (loadingTemplates()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {
      <section class="card">
        <div class="form-grid">
          <label>
            Template
            <select [(ngModel)]="templateCode" name="code">
              @for (t of templates(); track t.id) {
                <option [value]="t.code + '|' + (t.countryCode ?? '')">
                  {{ t.code }}@if (t.countryCode) { · {{ t.countryCode }} } — {{ t.name }}
                </option>
              }
            </select>
          </label>
          <label>
            Source module
            <input type="text" [(ngModel)]="sourceModule" name="src" placeholder="M14, M17, …" />
          </label>
        </div>
        <label class="payload-lbl">
          Payload (JSON)
          <textarea rows="10" [(ngModel)]="payloadJson" name="payload"></textarea>
        </label>
        <div class="actions">
          <button class="btn" (click)="render()" [disabled]="rendering()">
            @if (rendering()) { Rendering… } @else { <mat-icon>play_arrow</mat-icon> Render }
          </button>
          @if (result(); as r) {
            <span class="meta">
              <span class="status status--{{ r.status.toLowerCase() }}">{{ r.status }}</span>
              · {{ r.durationMs ?? 0 }} ms · {{ r.outputFormat }} · ulid <code>{{ r.ulid }}</code>
            </span>
          }
        </div>
        @if (error()) {
          <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
        }
      </section>

      @if (result()?.body; as body) {
        <section class="card">
          <h2>Preview</h2>
          <div class="preview" [innerHTML]="safeBody()"></div>
          <details class="raw">
            <summary>Raw HTML</summary>
            <pre>{{ body }}</pre>
          </details>
        </section>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; }

    .loading { padding: 24px; text-align: center; color: #6B5BA0; }

    .card {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
      padding: 20px; margin-bottom: 16px;
    }
    .card h2 { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px; }

    .form-grid {
      display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 12px;
    }
    label { display: flex; flex-direction: column; font-size: 12px; color: #3F2D7C; font-weight: 700; gap: 4px; }
    .payload-lbl { display: block; font-size: 12px; color: #3F2D7C; font-weight: 700; }
    .payload-lbl textarea { margin-top: 4px; }

    select, input, textarea {
      padding: 8px 10px; border: 1px solid #E8E2F4; border-radius: 8px;
      font-size: 13px; color: #1A1A33; font-family: inherit; width: 100%;
      background: #FFFFFF;
    }
    textarea {
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 12px; min-height: 200px; resize: vertical;
    }

    .actions { display: flex; gap: 12px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: #5B3FA0; color: white; border: none; border-radius: 8px;
      padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .btn:hover:not(:disabled) { background: #3F2D7C; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .meta { color: #6B5BA0; font-size: 12px; }

    .status { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status--completed { background: #DCF5E4; color: #1F7A3D; }
    .status--failed    { background: #FBE4E5; color: #B23F45; }
    .status--rendering { background: #FFF3D6; color: #946100; }
    .status--queued    { background: #E8E2F4; color: #3F2D7C; }

    .error { margin-top: 12px; padding: 10px 14px; background: #FBE4E5; color: #B23F45; border-radius: 8px; font-size: 13px; display: flex; gap: 8px; align-items: center; }

    .preview {
      border: 1px solid #E8E2F4; border-radius: 8px; padding: 16px;
      background: #FAFAFE; min-height: 200px;
    }
    .raw { margin-top: 12px; }
    .raw summary { cursor: pointer; color: #5B3FA0; font-weight: 600; font-size: 13px; }
    .raw pre {
      margin-top: 10px; padding: 12px; background: #1A1A33; color: #DCF5E4;
      border-radius: 8px; max-height: 300px; overflow: auto;
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px;
      white-space: pre-wrap; word-break: break-all;
    }

    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-family: 'SFMono-Regular', Consolas, monospace; }
  `],
})
export class RenderTestComponent implements OnInit {
  private readonly api  = inject(M6ApiService);
  private readonly sani = inject(DomSanitizer);

  readonly templates        = signal<TemplateDto[]>([]);
  readonly loadingTemplates = signal(true);
  readonly rendering        = signal(false);
  readonly result           = signal<RenderResponseDto | null>(null);
  readonly error            = signal<string | null>(null);

  templateCode = 'INVOICE|IN';
  sourceModule = 'M6';
  payloadJson  = SAMPLE_PAYLOAD;

  async ngOnInit() {
    try {
      const ts = await this.api.listTemplates();
      this.templates.set(ts);
      if (ts.length > 0) {
        this.templateCode = `${ts[0].code}|${ts[0].countryCode ?? ''}`;
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load templates');
    } finally {
      this.loadingTemplates.set(false);
    }
  }

  safeBody(): SafeHtml {
    const body = this.result()?.body ?? '';
    return this.sani.bypassSecurityTrustHtml(body);
  }

  async render() {
    this.error.set(null);
    this.result.set(null);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(this.payloadJson);
    } catch {
      this.error.set('Payload is not valid JSON.');
      return;
    }

    const [code, country] = this.templateCode.split('|');
    this.rendering.set(true);
    try {
      const resp = await this.api.render({
        code,
        countryCode:    country || null,
        sourceModule:   this.sourceModule || 'M6',
        sourceEntityId: null,
        payload,
      });
      this.result.set(resp);
      if (!resp.body && resp.error) {
        this.error.set(resp.error);
      }
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.message ?? 'render failed');
    } finally {
      this.rendering.set(false);
    }
  }
}
