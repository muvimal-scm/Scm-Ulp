import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { M6ApiService } from '../shared/m6-api.service';
import { TemplateDetailDto } from '../shared/m6-types';

@Component({
  selector: 'ulp-m6-template-detail',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    }
    @if (data(); as d) {
      <a routerLink=".." class="back">← Back to templates</a>

      <header class="page-head">
        <h1>{{ d.template.name }}</h1>
        <p>
          <code>{{ d.template.code }}</code>
          @if (d.template.countryCode) { · {{ d.template.countryCode }} }
          · {{ d.template.templateType }} via {{ d.template.renderingEngine }}
          · v{{ d.template.version }}
        </p>
      </header>

      <section class="card">
        <h2>Fields ({{ d.fields.length }})</h2>
        @if (d.fields.length === 0) {
          <p class="muted">No declared fields. Payload is forwarded to the engine as-is.</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Field</th><th>Type</th><th>Required</th><th>Default</th><th>Source</th>
              </tr>
            </thead>
            <tbody>
              @for (f of d.fields; track f.fieldName) {
                <tr>
                  <td><code>{{ f.fieldName }}</code></td>
                  <td>{{ f.fieldType }}</td>
                  <td>
                    @if (f.isRequired) { <span class="dot dot--ok"></span> yes }
                    @else { <span class="dot dot--off"></span> no }
                  </td>
                  <td>{{ f.defaultValue ?? '—' }}</td>
                  <td>
                    @if (f.sourceModule) { {{ f.sourceModule }}<span class="muted"> · {{ f.sourcePath }}</span> }
                    @else { — }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section class="card">
        <h2>Versions ({{ d.versions.length }})</h2>
        @for (v of d.versions; track v.id) {
          <details class="ver">
            <summary>
              <span class="ver__num">v{{ v.versionNumber }}</span>
              <span class="muted">{{ v.createdAt | slice:0:19 }}</span>
              @if (v.comment) { <span class="ver__comment">{{ v.comment }}</span> }
            </summary>
            <pre class="body">{{ v.body }}</pre>
          </details>
        }
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .back { color: #5B3FA0; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-block; margin-bottom: 12px; }
    .back:hover { text-decoration: underline; }

    .page-head h1 {
      font-size: 24px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; font-size: 13px; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }

    .card {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
      padding: 20px; margin-bottom: 16px;
    }
    .card h2 { color: #3F2D7C; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .muted { color: #9A9AA3; }

    table { width: 100%; border-collapse: collapse; }
    thead th {
      text-align: left; padding: 8px 12px;
      background: #F5F2FB; color: #3F2D7C; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    tbody td { padding: 8px 12px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody tr:last-child td { border-bottom: none; }

    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
    .dot--ok  { background: #1F7A3D; }
    .dot--off { background: #B23F45; }

    .ver { padding: 10px 0; border-bottom: 1px solid #F0EBF8; }
    .ver:last-child { border-bottom: none; }
    .ver summary { cursor: pointer; display: flex; gap: 12px; align-items: center; font-size: 13px; }
    .ver__num { font-weight: 700; color: #3F2D7C; }
    .ver__comment { color: #1A1A33; font-style: italic; }
    .body {
      margin-top: 10px; padding: 12px; background: #1A1A33; color: #DCF5E4;
      border-radius: 8px; max-height: 360px; overflow: auto;
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px;
      white-space: pre-wrap; word-break: break-all;
    }
  `],
})
export class TemplateDetailComponent implements OnInit {
  private readonly api   = inject(M6ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly data    = signal<TemplateDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('invalid template id');
      this.loading.set(false);
      return;
    }
    try {
      this.data.set(await this.api.getTemplate(id));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load template');
    } finally {
      this.loading.set(false);
    }
  }
}
