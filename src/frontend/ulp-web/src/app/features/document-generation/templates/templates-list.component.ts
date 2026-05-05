import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DocumentGenerationApiService } from '../shared/document-generation-api.service';
import { TemplateDto } from '../shared/document-generation-types';

@Component({
  selector: 'ulp-document-generation-templates',
  standalone: true,
  imports: [SlicePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1>Document templates</h1>
          <p>System + tenant templates. System templates (tenant null) are read-only — fork to a tenant template to edit.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="new" class="new-btn">
          <mat-icon>add</mat-icon>&nbsp;New template
        </a>
      </div>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Country</th>
              <th>Name</th>
              <th>Format</th>
              <th>Engine</th>
              <th>Scope</th>
              <th class="num">v</th>
              <th>Modified</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (t of rows(); track t.id) {
              <tr [class.inactive]="!t.isActive">
                <td><code>{{ t.code }}</code></td>
                <td>{{ t.countryCode ?? '—' }}</td>
                <td>{{ t.name }}</td>
                <td><span class="badge badge--type">{{ t.templateType }}</span></td>
                <td>{{ t.renderingEngine }}</td>
                <td>
                  @if (t.tenantId === null) {
                    <span class="badge badge--system">SYSTEM</span>
                  } @else {
                    <span class="badge badge--tenant">TENANT</span>
                  }
                </td>
                <td class="num">{{ t.version }}</td>
                <td>{{ t.modifiedAt | slice:0:10 }}</td>
                <td><a [routerLink]="[t.id]" class="link">Open →</a></td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No templates configured.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .new-btn { white-space: nowrap; }
    .page-head h1 {
      font-size: 28px; font-weight: 800; margin: 0 0 4px;
      background: linear-gradient(90deg, #E54A8A 0%, #5B3FA0 50%, #3F2D7C 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .page-head p { color: #6B5BA0; margin: 0 0 20px; }

    .loading, .error { padding: 24px; text-align: center; color: #6B5BA0; }
    .error { color: #B23F45; }

    .table-wrap {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06); overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      text-align: left; padding: 12px 16px;
      background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    thead th.num { text-align: right; }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr.inactive td { opacity: 0.55; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }

    code { background: #F5F2FB; padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .badge--type   { background: #E8E2F4; color: #3F2D7C; }
    .badge--system { background: #FFF3D6; color: #946100; }
    .badge--tenant { background: #DCF5E4; color: #1F7A3D; }

    .link { color: #5B3FA0; text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
  `],
})
export class TemplatesListComponent implements OnInit {
  private readonly api = inject(DocumentGenerationApiService);

  readonly rows    = signal<TemplateDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.rows.set(await this.api.listTemplates());
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load templates');
    } finally {
      this.loading.set(false);
    }
  }
}
