import { Routes } from '@angular/router';

export const PROCUREMENT_ROUTES: Routes = [
  { path: '',                       loadComponent: () => import('./procurement-home.component').then(m => m.ProcurementHomeComponent) },
  { path: 'purchase-requests',      loadComponent: () => import('./prs/prs-list.component').then(m => m.PrsListComponent) },
  { path: 'purchase-requests/new',  loadComponent: () => import('./prs/pr-form.component').then(m => m.PrFormComponent) },
  { path: 'purchase-requests/:id',  loadComponent: () => import('./prs/pr-detail.component').then(m => m.PrDetailComponent) },
  { path: 'rfqs',                   loadComponent: () => import('./rfqs/rfqs-list.component').then(m => m.RfqsListComponent) },
  { path: 'rfqs/new',               loadComponent: () => import('./rfqs/rfq-form.component').then(m => m.ProcurementRfqFormComponent) },
  { path: 'rfqs/:id',               loadComponent: () => import('./rfqs/rfq-detail.component').then(m => m.RfqDetailComponent) },
  { path: 'purchase-orders',        loadComponent: () => import('./pos/pos-list.component').then(m => m.PosListComponent) },
  { path: 'purchase-orders/new',    loadComponent: () => import('./pos/po-form.component').then(m => m.PoFormComponent) },
  { path: 'purchase-orders/:id',    loadComponent: () => import('./pos/po-detail.component').then(m => m.PoDetailComponent) },
  { path: 'grns',                   loadComponent: () => import('./grns/grns-list.component').then(m => m.GrnsListComponent) },
  { path: 'grns/new',               loadComponent: () => import('./grns/grn-form.component').then(m => m.GrnFormComponent) },
  { path: 'invoice-matches',        loadComponent: () => import('./matches/matches-list.component').then(m => m.MatchesListComponent) },
];
