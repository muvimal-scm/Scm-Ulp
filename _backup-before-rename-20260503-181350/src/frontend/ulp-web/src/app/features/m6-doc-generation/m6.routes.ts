import { Routes } from '@angular/router';

export const M6_ROUTES: Routes = [
  { path: '',                loadComponent: () => import('./m6-home.component').then(m => m.M6HomeComponent) },
  { path: 'templates',       loadComponent: () => import('./templates/templates-list.component').then(m => m.TemplatesListComponent) },
  { path: 'templates/:id',   loadComponent: () => import('./templates/template-detail.component').then(m => m.TemplateDetailComponent) },
  { path: 'render-test',     loadComponent: () => import('./render-test/render-test.component').then(m => m.RenderTestComponent) },
  { path: 'history',         loadComponent: () => import('./history/history.component').then(m => m.HistoryComponent) },
];
