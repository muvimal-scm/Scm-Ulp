import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { M21ApiService } from './shared/m21-api.service';
import { DocumentDto, StorageQuotaDto } from './shared/m21-types';

interface UiUploadState {
  filename: string;
  sizeBytes: number;
  phase: 'hashing' | 'uploading' | 'completing' | 'done' | 'error';
  message?: string;
}

@Component({
  selector: 'ulp-m21-documents',
  standalone: true,
  imports: [
    SlicePipe, FormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <h1>Documents</h1>
      <p>Tenant document store. Upload via MinIO presigned URL · WORM retention enforced server-side.</p>
    </header>

    @if (quota(); as q) {
      <div class="quota">
        <div class="quota__row">
          <strong>Storage</strong>
          <span>{{ formatBytes(q.bytesUsed) }} / {{ formatBytes(q.bytesQuota) }} · {{ q.documentsCount }} doc{{ q.documentsCount === 1 ? '' : 's' }}</span>
        </div>
        <mat-progress-bar mode="determinate" [value]="q.percentUsed"></mat-progress-bar>
      </div>
    }

    <div class="upload-card">
      <div class="upload-row">
        <mat-form-field appearance="outline" class="cls">
          <mat-label>Class</mat-label>
          <mat-select [(value)]="classCode">
            @for (c of classCodes; track c) { <mat-option [value]="c">{{ c }}</mat-option> }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="mod">
          <mat-label>Module code</mat-label>
          <input matInput [(ngModel)]="moduleCode" placeholder="M17" />
        </mat-form-field>

        <input #picker type="file" hidden (change)="onFileSelected(picker.files)" />
        <button mat-flat-button color="primary" (click)="picker.click()" [disabled]="upload()?.phase === 'uploading' || upload()?.phase === 'completing'">
          <mat-icon>upload_file</mat-icon> Pick file & upload
        </button>
      </div>

      @if (upload(); as u) {
        <div class="upload-status" [class.upload-status--err]="u.phase === 'error'">
          <mat-icon>{{ u.phase === 'done' ? 'check_circle' : u.phase === 'error' ? 'error_outline' : 'cloud_upload' }}</mat-icon>
          <div>
            <div><strong>{{ u.filename }}</strong> · {{ formatBytes(u.sizeBytes) }}</div>
            <div class="phase">{{ describePhase(u.phase) }}{{ u.message ? ': ' + u.message : '' }}</div>
          </div>
        </div>
      }
    </div>

    <div class="toolbar">
      <mat-form-field appearance="outline" class="filter">
        <mat-label>Filter by class</mat-label>
        <input matInput [(ngModel)]="filterClass" (keyup.enter)="reload()" placeholder="INVOICE, BOE, POD…" />
      </mat-form-field>
      <label class="check">
        <input type="checkbox" [(ngModel)]="includeDeleted" (change)="reload()" /> include deleted
      </label>
      <button mat-stroked-button (click)="reload()"><mat-icon>refresh</mat-icon> Reload</button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (error()) {
      <div class="error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Filename</th>
              <th>Class</th>
              <th>Container</th>
              <th>Size</th>
              <th>Created</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of rows(); track d.ulid) {
              <tr [class.deleted]="d.isDeleted">
                <td>
                  <div class="file-cell">
                    <mat-icon>description</mat-icon>
                    <div>
                      <div class="name">{{ d.filename }}</div>
                      <div class="ulid">{{ d.ulid }}</div>
                    </div>
                  </div>
                </td>
                <td><code>{{ d.classCode }}</code></td>
                <td>{{ d.container }}</td>
                <td>{{ formatBytes(d.sizeBytes) }}</td>
                <td>{{ d.createdAt | slice:0:19 }}</td>
                <td>
                  @if (d.isDeleted) {
                    <span class="badge badge--deleted">deleted</span>
                  } @else if (d.isImmutable) {
                    <span class="badge badge--worm">WORM</span>
                  } @else {
                    <span class="badge badge--active">active</span>
                  }
                </td>
                <td class="actions">
                  <button mat-icon-button (click)="download(d.ulid)" matTooltip="Download" [disabled]="d.isDeleted">
                    <mat-icon>download</mat-icon>
                  </button>
                  @if (d.isDeleted) {
                    <button mat-icon-button (click)="restore(d.ulid)" matTooltip="Restore">
                      <mat-icon>restore_from_trash</mat-icon>
                    </button>
                  } @else {
                    <button mat-icon-button (click)="del(d.ulid)" matTooltip="Soft-delete">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty">No documents yet. Upload one above.</td></tr>
            }
          </tbody>
        </table>
      </div>
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

    .quota {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      padding: 14px 18px; margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
    }
    .quota__row { display: flex; justify-content: space-between; color: #3F2D7C; font-size: 13px; margin-bottom: 8px; }

    .upload-card {
      background: #FFFFFF; border: 1px solid #E8E2F4; border-radius: 12px;
      padding: 16px 18px; margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(63, 45, 124, 0.06);
    }
    .upload-row { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .cls { width: 200px; } .mod { width: 160px; }

    .upload-status {
      display: flex; align-items: center; gap: 12px; margin-top: 12px;
      padding: 12px 14px; border-radius: 10px;
      background: #F5F2FB; color: #3F2D7C;
    }
    .upload-status mat-icon { color: #5B3FA0; }
    .upload-status--err { background: #FFF3F5; color: #B23F45; }
    .upload-status--err mat-icon { color: #D04E54; }
    .phase { color: #6B5BA0; font-size: 12px; }

    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .filter { width: 240px; }
    .check { display: inline-flex; gap: 6px; align-items: center; color: #6B5BA0; font-size: 13px; }

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
      border-bottom: 1px solid #E8E2F4;
    }
    tbody td { padding: 12px 16px; border-bottom: 1px solid #F0EBF8; color: #1A1A33; font-size: 13px; }
    tbody tr.deleted td { opacity: 0.55; }
    .actions { text-align: right; }
    .empty { text-align: center; color: #9A9AA3; padding: 32px !important; }

    .file-cell { display: flex; align-items: center; gap: 10px; }
    .file-cell mat-icon { color: #5B3FA0; }
    .name { font-weight: 600; }
    .ulid { color: #9A9AA3; font-size: 11px; font-family: 'SFMono-Regular', Consolas, monospace; }

    code { background: #F5F2FB; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }

    .badge { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
    .badge--active  { background: #DCF5E4; color: #1F7A3D; }
    .badge--worm    { background: #FFF3D6; color: #946100; }
    .badge--deleted { background: #FCDDE0; color: #B23F45; }
  `],
})
export class DocumentsListComponent implements OnInit {
  private readonly api = inject(M21ApiService);

  readonly rows    = signal<DocumentDto[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly upload  = signal<UiUploadState | null>(null);
  readonly quota   = signal<StorageQuotaDto | null>(null);

  classCode = 'SCAN';
  moduleCode = 'M21';
  filterClass = '';
  includeDeleted = false;

  readonly classCodes = [
    'INVOICE', 'BOE', 'SB', 'IGM', 'EWB', 'IRN', 'GSTR1', 'GSTR3B', 'TDS_CERT', 'FORM_16A', 'POD',
    '7501', 'ATM', 'ITN', 'AES', 'ISF', '1099_NEC', '1099_MISC', 'W2', '941',
    'AUDIT_REPORT', 'EXPORT', 'SCAN', 'AGREEMENT',
  ];

  async ngOnInit() {
    await Promise.all([this.reload(), this.refreshQuota()]);
  }

  async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.list({
        classCode: this.filterClass.trim() || undefined,
        includeDeleted: this.includeDeleted,
      });
      this.rows.set(res.items);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load documents');
    } finally {
      this.loading.set(false);
    }
  }

  async refreshQuota() {
    try { this.quota.set(await this.api.getQuota()); } catch { /* ignore */ }
  }

  async onFileSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    this.upload.set({ filename: file.name, sizeBytes: file.size, phase: 'hashing' });
    try {
      const sha = await this.api.sha256Hex(file);

      const init = await this.api.initUpload({
        classCode: this.classCode,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        checksumSha256: sha,
        moduleCode: this.moduleCode,
      });

      this.upload.set({ filename: file.name, sizeBytes: file.size, phase: 'uploading' });
      await this.api.uploadToPresignedUrl(init.uploadUrl, file);

      this.upload.set({ filename: file.name, sizeBytes: file.size, phase: 'completing' });
      await this.api.completeUpload(init.ulid, { checksumSha256: sha, sizeBytes: file.size });

      this.upload.set({ filename: file.name, sizeBytes: file.size, phase: 'done' });
      await Promise.all([this.reload(), this.refreshQuota()]);
    } catch (e: any) {
      this.upload.set({
        filename: file.name, sizeBytes: file.size,
        phase: 'error', message: e?.message ?? 'unknown error',
      });
    }
  }

  async download(ulid: string) {
    try {
      const r = await this.api.getDownloadUrl(ulid);
      window.open(r.url, '_blank');
    } catch (e: any) {
      this.error.set(e?.message ?? 'download failed');
    }
  }

  async del(ulid: string) {
    if (!confirm('Soft-delete this document? You can restore it within 30 days unless it is on legal hold.')) return;
    try { await this.api.softDelete(ulid); await this.reload(); }
    catch (e: any) { this.error.set(e?.message ?? 'delete failed'); }
  }

  async restore(ulid: string) {
    try { await this.api.restore(ulid); await this.reload(); }
    catch (e: any) { this.error.set(e?.message ?? 'restore failed'); }
  }

  formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`;
    return `${(n / 1024 ** 3).toFixed(2)} GB`;
  }

  describePhase(p: UiUploadState['phase']): string {
    return p === 'hashing'    ? 'computing SHA-256'
         : p === 'uploading'  ? 'uploading to MinIO'
         : p === 'completing' ? 'verifying with API'
         : p === 'done'       ? 'uploaded'
         :                      'failed';
  }
}
