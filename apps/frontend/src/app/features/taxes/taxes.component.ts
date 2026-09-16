import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { AuthUser } from '../../core/auth/auth.model';
import { TaxService } from '../../core/tax/tax.service';
import type { CalculateTaxResult, TaxParameter, TaxSetting, TaxType } from '../../core/tax/tax.model';
import { notFutureDate, todayISO } from '../../core/validators';

const TAX_LABELS: Record<TaxType, string> = {
  ISR: 'ISR',
  IGSS: 'IGSS',
};

@Component({
  selector: 'app-taxes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './taxes.component.html',
  styleUrl: './taxes.component.scss',
})
export class TaxesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly taxService = inject(TaxService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  protected user: AuthUser | null = null;
  protected isMenuOpen = false;
  protected isLoading = false;
  protected errorMessage = '';

  protected iva: TaxSetting | null = null;
  protected currentParameters: TaxParameter[] = [];
  protected history: TaxParameter[] = [];

  protected showParamForm = false;
  protected isSubmitting = false;
  protected formError = '';

  protected calcResult: CalculateTaxResult | null = null;
  protected calcError = '';
  protected isCalculating = false;

  protected readonly paramForm = this.fb.group({
    taxType: ['ISR' as TaxType, Validators.required],
    ratePercent: ['', [Validators.required, Validators.min(0.0001), Validators.max(100)]],
    validFrom: [todayISO(), [Validators.required, notFutureDate]],
  });

  protected readonly calcForm = this.fb.group({
    taxType: ['ISR' as TaxType | 'IVA', Validators.required],
    baseAmount: ['', [Validators.required, Validators.min(0.01)]],
  });

  protected get maxDate(): string {
    return todayISO();
  }

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

    this.taxService.getIva().subscribe({
      next: (iva) => {
        this.iva = iva;
        this.cdr.detectChanges();
      },
      error: () => {
        // Si el IVA no está configurado en el sistema, simplemente no se muestra su tarjeta.
      },
    });

    this.taxService.getCurrentParameters().subscribe({
      next: (params) => {
        this.currentParameters = params;
        this.cdr.detectChanges();
      },
    });

    this.taxService.listParameters().subscribe({
      next: (history) => {
        this.history = history;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.errorMessage = `No se pudo cargar tu información de impuestos: ${e.error?.error ?? 'Error desconocido'}`;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected currentRateFor(type: TaxType): TaxParameter | null {
    return this.currentParameters.find((p) => p.taxType === type) ?? null;
  }

  protected taxLabel(type: TaxType): string {
    return TAX_LABELS[type];
  }

  protected toPercent(rate: string): string {
    return `${(Number(rate) * 100).toLocaleString('es-GT', { minimumFractionDigits: 1, maximumFractionDigits: 4 })}%`;
  }

  // --- Formulario: nueva tasa ---

  protected openParamForm(): void {
    this.formError = '';
    this.paramForm.reset({ taxType: 'ISR', ratePercent: '', validFrom: todayISO() });
    this.showParamForm = true;
  }

  protected closeParamForm(): void {
    this.showParamForm = false;
  }

  protected submitParam(): void {
    if (this.paramForm.invalid) {
      this.paramForm.markAllAsTouched();
      return;
    }

    const { taxType, ratePercent, validFrom } = this.paramForm.getRawValue();
    this.isSubmitting = true;
    this.formError = '';

    // La API guarda la tasa como fracción decimal (0.05 = 5%); el usuario la
    // escribe como porcentaje porque es lo que entiende sin pensarlo.
    const rate = (Number(ratePercent) / 100).toString();

    this.taxService.createParameter({ taxType: taxType as TaxType, rate, validFrom: validFrom! }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showParamForm = false;
        this.loadAll();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.formError = e.error?.error ?? 'No se pudo guardar la nueva tasa.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  // --- Calculadora ---

  protected submitCalc(): void {
    if (this.calcForm.invalid) {
      this.calcForm.markAllAsTouched();
      return;
    }

    const { taxType, baseAmount } = this.calcForm.getRawValue();
    this.isCalculating = true;
    this.calcError = '';
    this.calcResult = null;

    this.taxService.calculate({ taxType: taxType as TaxType | 'IVA', baseAmount: baseAmount! }).subscribe({
      next: (result) => {
        this.calcResult = result;
        this.isCalculating = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.calcError = e.error?.error ?? 'No se pudo calcular el impuesto.';
        this.isCalculating = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected formatCurrency(value: number | string): string {
    const n = typeof value === 'string' ? Number(value) : value;
    return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
