import { Routes } from '@angular/router';

export const M26_ROUTES: Routes = [
  { path: '',         loadComponent: () => import('./m26-home.component').then(m => m.M26HomeComponent) },
  { path: 'me',       loadComponent: () => import('./me/me.component').then(m => m.MeComponent) },
  { path: 'users',    loadComponent: () => import('./users/users-list.component').then(m => m.UsersListComponent) },
  { path: 'roles',    loadComponent: () => import('./roles/roles-list.component').then(m => m.RolesListComponent) },
  { path: 'api-keys', loadComponent: () => import('./api-keys/api-keys-list.component').then(m => m.ApiKeysListComponent) },
];
