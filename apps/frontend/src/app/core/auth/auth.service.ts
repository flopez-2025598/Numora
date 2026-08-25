import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { AuthUser, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from './auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'numora.token';
  private readonly userKey = 'numora.user';
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/auth/login`, credentials).pipe(
      tap((response) => this.storeSession(response)),
    );
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${API_BASE_URL}/auth/register`, payload);
  }

  fetchCurrentUser(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${API_BASE_URL}/auth/me`).pipe(
      tap((user) => localStorage.setItem(this.userKey, JSON.stringify(user))),
    );
  }

  isAuthenticated(): boolean {
    const token = this.getToken();

    if (!token || this.isTokenExpired(token)) {
      this.clearSession();
      return false;
    }

    return true;
  }

  restoreSession(): void {
    const token = this.getToken();

    if (!token) {
      return;
    }

    if (this.isTokenExpired(token)) {
      this.logout('Tu sesión ah expirado. Inicia sesión de nuevo para continuar.');
      return;
    }

    this.scheduleLogout(token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  logout(message?: string): void {
    this.clearSession();

    void this.router.navigate(['/login'], {
      state: message ? { sessionMessage: message } : undefined,
    });
  }

  private clearSession(): void {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  private storeSession(response: LoginResponse): void {
    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
    this.scheduleLogout(response.token);
  }

  private scheduleLogout(token: string): void {
    const expiration = this.getExpirationTime(token);

    if (!expiration) {
      this.clearSession();
      return;
    }

    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }

    const remainingTime = expiration - Date.now();
    this.logoutTimer = setTimeout(() => {
      this.logout('Tu sesión ha expirado. Inicia sesión de nuevo para continuar.');
    }, remainingTime);
  }

  private isTokenExpired(token: string): boolean {
    const expiration = this.getExpirationTime(token);
    return !expiration || expiration <= Date.now();
  }

  private getExpirationTime(token: string): number | null {
    try {
      const [, encodedPayload] = token.split('.');
      if (!encodedPayload) {
        return null;
      }

      const normalizedPayload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(
        normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
        '=',
      );
      const payload = JSON.parse(atob(paddedPayload)) as { exp?: unknown };

      return typeof payload.exp === 'number' && Number.isFinite(payload.exp) && payload.exp > 0
        ? payload.exp * 1000
        : null;
    } catch {
      return null;
    }
  }
}
