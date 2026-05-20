import { Routes } from '@angular/router';

export const LAST_MILE_ROUTES: Routes = [
  { path: '',                loadComponent: () => import('./last-mile-home.component').then(m => m.LastMileHomeComponent) },
  { path: 'bookings',        loadComponent: () => import('./bookings/bookings-list.component').then(m => m.BookingsListComponent) },
  { path: 'bookings/new',    loadComponent: () => import('./bookings/booking-form.component').then(m => m.CourierBookingFormComponent) },
  { path: 'bookings/:id',    loadComponent: () => import('./bookings/booking-detail.component').then(m => m.BookingDetailComponent) },
  { path: 'routes',          loadComponent: () => import('./routes/routes-list.component').then(m => m.RoutesListComponent) },
  { path: 'routes/new',      loadComponent: () => import('./routes/route-form.component').then(m => m.RouteFormComponent) },
  { path: 'manifests',       loadComponent: () => import('./manifests/manifests-list.component').then(m => m.ManifestsListComponent) },
  { path: 'pods',            loadComponent: () => import('./pods/pods-list.component').then(m => m.PodsListComponent) },
  { path: 'pods/new',        loadComponent: () => import('./pods/pod-form.component').then(m => m.PodFormComponent) },
  { path: 'cod',             loadComponent: () => import('./cod/cod-list.component').then(m => m.CodListComponent) },
  { path: 'cod/new',         loadComponent: () => import('./cod/cod-form.component').then(m => m.CodFormComponent) },
  { path: 'zone-rates',      loadComponent: () => import('./zones/zones-list.component').then(m => m.ZonesListComponent) },
  { path: 'ocean-drayage',   loadComponent: () => import('./drayage/drayage-list.component').then(m => m.DrayageListComponent) },
  { path: 'ocean-drayage/new', loadComponent: () => import('./drayage/drayage-form.component').then(m => m.DrayageFormComponent) },
  { path: 'ocean-drayage/:id/edit', loadComponent: () => import('./drayage/drayage-form.component').then(m => m.DrayageFormComponent) },
  { path: 'otr',             loadComponent: () => import('./otr/otr-list.component').then(m => m.OtrListComponent) },
  { path: 'otr/new',         loadComponent: () => import('./otr/otr-form.component').then(m => m.OtrFormComponent) },
  { path: 'otr/:id/edit',    loadComponent: () => import('./otr/otr-form.component').then(m => m.OtrFormComponent) },
];
