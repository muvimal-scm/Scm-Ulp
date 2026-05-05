import { Routes } from '@angular/router';

export const M2_ROUTES: Routes = [
  { path: '',                      loadComponent: () => import('./m2-home.component').then(m => m.M2HomeComponent) },
  { path: 'leads',                 loadComponent: () => import('./leads/leads-list.component').then(m => m.LeadsListComponent) },
  { path: 'opportunities',         loadComponent: () => import('./opportunities/opportunities-list.component').then(m => m.OpportunitiesListComponent) },
  { path: 'opportunities/:id',     loadComponent: () => import('./opportunities/opportunity-detail.component').then(m => m.OpportunityDetailComponent) },
  { path: 'activities',            loadComponent: () => import('./activities/activities-list.component').then(m => m.ActivitiesListComponent) },
  { path: 'campaigns',             loadComponent: () => import('./campaigns/campaigns-list.component').then(m => m.CampaignsListComponent) },
  { path: 'rfqs',                  loadComponent: () => import('./rfqs/rfqs-list.component').then(m => m.RfqsListComponent) },
  { path: 'rfqs/:id',              loadComponent: () => import('./rfqs/rfq-detail.component').then(m => m.RfqDetailComponent) },
  { path: 'pipeline',              loadComponent: () => import('./pipeline/pipeline-list.component').then(m => m.PipelineListComponent) },
];
