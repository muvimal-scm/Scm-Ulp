import { Routes } from '@angular/router';

export const TRUCKING_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./trucking-home.component').then(m => m.TruckingHomeComponent) },
  { path: 'jobs', loadComponent: () => import('./jobs/jobs-board.component').then(m => m.JobsBoardComponent) },
  { path: 'jobs/:id', loadComponent: () => import('./jobs/job-detail.component').then(m => m.JobDetailComponent) },
  { path: 'drivers', loadComponent: () => import('./drivers/drivers-list.component').then(m => m.DriversListComponent) },
  { path: 'trucks', loadComponent: () => import('./equipment/trucks-list.component').then(m => m.TrucksListComponent) },
  { path: 'chassis', loadComponent: () => import('./equipment/chassis-list.component').then(m => m.ChassisListComponent) },
  { path: 'maintenance', loadComponent: () => import('./maintenance/maintenance-list.component').then(m => m.MaintenanceListComponent) },
];
