import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { AuthUser } from '../../core/auth/auth.model';
import { IncomeService } from '../../core/income/income.service';
import type { Income } from '../../core/income/income.model';

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
  private readonly cdr = inject(ChangeDetectorRef);
  protected user: AuthUser | null = null;
  protected isLoading = false;
  protected errorMessage = '';
  protected isMenuOpen = false;
  protected incomes: Income[] = [];

  ngOnInit(): void {
    this.loadUser();
    this.loadIncomes();
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
    // Los gastos todavía no tienen su propio módulo conectado, así que las
    // gráficas de "Ingresos vs. Gastos" y "Tendencia mensual" muestran
    // Ingresos reales y Gastos en 0 (real, no inventado) hasta que exista
    // ese módulo.
    this.incomeService.list().subscribe({
      next: (incomes) => {
        this.incomes = incomes;
        this.cdr.detectChanges();
      },
      error: () => {
        // Si falla, las tarjetas de ingresos se quedan en su estado
        // "sin datos" — no es un error crítico para ver el Dashboard.
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

  // --- Cálculos derivados de los ingresos reales ---

  private get now(): Date {
    return new Date();
  }

  private isInMonth(dateStr: string, ref: Date): boolean {
    const d = new Date(dateStr);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }

  private sum(list: Income[]): number {
    return list.reduce((acc, i) => acc + Number(i.amount), 0);
  }

  private monthTotal(ref: Date): number {
    return this.sum(this.incomes.filter((i) => this.isInMonth(i.date, ref)));
  }

  protected get hasAnyIncome(): boolean {
    return this.incomes.length > 0;
  }

  protected get totalIncomeThisMonth(): number {
    return this.monthTotal(this.now);
  }

  protected get incomeVsLastMonthPct(): number | null {
    const previousRef = new Date(this.now.getFullYear(), this.now.getMonth() - 1, 1);
    const previous = this.monthTotal(previousRef);
    if (previous <= 0) {
      return null;
    }
    return ((this.totalIncomeThisMonth - previous) / previous) * 100;
  }

  // Últimos 3 meses para la gráfica de barras (Gastos siempre en 0: sin
  // módulo de gastos todavía no hay con qué compararlo de verdad).
  private monthLabel(ref: Date): string {
    const label = ref.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  private lastMonths(count: number): { label: string; income: number; expense: number }[] {
    return Array.from({ length: count }, (_, index) => {
      const offset = count - index - 1;
      const ref = new Date(this.now.getFullYear(), this.now.getMonth() - offset, 1);
      return { label: this.monthLabel(ref), income: this.monthTotal(ref), expense: 0 };
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

  // Últimos 6 meses para la línea de tendencia, convertidos a puntos de un
  // <svg viewBox="0 0 260 100">. Gastos queda como línea plana en la base.
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
    return `Q${value.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
