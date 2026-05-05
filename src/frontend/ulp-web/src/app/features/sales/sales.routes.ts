import { Routes } from '@angular/router';

export const SALES_ROUTES: Routes = [
  { path: '',                          loadComponent: () => import('./sales-home.component').then(m => m.SalesHomeComponent) },

  // Leads
  { path: 'leads',                     loadComponent: () => import('./leads/leads-list.component').then(m => m.LeadsListComponent) },
  { path: 'leads/new',                 loadComponent: () => import('./leads/lead-form.component').then(m => m.LeadFormComponent) },
  { path: 'leads/:id/edit',            loadComponent: () => import('./leads/lead-form.component').then(m => m.LeadFormComponent) },

  // Opportunities
  { path: 'opportunities',             loadComponent: () => import('./opportunities/opportunities-list.component').then(m => m.OpportunitiesListComponent) },
  { path: 'opportunities/new',         loadComponent: () => import('./opportunities/opportunity-form.component').then(m => m.OpportunityFormComponent) },
  { path: 'opportunities/:id',         loadComponent: () => import('./opportunities/opportunity-detail.component').then(m => m.OpportunityDetailComponent) },
  { path: 'opportunities/:id/edit',    loadComponent: () => import('./opportunities/opportunity-form.component').then(m => m.OpportunityFormComponent) },

  // Activities
  { path: 'activities',                loadComponent: () => import('./activities/activities-list.component').then(m => m.ActivitiesListComponent) },
  { path: 'activities/new',            loadComponent: () => import('./activities/activity-form.component').then(m => m.ActivityFormComponent) },

  // Campaigns
  { path: 'campaigns',                 loadComponent: () => import('./campaigns/campaigns-list.component').then(m => m.CampaignsListComponent) },
  { path: 'campaigns/new',             loadComponent: () => import('./campaigns/campaign-form.component').then(m => m.CampaignFormComponent) },

  // RFQs
  { path: 'rfqs',                      loadComponent: () => import('./rfqs/rfqs-list.component').then(m => m.RfqsListComponent) },
  { path: 'rfqs/new',                  loadComponent: () => import('./rfqs/rfq-form.component').then(m => m.RfqFormComponent) },
  { path: 'rfqs/:id',                  loadComponent: () => import('./rfqs/rfq-detail.component').then(m => m.RfqDetailComponent) },

  // Read-only / unchanged
  { path: 'pipeline',                  loadComponent: () => import('./pipeline/pipeline-list.component').then(m => m.PipelineListComponent) },
];
