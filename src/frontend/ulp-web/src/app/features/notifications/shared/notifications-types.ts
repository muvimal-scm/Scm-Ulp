export type Channel = 'Email' | 'Sms' | 'Whatsapp' | 'InApp' | 'Webhook';
export type DigestFrequency = 'Immediate' | 'Hourly' | 'Daily' | 'Weekly' | 'Off';

export interface InboxItemDto {
  id: number;
  notificationId: number | null;
  title: string;
  body: string;
  linkUrl: string | null;
  icon: string | null;
  category: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface PreferenceDto {
  category: string;
  channel: Channel;
  isSubscribed: boolean;
  digestFrequency: DigestFrequency;
}

export interface TemplateDto {
  id: number;
  tenantId: number | null;
  countryCode: string | null;
  code: string;
  channel: Channel;
  locale: string;
  subject: string | null;
  isHtml: boolean;
  isActive: boolean;
  version: number;
}

export interface EmailSendTestResult {
  success: boolean;
  provider: string;
  messageId: string | null;
  error: string | null;
}
