import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { AuthUser, LoginRequest, LoginResponse, RefreshResponse, RegisterRequest, RegisterResponse } from './auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'numora.token';
  private readonly userKey = 'numora.user';
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;

  // --- Sesión por inactividad ---
  // El JWT trae su expiración grabada desde que se firma; el backend no
  // sabe si el usuario sigue "presente". Por eso, mientras detectamos
  // actividad Y la pestaña está visible, le pedimos al backend un token
  // nuevo de vez en cuando (POST /auth/refresh). Si el usuario deja de
  // interactuar o cambia de pestaña, dejamos de renovar y el token
  // original expira normalmente en la fecha con la que se firmó.
  private readonly activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
  private hasRecentActivity = false;
  private presenceCheckTimer: ReturnType<typeof setInterval> | null = null;

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

  refreshToken(): Observable<RefreshResponse> {
    return this.http.post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, {}).pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.token);
        this.scheduleLogout(response.token);
      }),
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
    this.startPresenceTracking(token);
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

  logout(message?: string, type: 'success' | 'error' = 'error'): void {
    this.clearSession();

    void this.router.navigate(['/login'], {
      state: message ? { sessionMessage: message, sessionType: type } : undefined,
    });
  }

  private clearSession(): void {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }

    this.stopPresenceTracking();
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  private storeSession(response: LoginResponse): void {
    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
    this.scheduleLogout(response.token);
    this.startPresenceTracking(response.token);
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

  private decodePayload(token: string): { exp?: unknown; iat?: unknown } | null {
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

      return JSON.parse(atob(paddedPayload)) as { exp?: unknown; iat?: unknown };
    } catch {
      return null;
    }
  }

  private getExpirationTime(token: string): number | null {
    const payload = this.decodePayload(token);
    return typeof payload?.exp === 'number' && Number.isFinite(payload.exp) && payload.exp > 0
      ? payload.exp * 1000
      : null;
  }

  // Duración total del token (exp - iat), para saber cada cuánto tiene
  // sentido revisar si hay que renovarlo. Si no se puede calcular, usamos
  // 5 minutos como valor razonable por defecto.
  private getTokenLifetimeMs(token: string): number {
    const payload = this.decodePayload(token);
    if (
      typeof payload?.exp === 'number' && typeof payload?.iat === 'number'
      && Number.isFinite(payload.exp) && Number.isFinite(payload.iat)
    ) {
      return (payload.exp - payload.iat) * 1000;
    }
    return 5 * 60 * 1000;
  }

  private readonly onActivity = (): void => {
    this.hasRecentActivity = true;
  };

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.getToken()) {
      // Volviste a la pestaña: si el token sigue vivo, se renueva de
      // inmediato en vez de esperar al siguiente chequeo periódico.
      this.hasRecentActivity = true;
      this.tryRefresh();
    }
  };

  private startPresenceTracking(token: string): void {
    this.stopPresenceTracking();

    if (typeof window === 'undefined') {
      return;
    }

    const lifetimeMs = this.getTokenLifetimeMs(token);
    // Revisamos unas 3 veces durante la vida del token, con un mínimo de
    // 10s para no saturar al backend si JWT_EXPIRES_IN es muy corto.
    const checkIntervalMs = Math.max(10_000, Math.floor(lifetimeMs / 3));

    this.activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, this.onActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.presenceCheckTimer = setInterval(() => {
      const wasPresent = this.hasRecentActivity && document.visibilityState === 'visible';
      this.hasRecentActivity = false;

      if (wasPresent) {
        this.tryRefresh();
      }
      // Si no hubo actividad (o la pestaña estaba oculta), no hacemos
      // nada: dejamos que el temporizador de scheduleLogout haga su
      // trabajo cuando llegue la hora de expiración ya programada.
    }, checkIntervalMs);
  }

  private stopPresenceTracking(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.activityEvents.forEach((eventName) => {
      window.removeEventListener(eventName, this.onActivity);
    });
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.presenceCheckTimer) {
      clearInterval(this.presenceCheckTimer);
      this.presenceCheckTimer = null;
    }
  }

  private tryRefresh(): void {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) {
      return;
    }

    this.refreshToken().subscribe({
      error: () => {
        // Si la renovación falla (ej. el token venció justo antes de
        // llegar la petición), no hacemos nada extra: el logout
        // programado por scheduleLogout ya se va a encargar de cerrar
        // la sesión a tiempo.
      },
    });
  }
}
