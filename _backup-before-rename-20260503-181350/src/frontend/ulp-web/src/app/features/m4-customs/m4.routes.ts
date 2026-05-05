import { Routes } from '@angular/router';

export const M4_ROUTES: Routes = [
  { path: '',                 loadComponent: () => import('./m4-home.component').then(m => m.M4HomeComponent) },
  { path: 'entries',          loadComponent: () => import('./entries/entries-list.component').then(m => m.EntriesListComponent) },
  { path: 'entries/:id',      loadComponent: () => import('./entries/entry-detail.component').then(m => m.EntryDetailComponent) },
  { path: 'bonds',            loadComponent: () => import('./bonds/bonds-list.component').then(m => m.BondsListComponent) },
  { path: 'atm',              loadComponent: () => import('./atm/atm-list.component').then(m => m.AtmListComponent) },
  { path: 'release-orders',   loadComponent: () => import('./release-orders/release-orders-list.component').then(m => m.ReleaseOrdersListComponent) },
  { path: 'isf',              loadComponent: () => import('./isf/isf-list.component').then(m => m.IsfListComponent) },
  { path: 'holds',            loadComponent: () => import('./holds/holds-page.component').then(m => m.HoldsPageComponent) },
  { path: 'in-bond',          loadComponent: () => import('./in-bond/in-bond-list.component').then(m => m.InBondListComponent) },
  { path: 'abi-messages',     loadComponent: () => import('./abi/abi-messages-list.component').then(m => m.AbiMessagesListComponent) },
];
