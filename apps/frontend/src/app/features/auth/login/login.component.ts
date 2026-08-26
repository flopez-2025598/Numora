import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

const strongPasswordPattern = /^(?=.{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?!.*\s).*$/;

interface MathSymbol {
  t: string;
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
}

// Símbolos decorativos del fondo del panel izquierdo. Son datos fijos
// (no vienen del usuario ni del backend), solo para dar ambientación
// visual de "finanzas/matemáticas".
const SYMBOLS: MathSymbol[] = [
  { t: '%', x: 2, y: 11, size: 30, dur: 9, delay: 0 },
  { t: '1.28', x: 1, y: 27, size: 26, dur: 11, delay: 1.2 },
  { t: '×', x: 2, y: 44, size: 22, dur: 8, delay: 2.4 },
  { t: '÷', x: 1, y: 56, size: 22, dur: 10, delay: 0.6 },
  { t: '%', x: 3, y: 82, size: 24, dur: 12, delay: 3.1 },
  { t: '+ 8.74', x: 21, y: 9, size: 28, dur: 10, delay: 0.9 },
  { t: '=', x: 25, y: 24, size: 24, dur: 9, delay: 2.0 },
  { t: '(a+b)²', x: 26, y: 33, size: 28, dur: 12, delay: 0.3 },
  { t: '√96', x: 19, y: 38, size: 26, dur: 11, delay: 1.7 },
  { t: '9.99', x: 22, y: 47, size: 26, dur: 9, delay: 2.8 },
  { t: '0.15', x: 28, y: 53, size: 26, dur: 10, delay: 1.1 },
  { t: '%', x: 25, y: 60, size: 24, dur: 13, delay: 3.4 },
  { t: '√', x: 30, y: 66, size: 22, dur: 8, delay: 0.5 },
  { t: 'y = mx + b', x: 13, y: 70, size: 20, dur: 12, delay: 2.2 },
  { t: '≈ 6.99', x: 33, y: 6, size: 28, dur: 11, delay: 1.5 },
  { t: '1.75', x: 31, y: 19, size: 26, dur: 9, delay: 3.0 },
  { t: '98', x: 33, y: 43, size: 24, dur: 10, delay: 0.8 },
  { t: '√', x: 36, y: 32, size: 30, dur: 12, delay: 2.6 },
  { t: '√85', x: 38, y: 22, size: 26, dur: 9, delay: 1.0 },
  { t: '×', x: 40, y: 38, size: 22, dur: 11, delay: 3.3 },
  { t: '%', x: 41, y: 12, size: 24, dur: 10, delay: 0.2 },
  { t: 'β', x: 45, y: 27, size: 26, dur: 12, delay: 1.9 },
  { t: 'π', x: 47, y: 50, size: 28, dur: 9, delay: 2.7 },
  { t: '6.77', x: 93, y: 8, size: 24, dur: 10, delay: 0.4 },
  { t: '≈ 1.46', x: 91, y: 18, size: 24, dur: 12, delay: 2.1 },
  { t: '√x', x: 93, y: 28, size: 24, dur: 9, delay: 1.3 },
  { t: '÷ β', x: 92, y: 38, size: 24, dur: 11, delay: 3.2 },
  { t: '%', x: 94, y: 48, size: 24, dur: 10, delay: 0.7 },
  { t: 'Σ', x: 93, y: 58, size: 24, dur: 12, delay: 2.5 },
  { t: 'π', x: 94, y: 66, size: 26, dur: 9, delay: 1.6 },
  { t: '+ 0.86', x: 90, y: 76, size: 24, dur: 11, delay: 3.5 },
  { t: '=', x: 94, y: 85, size: 22, dur: 10, delay: 0.1 },
];

const DOTS = [
  { x: 8, y: 20, delay: 0 },
  { x: 16, y: 55, delay: 1.1 },
  { x: 30, y: 15, delay: 2.3 },
  { x: 44, y: 62, delay: 0.7 },
  { x: 38, y: 47, delay: 3.0 },
  { x: 89, y: 33, delay: 1.7 },
  { x: 96, y: 55, delay: 2.6 },
  { x: 12, y: 78, delay: 0.4 },
];

// Alturas de las barras de la gráfica decorativa (unidades del viewBox, base en y = 300).
const BAR_HEIGHTS = [12, 19, 27, 38, 49, 63, 78, 93, 109, 124, 139, 154, 167, 180, 192, 203, 213, 223];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly registrationForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(strongPasswordPattern)]],
    confirmPassword: ['', Validators.required],
  });

  protected isRegistering = false;
  protected isSubmitting = false;
  protected errorMessage = history.state.sessionMessage ?? '';
  protected alertType: 'success' | 'error' = history.state.sessionType ?? 'error';
  protected darkCard = false;
  protected showPassword = false;

  protected get passwordsMatch(): boolean {
    const { password, confirmPassword } = this.registrationForm.getRawValue();
    return !!password && password === confirmPassword;
  }

  // Angular sanitiza por seguridad cualquier binding [style] que reciba un
  // string completo (podría venir de un usuario e inyectar CSS malicioso).
  // Aquí es seguro marcarlo como confiable con bypassSecurityTrustStyle
  // porque el string se arma solo con los números fijos de arriba, nunca
  // con datos que escriba un usuario.
  protected readonly symbols: Array<MathSymbol & { style: SafeStyle }> = SYMBOLS.map((s) => ({
    ...s,
    style: this.sanitizer.bypassSecurityTrustStyle(
      `left:${s.x}%;top:${s.y}%;font-size:${s.size}px;--dur:${s.dur}s;--delay:${s.delay}s`,
    ),
  }));

  protected readonly dots: Array<{ style: SafeStyle }> = DOTS.map((d) => ({
    style: this.sanitizer.bypassSecurityTrustStyle(`left:${d.x}%;top:${d.y}%;--delay:${d.delay}s`),
  }));

  protected readonly bars: Array<{ x: number; y: number; h: number; style: SafeStyle }> = BAR_HEIGHTS.map(
    (h, i) => ({
      x: 30 + i * 31,
      y: 300 - h,
      h,
      style: this.sanitizer.bypassSecurityTrustStyle(`--d:${(i * 0.07).toFixed(2)}s`),
    }),
  );

  protected toggleMode(): void {
    this.isRegistering = !this.isRegistering;
    this.errorMessage = '';
  }

  protected togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  protected submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.loginForm.getRawValue();
    this.isSubmitting = true;
    this.errorMessage = '';
    this.authService.login({ email: email ?? '', password: password ?? '' }).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (error: HttpErrorResponse) => this.showError(error, 'No se pudo iniciar sesion.'),
    });
  }

  protected submitRegistration(): void {
    if (this.registrationForm.invalid || !this.passwordsMatch) {
      this.registrationForm.markAllAsTouched();
      return;
    }
    const { fullName, email, password } = this.registrationForm.getRawValue();
    this.isSubmitting = true;
    this.errorMessage = '';
    const credentials = { email: email ?? '', password: password ?? '' };
    this.authService.register({ fullName: fullName ?? '', ...credentials }).subscribe({
      next: () =>
        this.authService.login(credentials).subscribe({
          next: () => this.router.navigateByUrl('/dashboard'),
          error: (error: HttpErrorResponse) =>
            this.showError(error, 'La cuenta fue creada, pero no se pudo iniciar sesion.'),
        }),
      error: (error: HttpErrorResponse) => this.showError(error, 'No se pudo crear la cuenta.'),
    });
  }

  private showError(error: HttpErrorResponse, fallbackMessage: string): void {
    this.isSubmitting = false;
    this.errorMessage = error.error?.error ?? fallbackMessage;
    this.alertType = 'error';
    this.cdr.detectChanges();
  }
}
