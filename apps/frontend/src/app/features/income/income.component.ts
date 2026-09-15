import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { AuthUser } from '../../core/auth/auth.model';
import { IncomeService } from '../../core/income/income.service';
import type { Income, IncomeSource, IncomeType } from '../../core/income/income.model';
import { ExpenseService } from '../../core/expense/expense.service';
import type { Expense } from '../../core/expense/expense.model';
import { notFutureDate, todayISO } from '../../core/validators';

interface TypeBreakdown {
  type: IncomeType;
  label: string;
  legendLabel: string;
  total: number;
  pct: number;
}

const TYPE_LABELS: Record<IncomeType, string> = {
  FIXED: 'Fijo',
  VARIABLE: 'Variable',
  EXTRAORDINARY: 'Extra',
};

const TYPE_LEGEND_LABELS: Record<IncomeType, string> = {
  FIXED: 'Ingresos fijos',
  VARIABLE: 'Ingresos variables',
  EXTRAORDINARY: 'Ingresos extra',
};

const TYPE_COLORS: Record<IncomeType, string> = {
  FIXED: '#2dd4ee',
  VARIABLE: '#7c8cf5',
  EXTRAORDINARY: '#a78bfa',
};

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './income.component.html',
  styleUrl: './income.component.scss',
})
export class IncomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly incomeService = inject(IncomeService);
  private readonly expenseService = inject(ExpenseService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  protected user: AuthUser | null = null;
  protected isMenuOpen = false;
  protected isLoading = false;
  protected errorMessage = '';

  protected incomes: Income[] = [];
  protected expenses: Expense[] = [];
  protected sources: IncomeSource[] = [];
  protected showAll = false;

  protected showIncomeForm = false;
  protected showSourceForm = false;
  protected isSubmitting = false;
  protected formError = '';

  protected readonly incomeForm = this.fb.group({
    incomeSourceId: ['', Validators.required],
    type: ['FIXED' as IncomeType, Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    description: [''],
    date: [this.today(), [Validators.required, notFutureDate]],
  });

  // Para el atributo [max] del <input type="date">: no deja elegir fechas futuras.
  protected get maxDate(): string {
    return todayISO();
  }

  protected readonly sourceForm = this.fb.group({
    name: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadUser();
    this.loadAll();
  }

  private today(): string {
    return todayISO();
  }

  protected toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  protected get userInitial(): string {
    return this.user?.fullName?.trim().charAt(0).toUpperCase() || '?';
  }

  protected logout(): void {
    this.authService.logout('Cerraste sesión correctamente.', 'success');
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

  protected loadAll(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.incomeService.listSources().subscribe({
      next: (sources) => {
        this.sources = sources;
        this.cdr.detectChanges();
      },
    });

    // Los gastos se usan solo para calcular el "Disponible total"
    // (ingresos acumulados - gastos acumulados). Si falla, el disponible
    // queda igual al total de ingresos, no rompe la pantalla.
    this.expenseService.list().subscribe({
      next: (expenses) => {
        this.expenses = expenses;
        this.cdr.detectChanges();
      },
      error: () => {
        // silencioso
      },
    });

    this.incomeService.list().subscribe({
      next: (incomes) => {
        this.incomes = incomes;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.errorMessage = `No se pudieron cargar tus ingresos: ${e.error?.error ?? 'Error desconocido'}`;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // --- Cálculos derivados de los datos reales (nada hardcodeado) ---

  private isInMonth(dateStr: string, ref: Date): boolean {
    const d = new Date(dateStr);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }

  private get now(): Date {
    return new Date();
  }

  // Nombre del mes actual en español, ej. "septiembre".
  protected get currentMonthName(): string {
    return this.now.toLocaleDateString('es-GT', { month: 'long' });
  }

  private get previousMonthRef(): Date {
    const d = new Date(this.now.getFullYear(), this.now.getMonth() - 1, 1);
    return d;
  }

  protected get currentMonthIncomes(): Income[] {
    return this.incomes.filter((i) => this.isInMonth(i.date, this.now));
  }

  private get previousMonthIncomes(): Income[] {
    return this.incomes.filter((i) => this.isInMonth(i.date, this.previousMonthRef));
  }

  private sum(list: Income[]): number {
    return list.reduce((acc, i) => acc + Number(i.amount), 0);
  }

  protected get totalThisMonth(): number {
    return this.sum(this.currentMonthIncomes);
  }

  private get totalPreviousMonth(): number {
    return this.sum(this.previousMonthIncomes);
  }

  protected totalByType(type: IncomeType): number {
    return this.sum(this.currentMonthIncomes.filter((i) => i.type === type));
  }

  protected vsLastMonthPct(current: number, type?: IncomeType): number | null {
    const previous = type
      ? this.sum(this.previousMonthIncomes.filter((i) => i.type === type))
      : this.totalPreviousMonth;
    if (previous <= 0) {
      return null;
    }
    return ((current - previous) / previous) * 100;
  }

  // --- Disponible total (acumulado de todo el historial) ---

  protected get totalAllIncome(): number {
    return this.sum(this.incomes);
  }

  protected get totalAllExpense(): number {
    return this.expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  }

  // Dinero disponible = todo lo que has ingresado menos todo lo que has
  // gastado, sin importar el mes. Así el saldo de meses anteriores cuenta.
  protected get availableTotal(): number {
    return this.totalAllIncome - this.totalAllExpense;
  }

  protected get dailyAverage(): number {
    const daysElapsed = Math.min(this.now.getDate(), new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0).getDate());
    return daysElapsed > 0 ? this.totalThisMonth / daysElapsed : 0;
  }

  protected get daysWithIncome(): number {
    const days = new Set(this.currentMonthIncomes.map((i) => i.date.slice(0, 10)));
    return days.size;
  }

  protected get typeBreakdown(): TypeBreakdown[] {
    const total = this.totalThisMonth;
    return (['FIXED', 'VARIABLE', 'EXTRAORDINARY'] as IncomeType[]).map((type) => {
      const t = this.totalByType(type);
      return {
        type,
        label: TYPE_LABELS[type],
        legendLabel: TYPE_LEGEND_LABELS[type],
        total: t,
        pct: total > 0 ? (t / total) * 100 : 0,
      };
    });
  }

  protected get donutGradient(): string {
    const breakdown = this.typeBreakdown.filter((b) => b.pct > 0);
    if (breakdown.length === 0) {
      return 'conic-gradient(rgba(255,255,255,.12) 0% 100%)';
    }
    let acc = 0;
    const stops = breakdown.map((b) => {
      const start = acc;
      acc += b.pct;
      return `${TYPE_COLORS[b.type]} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  protected typeColor(type: IncomeType): string {
    return TYPE_COLORS[type];
  }

  protected get visibleIncomes(): Income[] {
    return this.showAll ? this.incomes : this.incomes.slice(0, 5);
  }

  // --- Formularios ---

  protected openIncomeForm(): void {
    this.formError = '';
    this.incomeForm.reset({ type: 'FIXED', date: this.today(), incomeSourceId: '', amount: '', description: '' });
    this.showIncomeForm = true;
  }

  protected closeIncomeForm(): void {
    this.showIncomeForm = false;
  }

  protected openSourceForm(): void {
    this.formError = '';
    this.sourceForm.reset({ name: '' });
    this.showSourceForm = true;
  }

  protected closeSourceForm(): void {
    this.showSourceForm = false;
  }

  protected submitIncome(): void {
    if (this.incomeForm.invalid) {
      this.incomeForm.markAllAsTouched();
      return;
    }

    const { incomeSourceId, type, amount, description, date } = this.incomeForm.getRawValue();
    this.isSubmitting = true;
    this.formError = '';

    this.incomeService.create({
      incomeSourceId: Number(incomeSourceId),
      type: type as IncomeType,
      amount: String(amount),
      description: description || undefined,
      date: date!,
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showIncomeForm = false;
        this.loadAll();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.formError = e.error?.error ?? 'No se pudo registrar el ingreso.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected submitSource(): void {
    if (this.sourceForm.invalid) {
      this.sourceForm.markAllAsTouched();
      return;
    }

    const { name } = this.sourceForm.getRawValue();
    this.isSubmitting = true;
    this.formError = '';

    this.incomeService.createSource({ name: name! }).subscribe({
      next: (source) => {
        this.isSubmitting = false;
        this.showSourceForm = false;
        this.sources = [...this.sources, source];
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.formError = e.error?.error ?? 'No se pudo crear la fuente.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected deleteIncome(income: Income): void {
    this.incomeService.remove(income.id).subscribe({
      next: () => this.loadAll(),
    });
  }

  protected typeLabel(type: IncomeType): string {
    return TYPE_LABELS[type];
  }

  protected formatCurrency(value: number | string): string {
    const n = typeof value === 'string' ? Number(value) : value;
    const amount = Math.abs(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${n < 0 ? '-' : ''}Q${amount}`;
  }
}
