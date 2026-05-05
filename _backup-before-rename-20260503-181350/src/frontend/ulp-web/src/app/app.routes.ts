import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'm1',
        loadChildren: () =>
          import('./features/m1-master-data/m1.routes').then((r) => r.M1_ROUTES),
      },
      {
        path: 'm26',
        loadChildren: () =>
          import('./features/m26-rbac/m26.routes').then((r) => r.M26_ROUTES),
      },
      {
        path: 'm21',
        loadChildren: () =>
          import('./features/m21-documents/m21.routes').then((r) => r.M21_ROUTES),
      },
      {
        path: 'm27',
        loadChildren: () =>
          import('./features/m27-notifications/m27.routes').then((r) => r.M27_ROUTES),
      },
      {
        path: 'm3',
        loadChildren: () =>
          import('./features/m3-vendors/m3.routes').then((r) => r.M3_ROUTES),
      },
      {
        path: 'm14',
        loadChildren: () =>
          import('./features/m14-pricing/m14.routes').then((r) => r.M14_ROUTES),
      },
      {
        path: 'm6',
        loadChildren: () =>
          import('./features/m6-doc-generation/m6.routes').then((r) => r.M6_ROUTES),
      },
      {
        path: 'm5',
        loadChildren: () =>
          import('./features/m5-freight/m5.routes').then((r) => r.M5_ROUTES),
      },
      {
        path: 'm2',
        loadChildren: () =>
          import('./features/m2-crm/m2.routes').then((r) => r.M2_ROUTES),
      },
      {
        path: 'm7',
        loadChildren: () =>
          import('./features/m7-procurement/m7.routes').then((r) => r.M7_ROUTES),
      },
      {
        path: 'm9',
        loadChildren: () =>
          import('./features/m9-lastmile/m9.routes').then((r) => r.M9_ROUTES),
      },
      {
        path: 'm17',
        loadChildren: () =>
          import('./features/m17-accounts/m17.routes').then((r) => r.M17_ROUTES),
      },
      {
        path: 'm4',
        loadChildren: () =>
          import('./features/m4-customs/m4.routes').then((r) => r.M4_ROUTES),
      },
      {
        path: 'control-tower',
        loadComponent: () =>
          import('./features/control-tower/control-tower.component').then((m) => m.ControlTowerComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
