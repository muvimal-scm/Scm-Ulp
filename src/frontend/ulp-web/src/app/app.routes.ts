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
        path: 'master-data',
        loadChildren: () =>
          import('./features/master-data/master-data.routes').then((r) => r.MASTER_DATA_ROUTES),
      },
      {
        path: 'identity',
        loadChildren: () =>
          import('./features/identity/identity.routes').then((r) => r.IDENTITY_ROUTES),
      },
      {
        path: 'document-management',
        loadChildren: () =>
          import('./features/document-management/document-management.routes').then((r) => r.DOCUMENT_MANAGEMENT_ROUTES),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./features/notifications/notifications.routes').then((r) => r.NOTIFICATIONS_ROUTES),
      },
      {
        path: 'vendor-management',
        loadChildren: () =>
          import('./features/vendor-management/vendor-management.routes').then((r) => r.VENDOR_MANAGEMENT_ROUTES),
      },
      {
        path: 'pricing-quotation',
        loadChildren: () =>
          import('./features/pricing-quotation/pricing-quotation.routes').then((r) => r.PRICING_QUOTATION_ROUTES),
      },
      {
        path: 'document-generation',
        loadChildren: () =>
          import('./features/document-generation/document-generation.routes').then((r) => r.DOCUMENT_GENERATION_ROUTES),
      },
      {
        path: 'freight-forwarding',
        loadChildren: () =>
          import('./features/freight-forwarding/freight-forwarding.routes').then((r) => r.FREIGHT_FORWARDING_ROUTES),
      },
      {
        path: 'sales',
        loadChildren: () =>
          import('./features/sales/sales.routes').then((r) => r.SALES_ROUTES),
      },
      {
        path: 'procurement',
        loadChildren: () =>
          import('./features/procurement/procurement.routes').then((r) => r.PROCUREMENT_ROUTES),
      },
      {
        path: 'last-mile',
        loadChildren: () =>
          import('./features/last-mile/last-mile.routes').then((r) => r.LAST_MILE_ROUTES),
      },
      {
        path: 'accounting',
        loadChildren: () =>
          import('./features/accounting/accounting.routes').then((r) => r.ACCOUNTING_ROUTES),
      },
      {
        path: 'customs',
        loadChildren: () =>
          import('./features/customs/customs.routes').then((r) => r.CUSTOMS_ROUTES),
      },
      {
        path: 'control-tower',
        loadComponent: () =>
          import('./features/control-tower/control-tower.component').then((m) => m.ControlTowerComponent),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then((r) => r.REPORTS_ROUTES),
      },
      {
        path: 'trucking',
        loadChildren: () =>
          import('./features/trucking/trucking.routes').then((r) => r.TRUCKING_ROUTES),
      },
      {
        path: 'wms',
        loadChildren: () =>
          import('./features/wms/wms.routes').then((r) => r.WMS_ROUTES),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
