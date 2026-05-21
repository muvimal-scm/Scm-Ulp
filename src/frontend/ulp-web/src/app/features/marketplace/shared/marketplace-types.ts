export type StockStatus = 'InStock' | 'SoldOut' | 'ReadyForShipping';
export type CatalogSection = 'All' | 'New' | 'Trending' | 'Seasonal' | 'RecentlyOrdered';

export interface CatalogProduct {
  id: number;
  productCode: string;
  productName: string;
  description?: string;
  imageUrl?: string;
  unitPrice: number;
  currency: string;
  stockStatus: StockStatus;
  availableQty?: number;
  leadTimeDays?: number;
  moq?: number;
  certifications: string[];
  section: CatalogSection[];
  supplierId: number;
  supplierName: string;
}

export interface CartItem { product: CatalogProduct; quantity: number; }
