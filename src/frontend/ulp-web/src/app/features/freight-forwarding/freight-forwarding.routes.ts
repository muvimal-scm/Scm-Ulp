import { Routes } from '@angular/router';

export const FREIGHT_FORWARDING_ROUTES: Routes = [
  { path: '',                  loadComponent: () => import('./freight-forwarding-home.component').then(m => m.FreightForwardingHomeComponent) },
  { path: 'bookings',          loadComponent: () => import('./bookings/bookings-list.component').then(m => m.BookingsListComponent) },
  { path: 'bookings/new',      loadComponent: () => import('./bookings/booking-form.component').then(m => m.BookingFormComponent) },
  { path: 'bookings/:id',      loadComponent: () => import('./bookings/booking-detail.component').then(m => m.BookingDetailComponent) },
  { path: 'shipments',         loadComponent: () => import('./shipments/shipments-list.component').then(m => m.ShipmentsListComponent) },
  { path: 'shipments/new',     loadComponent: () => import('./shipments/shipment-form.component').then(m => m.ShipmentFormComponent) },
  { path: 'shipments/:id',     loadComponent: () => import('./shipments/shipment-detail.component').then(m => m.ShipmentDetailComponent) },
  { path: 'consols',           loadComponent: () => import('./consols/consols-list.component').then(m => m.ConsolsListComponent) },
  { path: 'demurrage',         loadComponent: () => import('./demurrage/demurrage-list.component').then(m => m.DemurrageListComponent) },
  { path: 'reminders',         loadComponent: () => import('./reminders/reminders-list.component').then(m => m.RemindersListComponent) },
];
