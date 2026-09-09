import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { CreateExpenseCategoryRequest, CreateExpenseRequest, Expense, ExpenseCategory } from './expense.model';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private readonly http = inject(HttpClient);

  list(): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${API_BASE_URL}/expenses`);
  }

  listCategories(): Observable<ExpenseCategory[]> {
    return this.http.get<ExpenseCategory[]>(`${API_BASE_URL}/expenses/categories`);
  }

  createCategory(payload: CreateExpenseCategoryRequest): Observable<ExpenseCategory> {
    return this.http.post<ExpenseCategory>(`${API_BASE_URL}/expenses/categories`, payload);
  }

  removeCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/expenses/categories/${id}`);
  }

  create(payload: CreateExpenseRequest): Observable<Expense> {
    return this.http.post<Expense>(`${API_BASE_URL}/expenses`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/expenses/${id}`);
  }
}
