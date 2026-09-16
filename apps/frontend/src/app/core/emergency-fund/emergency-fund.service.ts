import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { EmergencyFund, EmergencyFundMovement, MovementRequest } from './emergency-fund.model';

@Injectable({
  providedIn: 'root',
})
export class EmergencyFundService {
  private readonly http = inject(HttpClient);

  getFund(): Observable<EmergencyFund> {
    return this.http.get<EmergencyFund>(`${API_BASE_URL}/emergency-fund`);
  }

  listMovements(): Observable<EmergencyFundMovement[]> {
    return this.http.get<EmergencyFundMovement[]>(`${API_BASE_URL}/emergency-fund/movements`);
  }

  deposit(payload: MovementRequest): Observable<EmergencyFund> {
    return this.http.post<EmergencyFund>(`${API_BASE_URL}/emergency-fund/deposit`, payload);
  }

  withdraw(payload: MovementRequest): Observable<EmergencyFund> {
    return this.http.post<EmergencyFund>(`${API_BASE_URL}/emergency-fund/withdraw`, payload);
  }
}
