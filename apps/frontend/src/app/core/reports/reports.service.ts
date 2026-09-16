import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { ExpensesByCategoryReport, IncomeVsExpensesReport } from './reports.model';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly http = inject(HttpClient);

  getExpensesByCategory(from?: string, to?: string): Observable<ExpensesByCategoryReport> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<ExpensesByCategoryReport>(`${API_BASE_URL}/reports/expenses`, { params });
  }

  getIncomeVsExpenses(from?: string, to?: string): Observable<IncomeVsExpensesReport> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<IncomeVsExpensesReport>(`${API_BASE_URL}/reports/income-vs-expenses`, { params });
  }
}
