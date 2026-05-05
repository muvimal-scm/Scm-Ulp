import { Routes } from '@angular/router';

export const M7_ROUTES: Routes = [
  { path: '',                       loadComponent: () => import('./m7-home.component').then(m => m.M7HomeComponent) },
  { path: 'purchase-requests',      loadComponent: () => import('./prs/prs-list.component').then(m => m.PrsListComponent) },
  { path: 'purchase-requests/:id',  loadComponent: () => import('./prs/pr-detail.component').then(m => m.PrDetailComponent) },
  { path: 'rfqs',                   loadComponent: () => import('./rfqs/rfqs-list.component').then(m => m.RfqsListComponent) },
  { path: 'rfqs/:id',               loadComponent: () => import('./rfqs/rfq-detail.component').then(m => m.RfqDetailComponent) },
  { path: 'purchase-orders',        loadComponent: () => import('./pos/pos-list.component').then(m => m.PosListComponent) },
  { path: 'purchase-orders/:id',    loadComponent: () => import('./pos/po-detail.component').then(m => m.PoDetailComponent) },
  { path: 'grns',                   loadComponent: () => import('./grns/grns-list.component').then(m => m.GrnsListComponent) },
  { path: 'invoice-matches',        loadComponent: () => import('./matches/matches-list.component').then(m => m.MatchesListComponent) },
];
