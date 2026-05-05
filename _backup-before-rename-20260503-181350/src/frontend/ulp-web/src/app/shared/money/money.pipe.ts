import { Pipe, PipeTransform, inject } from '@angular/core';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { Money, formatMoney } from './money';

/**
 * Format a Money value in the current tenant's locale.
 * Usage: <span>{{ invoice.total | ulpMoney }}</span>
 */
@Pipe({ name: 'ulpMoney', standalone: true, pure: false })
export class UlpMoneyPipe implements PipeTransform {
  private readonly tenant = inject(TenantContextService);

  transform(value: Money | null | undefined): string {
    if (!value) return '';
    return formatMoney(value, this.tenant.locale());
  }
}
