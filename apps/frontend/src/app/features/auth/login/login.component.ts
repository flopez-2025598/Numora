import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

const strongPasswordPattern = /^(?=.{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?!.*\s).*$/;

@Component({
  selector: 'app-login', standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main class="auth-shell"><section class="auth-layout"><div class="brand-panel"><div class="brand"><span class="brand-mark">N</span><span>NUMORA</span></div><div class="brand-copy"><p class="eyebrow">Numora Solutions</p><h1>Finanzas claras para mejores decisiones.</h1><p>Controla tus finanzas personales desde un solo lugar.</p></div></div>
      <section class="auth-card"><div><p class="eyebrow">{{ isRegistering ? 'Crea tu cuenta' : 'Acceso seguro' }}</p><h2>{{ isRegistering ? 'Registrate en Numora' : 'Iniciar sesion' }}</h2><p class="intro">{{ isRegistering ? 'Completa tus datos para comenzar.' : 'Ingresa tus datos para continuar.' }}</p></div>
        <form *ngIf="!isRegistering; else registerForm" [formGroup]="loginForm" (ngSubmit)="submitLogin()"><label><span>Correo electronico</span><input type="email" formControlName="email" placeholder="correo@ejemplo.com" autocomplete="email" /></label><label><span>Contrasena</span><input type="password" formControlName="password" placeholder="Ingresa tu contrasena" autocomplete="current-password" /></label><button type="submit" [disabled]="loginForm.invalid || isSubmitting">{{ isSubmitting ? 'Ingresando...' : 'Ingresar a Numora' }}</button></form>
        <ng-template #registerForm><form [formGroup]="registrationForm" (ngSubmit)="submitRegistration()"><label><span>Nombre completo</span><input type="text" formControlName="fullName" placeholder="Tu nombre" autocomplete="name" /></label><label><span>Correo electronico</span><input type="email" formControlName="email" placeholder="correo@ejemplo.com" autocomplete="email" /></label><label><span>Contrasena</span><input type="password" formControlName="password" placeholder="Crea una contrasena segura" autocomplete="new-password" /></label><p class="password-hint">8+ caracteres, mayuscula, minuscula y numero. No uses espacios.</p><label><span>Confirmar contrasena</span><input type="password" formControlName="confirmPassword" placeholder="Repite tu contrasena" autocomplete="new-password" /></label><p *ngIf="registrationForm.controls.confirmPassword.touched && !passwordsMatch" class="field-error">Las contrasenas no coinciden.</p><button type="submit" [disabled]="registrationForm.invalid || !passwordsMatch || isSubmitting">{{ isSubmitting ? 'Creando cuenta...' : 'Crear cuenta' }}</button></form></ng-template>
        <p class="error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</p><button type="button" class="mode-switch" (click)="toggleMode()">{{ isRegistering ? 'Ya tengo una cuenta' : 'Crear una cuenta' }}</button>
      </section>
    </section></main>`,
  styles: [`
    :host { display: block; min-height: 100vh; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .auth-shell { display: grid; min-height: 100vh; place-items: center; overflow: hidden; padding: 28px; background: radial-gradient(circle at 14% 14%, rgba(0, 184, 255, .22), transparent 23rem), radial-gradient(circle at 86% 86%, rgba(0, 107, 255, .2), transparent 25rem), #030b1a; }
    .auth-layout { display: grid; width: min(100%, 1040px); grid-template-columns: 1.08fr .92fr; overflow: hidden; border: 1px solid rgba(135, 207, 255, .26); border-radius: 22px; background: #f7fbff; box-shadow: 0 28px 80px rgba(0, 0, 0, .56), 0 0 44px rgba(0, 153, 255, .13); }
    .brand-panel { position: relative; display: flex; min-height: 560px; flex-direction: column; justify-content: space-between; overflow: hidden; padding: 44px; background: linear-gradient(145deg, #020816 0%, #071a38 55%, #083e77 100%); color: #fff; }
    .brand-panel::before, .brand-panel::after { position: absolute; border-radius: 50%; content: ''; pointer-events: none; }
    .brand-panel::before { top: -120px; right: -110px; width: 300px; height: 300px; border: 1px solid rgba(129, 221, 255, .22); box-shadow: 0 0 0 38px rgba(46, 157, 255, .04), 0 0 0 78px rgba(46, 157, 255, .03); }
    .brand-panel::after { bottom: -145px; left: -110px; width: 310px; height: 310px; background: radial-gradient(circle, rgba(0, 198, 255, .2), transparent 67%); }
    .brand { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; font-size: .95rem; font-weight: 800; letter-spacing: .16em; }
    .brand-mark { display: grid; width: 38px; height: 38px; place-items: center; border: 1px solid rgba(193, 237, 255, .7); border-radius: 12px 4px 12px 4px; background: linear-gradient(145deg, #fff 0%, #b6d0ed 45%, #0b8df0 70%, #004b9d 100%); box-shadow: inset 0 1px 3px rgba(255, 255, 255, .9), 0 0 20px rgba(13, 167, 255, .45); color: #062557; font-size: 1.45rem; font-style: italic; letter-spacing: 0; text-shadow: 0 1px 0 rgba(255, 255, 255, .6); transform: skewY(-8deg); }
    .brand-copy { position: relative; z-index: 1; max-width: 395px; padding-bottom: 28px; }
    .eyebrow { margin: 0 0 12px; color: #4cc8ff; font-size: .75rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .brand-copy h1 { margin: 0; color: #f8fcff; font-size: 2.5rem; line-height: 1.07; letter-spacing: -.055em; text-shadow: 0 3px 20px rgba(0, 174, 255, .18); }
    .brand-copy p:last-child { margin: 20px 0 0; color: #bdd7ec; line-height: 1.7; }
    .auth-card { display: flex; flex-direction: column; justify-content: center; gap: 22px; padding: 50px 46px; background: linear-gradient(145deg, #ffffff, #edf6ff); }
    .auth-card .eyebrow { color: #087cc8; }
    .auth-card h2 { margin: 0; color: #062557; font-size: 1.82rem; letter-spacing: -.04em; }
    .intro { margin: 8px 0 0; color: #61768f; }
    .auth-card form { display: grid; gap: 17px; }
    label { display: grid; gap: 8px; color: #244768; font-size: .9rem; font-weight: 750; }
    input { min-height: 48px; box-sizing: border-box; width: 100%; border: 1px solid #c7ddeb; border-radius: 10px; padding: 0 14px; background: rgba(255, 255, 255, .9); color: #092e57; font: inherit; transition: border-color .2s, box-shadow .2s, transform .2s; }
    input::placeholder { color: #90a5b9; }
    input:focus { outline: 0; border-color: #159ee9; box-shadow: 0 0 0 4px rgba(14, 164, 241, .14); transform: translateY(-1px); }
    button { min-height: 48px; margin-top: 4px; border: 1px solid rgba(106, 205, 255, .55); border-radius: 10px; background: linear-gradient(120deg, #05295c, #087ec9 58%, #14b7ed); box-shadow: 0 10px 22px rgba(0, 89, 165, .24); color: #fff; font: inherit; font-weight: 800; cursor: pointer; transition: filter .2s, transform .2s, box-shadow .2s; }
    button:hover:not(:disabled) { box-shadow: 0 13px 26px rgba(0, 113, 207, .34); filter: brightness(1.08); transform: translateY(-1px); }
    button:disabled { cursor: not-allowed; opacity: .62; }
    .password-hint { margin: -6px 0 0; color: #647b92; font-size: .78rem; line-height: 1.45; }
    .field-error { margin: -8px 0 0; color: #bb4050; font-size: .82rem; }
    .error { margin: 0; border: 1px solid #f2c9ce; border-radius: 9px; background: #fff2f4; padding: 11px 12px; color: #a53041; font-size: .9rem; }
    .mode-switch { margin: 0; border-color: transparent; background: transparent; box-shadow: none; color: #076db4; font-weight: 750; text-decoration: underline; text-decoration-color: #78c7ef; text-underline-offset: 4px; }
    .mode-switch:hover:not(:disabled) { box-shadow: none; color: #034f91; }
    @media (max-width: 760px) { .auth-shell { padding: 16px; } .auth-layout { grid-template-columns: 1fr; } .brand-panel { min-height: 250px; padding: 30px; } .brand-copy { padding: 32px 0 0; } .brand-copy h1 { font-size: 1.85rem; } .brand-copy p:last-child { display: none; } .auth-card { padding: 34px 26px; } }
  `],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder); private readonly authService = inject(AuthService); private readonly router = inject(Router); private readonly cdr = inject(ChangeDetectorRef);
  protected readonly loginForm = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  protected readonly registrationForm = this.fb.group({ fullName: ['', [Validators.required, Validators.minLength(2)]], email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.pattern(strongPasswordPattern)]], confirmPassword: ['', Validators.required] });
  protected isRegistering = false; protected isSubmitting = false; protected errorMessage = history.state.sessionMessage ?? '';
  protected get passwordsMatch(): boolean { const { password, confirmPassword } = this.registrationForm.getRawValue(); return !!password && password === confirmPassword; }
  protected toggleMode(): void { this.isRegistering = !this.isRegistering; this.errorMessage = ''; }
  protected submitLogin(): void { if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; } const { email, password } = this.loginForm.getRawValue(); this.isSubmitting = true; this.errorMessage = ''; this.authService.login({ email: email ?? '', password: password ?? '' }).subscribe({ next: () => this.router.navigateByUrl('/dashboard'), error: (error: HttpErrorResponse) => this.showError(error, 'No se pudo iniciar sesion.') }); }
  protected submitRegistration(): void { if (this.registrationForm.invalid || !this.passwordsMatch) { this.registrationForm.markAllAsTouched(); return; } const { fullName, email, password } = this.registrationForm.getRawValue(); this.isSubmitting = true; this.errorMessage = ''; const credentials = { email: email ?? '', password: password ?? '' }; this.authService.register({ fullName: fullName ?? '', ...credentials }).subscribe({ next: () => this.authService.login(credentials).subscribe({ next: () => this.router.navigateByUrl('/dashboard'), error: (error: HttpErrorResponse) => this.showError(error, 'La cuenta fue creada, pero no se pudo iniciar sesion.') }), error: (error: HttpErrorResponse) => this.showError(error, 'No se pudo crear la cuenta.') }); }
  private showError(error: HttpErrorResponse, fallbackMessage: string): void { this.isSubmitting = false; this.errorMessage = error.error?.error ?? fallbackMessage; this.cdr.detectChanges(); }
}
