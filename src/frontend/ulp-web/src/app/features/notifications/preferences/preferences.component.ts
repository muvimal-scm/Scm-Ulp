import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationsApiService } from '../shared/notifications-api.service';
import { Channel, DigestFrequency, EmailSendTestResult, PreferenceDto, TemplateDto } from '../shared/notifications-types';

@Component({
  selector: 'ulp-notifications-preferences',
  standalone: true,
  imports: [
    FormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Notification preferences</h1>
      <p>Per-category × per-channel subscription. Defaults to <code>Immediate</code>; switch to digest to batch.</p>
    </header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {
      <div class="prefs">
        @for (cat of categories; track cat) {
          <div class="row">
            <div class="row__label">{{ cat }}</div>
            @for (ch of channels; track ch) {
              @if (find(cat, ch); as p) {
                <div class="cell">
                  <mat-slide-toggle [checked]="p.isSubscribed"
                                    (change)="toggle(p, $event.checked)">
                    {{ ch }}
                  </mat-slide-toggle>
                  <mat-form-field appearance="outline" class="freq" subscriptSizing="dynamic">
                    <mat-label>Frequency</mat-label>
                    <mat-select [value]="p.digestFrequency"
                                (selectionChange)="setFrequency(p, $event.value)"
                                [disabled]="!p.isSubscribed">
                      @for (f of frequencies; track f) { <mat-option [value]="f">{{ f }}</mat-option> }
                    </mat-select>
                  </mat-form-field>
                </div>
              } @else {
                <div class="cell">
                  <mat-slide-toggle [checked]="false"
                                    (change)="toggle({category: cat, channel: ch, isSubscribed: false, digestFrequency: 'Immediate'}, $event.checked)">
                    {{ ch }}
                  </mat-slide-toggle>
                </div>
              }
            }
          </div>
        }
      </div>
    }

    <hr class="rule" />

    <h2 class="sub">Send test email</h2>
    <p class="sub-p">Targets MailHog at <code>localhost:1025</code>. View at <a href="http://localhost:8025" target="_blank">localhost:8025</a>.</p>
    <div class="test-row">
      <mat-form-field appearance="outline" class="email">
        <mat-label>Email</mat-label>
        <input matInput [(ngModel)]="testTo" placeholder="me&#64;example.com" />
      </mat-form-field>
      <button mat-flat-button color="primary" (click)="sendTest()" [disabled]="!testTo.trim() || sending()">
        <mat-icon>send</mat-icon> Send test
      </button>
    </div>
    @if (testResult(); as r) {
      <div class="test-result" [class.test-result--ok]="r.success" [class.test-result--err]="!r.success">
        <mat-icon>{{ r.success ? 'mark_email_read' : 'error_outline' }}</mat-icon>
        <div>
          @if (r.success) {
            <strong>Sent via {{ r.provider }}.</strong>
            <div class="hint">id={{ r.messageId }} · open MailHog at <a href="http://localhost:8025" target="_blank">localhost:8025</a> to see it.</div>
          } @else {
            <strong>Send failed.</strong>
            <div>{{ r.error }}</div>
          }
        </div>
      </div>
    }

    <hr class="rule" />
    <h2 class="sub">Templates</h2>
    <p class="sub-p">Read-only catalogue. Editing UI lands Phase 1.1.</p>
    @if (templates().length === 0) {
      <div class="empty">No templates loaded.</div>
    } @else {
      <table class="tpl">
        <thead>
          <tr><th>Code</th><th>Channel</th><th>Locale</th><th>Country</th><th>Subject</th><th>Tenant</th></tr>
        </thead>
        <tbody>
          @for (t of templates(); track t.id) {
            <tr>
              <td><code>{{ t.code }}</code></td>
              <td>{{ t.channel }}</td>
              <td>{{ t.locale }}</td>
              <td>{{ t.countryCode || '—' }}</td>
              <td>{{ t.subject || '—' }}</td>
              <td>{{ t.tenantId ?? 'system' }}</td>
            </tr>
          }
        </tbody>
      </table>
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

    .loading { padding: 24px; text-align: center; }

    .prefs { display: flex; flex-direction: column; gap: 8px; }
    .row {
      display: grid; grid-template-columns: 200px repeat(4, 1fr); gap: 12px;
      align-items: center;
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      padding: 14px 18px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.04);
    }
    .row__label { color: #1A1A33; font-weight: 600; font-size: 14px; text-transform: capitalize; }
    .cell { display: flex; flex-direction: column; gap: 6px; }
    .freq { width: 140px; }

    .rule { border: none; border-top: 1px solid #E8E2F4; margin: 28px 0; }

    .sub { font-size: 18px; font-weight: 700; color: #3F2D7C; margin: 0 0 4px; }
    .sub-p { color: #6B5BA0; margin: 0 0 12px; font-size: 13px; }
    .sub-p a { color: #5B3FA0; }

    .test-row { display: flex; gap: 12px; align-items: flex-start; }
    .email { width: 320px; }

    .test-result {
      display: flex; gap: 12px; align-items: center; padding: 12px 14px;
      border-radius: 10px; margin-top: 12px;
    }
    .test-result--ok  { background: #DCF5E4; color: #1F7A3D; }
    .test-result--err { background: #FFF3F5; color: #B23F45; }
    .test-result mat-icon { color: inherit; }
    .test-result a { color: inherit; text-decoration: underline; }

    table.tpl {
      width: 100%; border-collapse: collapse;
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      overflow: hidden; box-shadow: 0 4px 16px rgba(63, 45, 124, 0.04);
    }
    .tpl thead th {
      text-align: left; padding: 12px 16px;
      background: #F5F2FB; color: #3F2D7C; font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .tpl tbody td { padding: 10px 16px; border-bottom: 1px solid #F0EBF8; font-size: 13px; }
    .tpl tbody tr:last-child td { border-bottom: none; }
    code { background: #F5F2FB; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
    .empty { padding: 24px; color: #9A9AA3; text-align: center; }
  `],
})
export class PreferencesComponent implements OnInit {
  private readonly api = inject(NotificationsApiService);

  readonly prefs      = signal<PreferenceDto[]>([]);
  readonly templates  = signal<TemplateDto[]>([]);
  readonly loading    = signal(true);
  readonly testResult = signal<EmailSendTestResult | null>(null);
  readonly sending    = signal(false);
  testTo = '';

  readonly categories = ['shipment', 'invoice', 'compliance', 'system'];
  readonly channels: Channel[] = ['Email', 'Sms', 'Whatsapp', 'InApp'];
  readonly frequencies: DigestFrequency[] = ['Immediate', 'Hourly', 'Daily', 'Weekly', 'Off'];

  async ngOnInit() {
    try {
      const [p, t] = await Promise.all([this.api.getPreferences(), this.api.listTemplates()]);
      this.prefs.set(p);
      this.templates.set(t);
    } catch { /* surface via individual errors later */ }
    this.loading.set(false);
  }

  find(cat: string, ch: Channel): PreferenceDto | undefined {
    return this.prefs().find(p => p.category === cat && p.channel === ch);
  }

  async toggle(p: PreferenceDto, isSubscribed: boolean) {
    await this.api.upsertPreference({ ...p, isSubscribed });
    this.prefs.set(await this.api.getPreferences());
  }

  async setFrequency(p: PreferenceDto, freq: DigestFrequency) {
    await this.api.upsertPreference({ ...p, digestFrequency: freq });
    this.prefs.set(await this.api.getPreferences());
  }

  async sendTest() {
    this.sending.set(true);
    try {
      this.testResult.set(await this.api.sendTestEmail(this.testTo.trim()));
    } catch (e: any) {
      this.testResult.set({ success: false, provider: 'unknown', messageId: null, error: e?.message ?? 'failed' });
    } finally {
      this.sending.set(false);
    }
  }
}
