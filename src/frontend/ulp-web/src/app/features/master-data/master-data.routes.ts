import { Routes } from '@angular/router';

/**
 * M1 Master Data routes â€” all under /app/m1.
 * Lazy-loaded; each component is standalone.
 */
export const MASTER_DATA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./master-data-home.component').then(m => m.MasterDataHomeComponent),
  },
  // Parties
  {
    path: 'parties',
    loadComponent: () => import('./parties/party-list.component').then(m => m.PartyListComponent),
  },
  {
    path: 'parties/new',
    loadComponent: () => import('./parties/party-form.component').then(m => m.PartyFormComponent),
  },
  {
    path: 'parties/:id',
    loadComponent: () => import('./parties/party-form.component').then(m => m.PartyFormComponent),
  },
  // SCM Milestone 1 â€” Profile Detail (POAs, permits, misc docs)
  {
    path: 'parties/:id/profile',
    loadComponent: () => import('./parties/party-profile.component').then(m => m.PartyProfileComponent),
  },
  // Products
  {
    path: 'products',
    loadComponent: () => import('./products/product-list.component').then(m => m.ProductListComponent),
  },
  {
    path: 'products/new',
    loadComponent: () => import('./products/product-form.component').then(m => m.ProductFormComponent),
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./products/product-form.component').then(m => m.ProductFormComponent),
  },
  // Reference data (read-only viewers)
  {
    path: 'countries',
    loadComponent: () => import('./reference/reference-pages').then(m => m.CountriesComponent),
  },
  {
    path: 'states',
    loadComponent: () => import('./reference/reference-pages').then(m => m.StatesComponent),
  },
  {
    path: 'currencies',
    loadComponent: () => import('./reference/reference-pages').then(m => m.CurrenciesComponent),
  },
  {
    path: 'uoms',
    loadComponent: () => import('./reference/reference-pages').then(m => m.UomsComponent),
  },
  {
    path: 'ports',
    loadComponent: () => import('./reference/reference-pages').then(m => m.PortsComponent),
  },
  {
    path: 'holidays',
    loadComponent: () => import('./reference/reference-pages').then(m => m.HolidaysComponent),
  },
];
