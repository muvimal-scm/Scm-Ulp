import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EmailSendTestResult, InboxItemDto, PreferenceDto, TemplateDto } from './notifications-types';

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/notifications`;

  /* Inbox */
  getInbox(opts: { includeRead?: boolean; page?: number; pageSize?: number } = {}): Promise<InboxItemDto[]> {
    let p = new HttpParams();
    p = p.set('includeRead', opts.includeRead ? 'true' : 'false');
    p = p.set('page', String(opts.page ?? 1));
    p = p.set('pageSize', String(opts.pageSize ?? 50));
    return firstValueFrom(this.http.get<InboxItemDto[]>(`${this.base}/inbox`, { params: p }));
  }

  markRead(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/inbox/${id}/read`, {}));
  }

  markAllRead(): Promise<{ marked: number }> {
    return firstValueFrom(this.http.post<{ marked: number }>(`${this.base}/inbox/read-all`, {}));
  }

  /* Preferences */
  getPreferences(): Promise<PreferenceDto[]> {
    return firstValueFrom(this.http.get<PreferenceDto[]>(`${this.base}/preferences`));
  }

  upsertPreference(p: PreferenceDto): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.base}/preferences`, p));
  }

  /* Templates */
  listTemplates(channel?: string): Promise<TemplateDto[]> {
    let p = new HttpParams();
    if (channel) p = p.set('channel', channel);
    return firstValueFrom(this.http.get<TemplateDto[]>(`${this.base}/templates`, { params: p }));
  }

  /* Send test */
  sendTestEmail(to: string): Promise<EmailSendTestResult> {
    return firstValueFrom(this.http.post<EmailSendTestResult>(`${this.base}/providers/email/test`, { to }));
  }
}
