import { Routes } from '@angular/router';

export const VENDOR_MANAGEMENT_ROUTES: Routes = [
  { path: '',                     loadComponent: () => import('./vendors-list.component').then(m => m.VendorsListComponent) },
  { path: 'new',                  loadComponent: () => import('./vendor-form.component').then(m => m.VendorFormComponent) },
  { path: 'ncrs/new',             loadComponent: () => import('./ncr-form.component').then(m => m.NcrFormComponent) },
  { path: ':id/agreements/new',   loadComponent: () => import('./agreement-form.component').then(m => m.AgreementFormComponent) },
  { path: ':id',                  loadComponent: () => import('./vendor-detail.component').then(m => m.VendorDetailComponent) },
];
