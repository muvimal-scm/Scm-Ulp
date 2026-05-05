import { Routes } from '@angular/router';

export const DOCUMENT_GENERATION_ROUTES: Routes = [
  { path: '',                loadComponent: () => import('./document-generation-home.component').then(m => m.DocumentGenerationHomeComponent) },
  { path: 'templates',       loadComponent: () => import('./templates/templates-list.component').then(m => m.TemplatesListComponent) },
  { path: 'templates/new',   loadComponent: () => import('./templates/template-form.component').then(m => m.TemplateFormComponent) },
  { path: 'templates/:id',   loadComponent: () => import('./templates/template-detail.component').then(m => m.TemplateDetailComponent) },
  { path: 'render-test',     loadComponent: () => import('./render-test/render-test.component').then(m => m.RenderTestComponent) },
  { path: 'history',         loadComponent: () => import('./history/history.component').then(m => m.HistoryComponent) },
];
