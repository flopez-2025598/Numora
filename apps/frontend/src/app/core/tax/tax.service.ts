import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type {
  CalculateTaxRequest,
  CalculateTaxResult,
  CreateTaxParameterRequest,
  TaxParameter,
  TaxSetting,
} from './tax.model';

@Injectable({
  providedIn: 'root',
})
export class TaxService {
  private readonly http = inject(HttpClient);

  getIva(): Observable<TaxSetting> {
    return this.http.get<TaxSetting>(`${API_BASE_URL}/taxes/iva`);
  }

  listParameters(): Observable<TaxParameter[]> {
    return this.http.get<TaxParameter[]>(`${API_BASE_URL}/taxes/parameters`);
  }

  getCurrentParameters(): Observable<TaxParameter[]> {
    return this.http.get<TaxParameter[]>(`${API_BASE_URL}/taxes/parameters/current`);
  }

  createParameter(payload: CreateTaxParameterRequest): Observable<TaxParameter> {
    return this.http.post<TaxParameter>(`${API_BASE_URL}/taxes/parameters`, payload);
  }

  calculate(payload: CalculateTaxRequest): Observable<CalculateTaxResult> {
    return this.http.post<CalculateTaxResult>(`${API_BASE_URL}/taxes/calculate`, payload);
  }
}
