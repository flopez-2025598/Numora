import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { CreateIncomeRequest, CreateIncomeSourceRequest, Income, IncomeSource } from './income.model';

@Injectable({
  providedIn: 'root',
})
export class IncomeService {
  private readonly http = inject(HttpClient);

  list(): Observable<Income[]> {
    return this.http.get<Income[]>(`${API_BASE_URL}/income`);
  }

  listSources(): Observable<IncomeSource[]> {
    return this.http.get<IncomeSource[]>(`${API_BASE_URL}/income/sources`);
  }

  createSource(payload: CreateIncomeSourceRequest): Observable<IncomeSource> {
    return this.http.post<IncomeSource>(`${API_BASE_URL}/income/sources`, payload);
  }

  create(payload: CreateIncomeRequest): Observable<Income> {
    return this.http.post<Income>(`${API_BASE_URL}/income`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/income/${id}`);
  }
}
