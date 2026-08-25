import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import type { AuthUser } from '../../core/auth/auth.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<main class="dashboard-shell"><header class="dashboard-header"><div><p class="eyebrow">Numora</p><h1>Dashboard</h1><p class="welcome" *ngIf="user">Bienvenido, {{ user.fullName }}</p></div><button type="button" class="logout-btn" (click)="logout()">Cerrar sesión</button></header><section *ngIf="isLoading" class="state"><span class="spinner"></span><p>Verificando tu sesión...</p></section><section *ngIf="errorMessage" class="error-state"><p>{{ errorMessage }}</p><button type="button" (click)="loadUser()">Reintentar</button></section></main>`,
  styles: [`:host{display:block;min-height:100vh;background:linear-gradient(135deg,#fff 0%,#f8fbff 52%,#edf5ff 100%);color:#16233d;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.dashboard-shell{max-width:1240px;min-height:100vh;margin:0 auto;padding:46px 32px 70px}.dashboard-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:28px;border-bottom:1px solid #e6edf7}.eyebrow{margin:0 0 9px;color:#3673b8;font-size:.76rem;font-weight:750;letter-spacing:.11em;text-transform:uppercase}h1{margin:0;color:#10213d;font-size:2.4rem;letter-spacing:-.045em}.welcome{margin:9px 0 0;color:#61728d}.logout-btn{padding:11px 16px;border:1px solid #d5e2f2;border-radius:8px;background:linear-gradient(135deg,#173c6b,#245a9c);box-shadow:0 5px 12px rgba(28,73,126,.14);color:#fff;font:inherit;font-size:.9rem;font-weight:700;cursor:pointer}.logout-btn:hover{filter:brightness(1.06)}.state{display:grid;justify-items:center;gap:12px;padding:90px;color:#697993}.spinner{width:30px;height:30px;border:3px solid #dcecf9;border-top-color:#377ac0;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.error-state{margin-top:30px;padding:24px;border-radius:12px;background:#fff5f5;color:#a53e48}.error-state p{margin-top:0}.error-state button{padding:9px 13px;border:0;border-radius:7px;background:#a53e48;color:#fff;font:inherit;font-weight:700;cursor:pointer}@media(max-width:600px){.dashboard-shell{padding:30px 18px 48px}.dashboard-header{align-items:stretch;flex-direction:column}h1{font-size:2rem}.logout-btn{align-self:flex-start}}`],
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected user: AuthUser | null = null;
  protected isLoading = false;
  protected errorMessage = '';

  ngOnInit(): void {
    this.loadUser();
  }

  protected loadUser(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.authService.fetchCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.errorMessage = `No se pudo verificar tu sesión: ${e.error?.error ?? 'Error desconocido'}`;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected logout(): void {
    this.authService.logout('Cerraste sesión correctamente.');
  }
}
