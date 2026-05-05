import { Routes } from '@angular/router';

export const M9_ROUTES: Routes = [
  { path: '',                loadComponent: () => import('./m9-home.component').then(m => m.M9HomeComponent) },
  { path: 'bookings',        loadComponent: () => import('./bookings/bookings-list.component').then(m => m.BookingsListComponent) },
  { path: 'bookings/:id',    loadComponent: () => import('./bookings/booking-detail.component').then(m => m.BookingDetailComponent) },
  { path: 'routes',          loadComponent: () => import('./routes/routes-list.component').then(m => m.RoutesListComponent) },
  { path: 'manifests',       loadComponent: () => import('./manifests/manifests-list.component').then(m => m.ManifestsListComponent) },
  { path: 'pods',            loadComponent: () => import('./pods/pods-list.component').then(m => m.PodsListComponent) },
  { path: 'cod',             loadComponent: () => import('./cod/cod-list.component').then(m => m.CodListComponent) },
  { path: 'zone-rates',      loadComponent: () => import('./zones/zones-list.component').then(m => m.ZonesListComponent) },
];
