import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import type { AuthUser } from '../../core/auth/auth.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected user: AuthUser | null = null;
  protected isLoading = false;
  protected errorMessage = '';
  protected isMenuOpen = false;

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

  protected get userInitial(): string {
    return this.user?.fullName?.trim().charAt(0).toUpperCase() || '?';
  }

  protected logout(): void {
    this.authService.logout('Cerraste sesión correctamente.', 'success');
  }

  protected toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
