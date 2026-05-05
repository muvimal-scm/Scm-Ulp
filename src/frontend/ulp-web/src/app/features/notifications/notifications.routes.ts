import { Routes } from '@angular/router';

export const NOTIFICATIONS_ROUTES: Routes = [
  { path: '',            redirectTo: 'inbox', pathMatch: 'full' },
  { path: 'inbox',       loadComponent: () => import('./inbox/inbox.component').then(m => m.InboxComponent) },
  { path: 'preferences', loadComponent: () => import('./preferences/preferences.component').then(m => m.PreferencesComponent) },
  { path: 'rules',       loadComponent: () => import('./rules/rules.component').then(m => m.RulesComponent) },
];
