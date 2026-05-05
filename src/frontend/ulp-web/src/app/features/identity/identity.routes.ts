import { Routes } from '@angular/router';

export const IDENTITY_ROUTES: Routes = [
  { path: '',         loadComponent: () => import('./identity-home.component').then(m => m.IdentityHomeComponent) },
  { path: 'me',       loadComponent: () => import('./me/me.component').then(m => m.MeComponent) },
  { path: 'users',          loadComponent: () => import('./users/users-list.component').then(m => m.UsersListComponent) },
  { path: 'users/invite',   loadComponent: () => import('./users/invite-form.component').then(m => m.InviteUserFormComponent) },
  { path: 'roles',          loadComponent: () => import('./roles/roles-list.component').then(m => m.RolesListComponent) },
  { path: 'roles/new',      loadComponent: () => import('./roles/role-form.component').then(m => m.RoleFormComponent) },
  { path: 'api-keys', loadComponent: () => import('./api-keys/api-keys-list.component').then(m => m.ApiKeysListComponent) },
];
