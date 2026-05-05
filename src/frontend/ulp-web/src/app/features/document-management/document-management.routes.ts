import { Routes } from '@angular/router';

export const DOCUMENT_MANAGEMENT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./documents-list.component').then(m => m.DocumentsListComponent) },
];
