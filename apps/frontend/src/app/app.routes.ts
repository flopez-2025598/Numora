import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { IncomeComponent } from './features/income/income.component';
import { ExpensesComponent } from './features/expenses/expenses.component';
import { BudgetsComponent } from './features/budgets/budgets.component';
import { TaxesComponent } from './features/taxes/taxes.component';
import { EmergencyFundComponent } from './features/emergency-fund/emergency-fund.component';
import { ReportsComponent } from './features/reports/reports.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'ingresos',
    component: IncomeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'gastos',
    component: ExpensesComponent,
    canActivate: [authGuard],
  },
  {
    path: 'presupuestos',
    component: BudgetsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'impuestos',
    component: TaxesComponent,
    canActivate: [authGuard],
  },
  {
    path: 'fondo-de-emergencia',
    component: EmergencyFundComponent,
    canActivate: [authGuard],
  },
  {
    path: 'reportes',
    component: ReportsComponent,
    canActivate: [authGuard],
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];
