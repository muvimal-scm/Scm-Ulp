import { Routes } from '@angular/router';

export const MARKETPLACE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./marketplace-home.component').then(m => m.MarketplaceHomeComponent),
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./catalog/catalog.component').then(m => m.CatalogComponent),
  },
];
