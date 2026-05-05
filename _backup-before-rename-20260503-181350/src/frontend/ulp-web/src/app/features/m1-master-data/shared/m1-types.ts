/**
 * M1 Master Data — TypeScript types mirroring the backend DTOs.
 * Strictly per ulpReq/ULP_LLD_M1_v2.0_MasterData.docx.
 *
 * Money is { amount: string; currency: string } per the SCMCube wire contract
 * — see src/app/shared/money/money.ts.
 */
import { Money } from '../../../shared/money/money';

/* ------------------------------------------------------------------ */
/*  Enums (mirror backend enum string values)                         */
/* ------------------------------------------------------------------ */

export type PartyType =
  | 'Customer' | 'Vendor' | 'Carrier' | 'Broker' | 'Bank'
  | 'GovernmentAgency' | 'Employee' | 'Other';

export const PartyTypes: PartyType[] = [
  'Customer', 'Vendor', 'Carrier', 'Broker', 'Bank',
  'GovernmentAgency', 'Employee', 'Other',
];

export type ProductTypeKind = 'Goods' | 'Service' | 'Bundle';
export const ProductTypeKinds: ProductTypeKind[] = ['Goods', 'Service', 'Bundle'];

export type AddressType =
  | 'Billing' | 'Shipping' | 'Office' | 'Warehouse' | 'Mailing' | 'TaxRegistered';

export type IdentifierValidationStatus = 'Pending' | 'Valid' | 'Invalid' | 'Expired';

export type PortTypeKind = 'Sea' | 'Air' | 'Land' | 'Rail' | 'Multimodal';

/* ------------------------------------------------------------------ */
/*  Entities                                                          */
/* ------------------------------------------------------------------ */

export interface PartyIdentifier {
  id: number;
  identifierType: string;
  identifierValue: string;
  isPrimary: boolean;
  validationStatus: IdentifierValidationStatus;
  validationSource?: string | null;
  validatedAtUtc?: string | null;
  expiresAtUtc?: string | null;
}

export interface Party {
  id: number;
  countryCode: string;
  partyType: PartyType;
  legalName: string;
  tradeName?: string | null;
  parentPartyId?: number | null;
  isActive: boolean;
  preferredLocale?: string | null;
  preferredCurrency?: string | null;
  defaultPaymentTerms?: string | null;
  creditLimit?: Money | null;
  taxStatus?: string | null;
  sanctionsScreened: boolean;
  sanctionsScreenedAtUtc?: string | null;
  createdAtUtc: string;
  modifiedAtUtc: string;
  identifiers: PartyIdentifier[];
}

export interface CreatePartyRequest {
  countryCode: string;
  partyType: PartyType;
  legalName: string;
  tradeName?: string | null;
  parentPartyId?: number | null;
  preferredLocale?: string | null;
  preferredCurrency?: string | null;
  defaultPaymentTerms?: string | null;
  creditLimit?: Money | null;
  taxStatus?: string | null;
  identifiers?: { identifierType: string; identifierValue: string; isPrimary: boolean }[];
}

export interface UpdatePartyRequest {
  partyType: PartyType;
  legalName: string;
  tradeName?: string | null;
  parentPartyId?: number | null;
  isActive: boolean;
  preferredLocale?: string | null;
  preferredCurrency?: string | null;
  defaultPaymentTerms?: string | null;
  creditLimit?: Money | null;
  taxStatus?: string | null;
}

export interface Product {
  id: number;
  countryCode?: string | null;
  productCode: string;
  productName: string;
  productDescription?: string | null;
  productType: ProductTypeKind;
  uomCode: string;
  weightKg?: number | null;
  volumeCbm?: number | null;
  hsCode?: string | null;
  hsnCode?: string | null;
  htsusCode?: string | null;
  scheduleBCode?: string | null;
  taxClass?: string | null;
  countryOfOrigin?: string | null;
  isHazmat: boolean;
  isPerishable: boolean;
  isTemperatureControlled: boolean;
  isDualUse: boolean;
  createdAtUtc: string;
  modifiedAtUtc: string;
}

export interface CreateProductRequest extends Omit<Product, 'id' | 'createdAtUtc' | 'modifiedAtUtc'> {}
export interface UpdateProductRequest extends Omit<Product, 'id' | 'productCode' | 'countryCode' | 'createdAtUtc' | 'modifiedAtUtc'> {}

/* ------------------------------------------------------------------ */
/*  Reference data                                                    */
/* ------------------------------------------------------------------ */

export interface Country {
  code: string; code3: string; numericCode: number; name: string;
  region?: string | null; defaultCurrency: string; defaultLocale: string;
  defaultTimeZone: string; isSupported: boolean;
}

export interface StateOrProvince {
  id: number; countryCode: string; code: string; name: string;
  isSpecial: boolean; capitalCity?: string | null; timeZone?: string | null;
}

export interface Currency {
  code: string; numericCode?: number | null; name: string; symbol?: string | null;
  decimalDigits: number; defaultCountry?: string | null; isActive: boolean;
}

export interface Uom {
  code: string; name: string; category: string;
  baseFactor?: number | null; baseUomCode?: string | null; isActive: boolean;
}

export interface Port {
  id: number; unLocode: string; countryCode: string; name: string;
  portType: PortTypeKind; cbpScheduleD?: string | null; isActive: boolean;
}

export interface Holiday {
  id: number; countryCode: string; stateCode?: string | null;
  holidayDate: string; name: string; isObserved: boolean;
}

/* ------------------------------------------------------------------ */
/*  Pagination wrapper                                                */
/* ------------------------------------------------------------------ */

export interface PagedList<T> {
  items: T[]; page: number; pageSize: number; totalCount: number;
}
