import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { AuthUser } from '../../core/auth/auth.model';
import { EmergencyFundService } from '../../core/emergency-fund/emergency-fund.service';
import type { EmergencyFund, EmergencyFundMovement, MovementType } from '../../core/emergency-fund/emergency-fund.model';

@Component({
  selector: 'app-emergency-fund',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './emergency-fund.component.html',
  styleUrl: './emergency-fund.component.scss',
})
export class EmergencyFundComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fundService = inject(EmergencyFundService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  protected user: AuthUser | null = null;
  protected isMenuOpen = false;
  protected isLoading = false;
  protected errorMessage = '';

  protected fund: EmergencyFund | null = null;
  protected movements: EmergencyFundMovement[] = [];
  protected showAll = false;

  protected showMovementForm = false;
  protected movementMode: MovementType = 'DEPOSIT';
  protected isSubmitting = false;
  protected formError = '';

  protected readonly movementForm = this.fb.group({
    amount: ['', [Validators.required, Validators.min(0.01)]],
    description: [''],
  });

  ngOnInit(): void {
    this.loadUser();
    this.loadAll();
  }

  private loadUser(): void {
    this.authService.fetchCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        this.cdr.detectChanges();
      },
      error: () => {
        // El interceptor ya se encarga de cerrar sesión si el token no es válido.
      },
    });
  }

  protected toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  protected logout(): void {
    this.authService.logout('Cerraste sesión correctamente.', 'success');
  }

  protected loadAll(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.fundService.getFund().subscribe({
      next: (fund) => {
        this.fund = fund;
        this.cdr.detectChanges();
      },
    });

    this.fundService.listMovements().subscribe({
      next: (movements) => {
        this.movements = movements;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.errorMessage = `No se pudo cargar tu fondo de emergencia: ${e.error?.error ?? 'Error desconocido'}`;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // --- Totales derivados del historial real ---

  protected get totalDeposited(): number {
    return this.sum('DEPOSIT');
  }

  protected get totalWithdrawn(): number {
    return this.sum('WITHDRAWAL');
  }

  private sum(type: MovementType): number {
    return this.movements.filter((m) => m.type === type).reduce((acc, m) => acc + Number(m.amount), 0);
  }

  protected get visibleMovements(): EmergencyFundMovement[] {
    return this.showAll ? this.movements : this.movements.slice(0, 8);
  }

  protected movementLabel(type: MovementType): string {
    return type === 'DEPOSIT' ? 'Depósito' : 'Retiro';
  }

  // --- Formulario ---

  protected openMovementForm(mode: MovementType): void {
    this.movementMode = mode;
    this.formError = '';
    this.movementForm.reset({ amount: '', description: '' });
    this.showMovementForm = true;
  }

  protected closeMovementForm(): void {
    this.showMovementForm = false;
  }

  protected get availableBalance(): number {
    return this.fund ? Number(this.fund.balance) : 0;
  }

  protected submitMovement(): void {
    if (this.movementForm.invalid) {
      this.movementForm.markAllAsTouched();
      return;
    }

    const { amount, description } = this.movementForm.getRawValue();

    if (this.movementMode === 'WITHDRAWAL' && Number(amount) > this.availableBalance) {
      this.formError = `No puedes retirar más de lo que tienes ahorrado (${this.formatCurrency(this.availableBalance)}).`;
      return;
    }

    this.isSubmitting = true;
    this.formError = '';

    const payload = { amount: String(amount), description: description || undefined };
    const request = this.movementMode === 'DEPOSIT'
      ? this.fundService.deposit(payload)
      : this.fundService.withdraw(payload);

    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showMovementForm = false;
        this.loadAll();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.formError = e.error?.error ?? 'No se pudo registrar el movimiento.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected formatCurrency(value: number | string): string {
    const n = typeof value === 'string' ? Number(value) : value;
    return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
