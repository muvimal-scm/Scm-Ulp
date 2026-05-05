import { Routes } from '@angular/router';

export const M17_ROUTES: Routes = [
  { path: '',          loadComponent: () => import('./m17-home.component').then(m => m.M17HomeComponent) },
  { path: 'accounts',  loadComponent: () => import('./accounts/accounts-list.component').then(m => m.AccountsListComponent) },
  { path: 'periods',   loadComponent: () => import('./periods/periods-list.component').then(m => m.PeriodsListComponent) },
  { path: 'invoices',  loadComponent: () => import('./invoices/invoices-list.component').then(m => m.InvoicesListComponent) },
  { path: 'invoices/:id', loadComponent: () => import('./invoices/invoice-detail.component').then(m => m.InvoiceDetailComponent) },
  { path: 'bills',     loadComponent: () => import('./bills/bills-list.component').then(m => m.BillsListComponent) },
  { path: 'bills/:id', loadComponent: () => import('./bills/bill-detail.component').then(m => m.BillDetailComponent) },
  { path: 'receipts',  loadComponent: () => import('./receipts/receipts-list.component').then(m => m.ReceiptsListComponent) },
  { path: 'payments',  loadComponent: () => import('./payments/payments-list.component').then(m => m.PaymentsListComponent) },
  { path: 'reports',   loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent) },

  // M17 finish — Milestone 3 closure
  { path: 'banking',           loadComponent: () => import('./banking/banking-hub.component').then(m => m.BankingHubComponent) },
  { path: 'settlement',        loadComponent: () => import('./settlement/settlement-list.component').then(m => m.SettlementListComponent) },
  { path: 'past-due',          loadComponent: () => import('./past-due/past-due-list.component').then(m => m.PastDueListComponent) },
  { path: 'email-templates',   loadComponent: () => import('./email-templates/email-templates-list.component').then(m => m.EmailTemplatesListComponent) },
  { path: 'comparative-profit',loadComponent: () => import('./comparative-profit/comparative-profit.component').then(m => m.ComparativeProfitComponent) },
  { path: 'general-expense',   loadComponent: () => import('./general-expense/general-expense-list.component').then(m => m.GeneralExpenseListComponent) },
];
