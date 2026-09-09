import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { AuthUser } from '../../core/auth/auth.model';
import { IncomeService } from '../../core/income/income.service';
import type { Income } from '../../core/income/income.model';
import { ExpenseService } from '../../core/expense/expense.service';
import type { Expense } from '../../core/expense/expense.model';
import { buildCategoryBreakdown, categoryDonutGradient, type CategorySlice } from '../../core/expense/expense.util';

// Fila mínima que comparten ingresos y gastos para los cálculos por mes.
type DatedAmount = { amount: string; date: string };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly incomeService = inject(IncomeService);
  private readonly expenseService = inject(ExpenseService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected user: AuthUser | null = null;
  protected isLoading = false;
  protected errorMessage = '';
  protected isMenuOpen = false;
  protected incomes: Income[] = [];
  protected expenses: Expense[] = [];

  ngOnInit(): void {
    this.loadUser();
    this.loadIncomes();
    this.loadExpenses();
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

  private loadIncomes(): void {
    this.incomeService.list().subscribe({
      next: (incomes) => {
        this.incomes = incomes;
        this.cdr.detectChanges();
      },
      error: () => {
        // Si falla, las tarjetas de ingresos se quedan "sin datos" — no es
        // un error crítico para ver el Dashboard.
      },
    });
  }

  private loadExpenses(): void {
    this.expenseService.list().subscribe({
      next: (expenses) => {
        this.expenses = expenses;
        this.cdr.detectChanges();
      },
      error: () => {
        // Igual que ingresos: si falla, las tarjetas de gasto se quedan en 0.
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

  // --- Cálculos derivados de los datos reales (ingresos y gastos) ---

  private get now(): Date {
    return new Date();
  }

  // Nombre del mes actual en español, ej. "septiembre".
  protected get currentMonthName(): string {
    return this.now.toLocaleDateString('es-GT', { month: 'long' });
  }

  private previousMonthRef(): Date {
    return new Date(this.now.getFullYear(), this.now.getMonth() - 1, 1);
  }

  private isInMonth(dateStr: string, ref: Date): boolean {
    const d = new Date(dateStr);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }

  private sumInMonth(list: DatedAmount[], ref: Date): number {
    return list
      .filter((row) => this.isInMonth(row.date, ref))
      .reduce((acc, row) => acc + Number(row.amount), 0);
  }

  private vsLastMonthPct(list: DatedAmount[]): number | null {
    const previous = this.sumInMonth(list, this.previousMonthRef());
    if (previous <= 0) {
      return null;
    }
    const current = this.sumInMonth(list, this.now);
    return ((current - previous) / previous) * 100;
  }

  // Ingresos
  protected get hasAnyIncome(): boolean {
    return this.incomes.length > 0;
  }

  protected get totalIncomeThisMonth(): number {
    return this.sumInMonth(this.incomes, this.now);
  }

  protected get incomeVsLastMonthPct(): number | null {
    return this.vsLastMonthPct(this.incomes);
  }

  // Dinero disponible TOTAL = todos los ingresos - todos los gastos, sin
  // filtrar por mes. Así el saldo acumulado de meses anteriores cuenta.
  protected get totalIncomeAllTime(): number {
    return this.incomes.reduce((acc, row) => acc + Number(row.amount), 0);
  }

  protected get totalExpenseAllTime(): number {
    return this.expenses.reduce((acc, row) => acc + Number(row.amount), 0);
  }

  protected get availableTotal(): number {
    return this.totalIncomeAllTime - this.totalExpenseAllTime;
  }

  // Gastos
  protected get hasAnyExpense(): boolean {
    return this.expenses.length > 0;
  }

  protected get totalExpenseThisMonth(): number {
    return this.sumInMonth(this.expenses, this.now);
  }

  protected get expenseVsLastMonthPct(): number | null {
    return this.vsLastMonthPct(this.expenses);
  }

  // Porcentaje de los ingresos del mes que se ha gastado.
  protected get percentSpent(): number | null {
    const income = this.totalIncomeThisMonth;
    if (income <= 0) {
      return null;
    }
    return (this.totalExpenseThisMonth / income) * 100;
  }

  // Gastos del mes agrupados por categoría (para la dona de la tarjeta).
  protected get expenseCategoryBreakdown(): CategorySlice[] {
    const palette = ['#000000', '#38b6ff', '#ffffff'];
    const categories = buildCategoryBreakdown(
      this.expenses.filter((e) => this.isInMonth(e.date, this.now)),
    );
    // La maqueta usa tres segmentos: agrupamos el resto para no repetir colores.
    const slices = categories.length > 3
      ? [
          ...categories.slice(0, 2),
          {
            name: 'Otros',
            color: palette[2],
            total: categories.slice(2).reduce((sum, slice) => sum + slice.total, 0),
            pct: categories.slice(2).reduce((sum, slice) => sum + slice.pct, 0),
          },
        ]
      : categories;
    return slices.map((slice, index) => ({ ...slice, color: palette[index] }));
  }

  protected get expenseDonutGradient(): string {
    return categoryDonutGradient(this.expenseCategoryBreakdown);
  }

  // --- Series para las gráficas de barras y de tendencia ---

  private monthLabel(ref: Date): string {
    const label = ref.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  private lastMonths(count: number): { label: string; income: number; expense: number }[] {
    return Array.from({ length: count }, (_, index) => {
      const offset = count - index - 1;
      const ref = new Date(this.now.getFullYear(), this.now.getMonth() - offset, 1);
      return {
        label: this.monthLabel(ref),
        income: this.sumInMonth(this.incomes, ref),
        expense: this.sumInMonth(this.expenses, ref),
      };
    });
  }

  protected get barChartMonths(): { label: string; incomeY: number; expenseY: number }[] {
    const months = this.lastMonths(3);
    const max = Math.max(...months.flatMap((month) => [month.income, month.expense]), 1);
    return months.map((month) => ({
      label: month.label,
      incomeY: 140 - (month.income / max) * 105,
      expenseY: 140 - (month.expense / max) * 105,
    }));
  }

  protected get trendMonths(): { label: string; x: number; incomeY: number; expenseY: number }[] {
    const months = this.lastMonths(4);
    const max = Math.max(...months.flatMap((month) => [month.income, month.expense]), 1);
    return months.map((month, index) => ({
      label: month.label,
      x: 42 + index * 96,
      incomeY: 135 - (month.income / max) * 100,
      expenseY: 135 - (month.expense / max) * 100,
    }));
  }

  protected get incomeTrendPoints(): string {
    return this.trendMonths.map((month) => `${month.x},${month.incomeY}`).join(' ');
  }

  protected get expenseTrendPoints(): string {
    return this.trendMonths.map((month) => `${month.x},${month.expenseY}`).join(' ');
  }

  protected formatCurrency(value: number): string {
    const amount = Math.abs(value).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${value < 0 ? '-' : ''}Q${amount}`;
  }
}
