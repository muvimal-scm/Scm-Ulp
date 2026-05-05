import { Routes } from '@angular/router';

export const M14_ROUTES: Routes = [
  { path: '',                 loadComponent: () => import('./m14-home.component').then(m => m.M14HomeComponent) },
  { path: 'rate-cards',       loadComponent: () => import('./rate-cards/rate-cards-list.component').then(m => m.RateCardsListComponent) },
  { path: 'rate-cards/:id',   loadComponent: () => import('./rate-cards/rate-card-detail.component').then(m => m.RateCardDetailComponent) },
  { path: 'quotes',           loadComponent: () => import('./quotes/quotes-list.component').then(m => m.QuotesListComponent) },
  { path: 'quotes/:id',       loadComponent: () => import('./quotes/quote-detail.component').then(m => m.QuoteDetailComponent) },
  { path: 'surcharges',       loadComponent: () => import('./surcharges/surcharges-list.component').then(m => m.SurchargesListComponent) },
  { path: 'contracts',        loadComponent: () => import('./contracts/contracts-list.component').then(m => m.ContractsListComponent) },
];
