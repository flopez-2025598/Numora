import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { Budget, CreateBudgetRequest, UpdateBudgetRequest } from './budget.model';

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private readonly http = inject(HttpClient);

  list(month: number, year: number): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${API_BASE_URL}/budgets`, { params: { month, year } });
  }

  create(payload: CreateBudgetRequest): Observable<Budget> {
    return this.http.post<Budget>(`${API_BASE_URL}/budgets`, payload);
  }

  update(id: number, payload: UpdateBudgetRequest): Observable<Budget> {
    return this.http.patch<Budget>(`${API_BASE_URL}/budgets/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/budgets/${id}`);
  }
}
