import { Routes } from '@angular/router';

export const M3_ROUTES: Routes = [
  { path: '',     loadComponent: () => import('./vendors-list.component').then(m => m.VendorsListComponent) },
  { path: ':id',  loadComponent: () => import('./vendor-detail.component').then(m => m.VendorDetailComponent) },
];
