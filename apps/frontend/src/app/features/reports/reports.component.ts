import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { AuthUser } from '../../core/auth/auth.model';
import { ReportsService } from '../../core/reports/reports.service';
import type { ExpensesByCategoryReport, IncomeVsExpensesReport } from '../../core/reports/reports.model';
import { ExpenseService } from '../../core/expense/expense.service';
import type { Expense } from '../../core/expense/expense.model';
import { IncomeService } from '../../core/income/income.service';
import type { Income } from '../../core/income/income.model';
import { buildCategorySlicesFromTotals, categoryDonutGradient, type CategorySlice } from '../../core/expense/expense.util';
import { todayISO } from '../../core/validators';

type DatedAmount = { amount: string; date: string };

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reportsService = inject(ReportsService);
  private readonly expenseService = inject(ExpenseService);
  private readonly incomeService = inject(IncomeService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  protected user: AuthUser | null = null;
  protected isMenuOpen = false;
  protected isLoading = false;
  protected errorMessage = '';

  protected categoryReport: ExpensesByCategoryReport | null = null;
  protected ieReport: IncomeVsExpensesReport | null = null;

  // Se cargan una sola vez y sirven para la tendencia de 6 meses, que no
  // depende del período seleccionado arriba (siempre muestra el semestre).
  private incomes: Income[] = [];
  private expenses: Expense[] = [];

  protected readonly periodForm = this.fb.group({
    from: [this.firstDayOfMonth(), Validators.required],
    to: [todayISO(), Validators.required],
  });

  ngOnInit(): void {
    this.loadUser();
    this.loadTrendData();
    this.loadPeriodReports();
  }

  private firstDayOfMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
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

  private loadTrendData(): void {
    this.expenseService.list().subscribe({ next: (expenses) => { this.expenses = expenses; this.cdr.detectChanges(); } });
    this.incomeService.list().subscribe({ next: (incomes) => { this.incomes = incomes; this.cdr.detectChanges(); } });
  }

  protected loadPeriodReports(): void {
    if (this.periodForm.invalid) {
      this.periodForm.markAllAsTouched();
      return;
    }

    const { from, to } = this.periodForm.getRawValue();
    this.isLoading = true;
    this.errorMessage = '';

    this.reportsService.getExpensesByCategory(from!, to!).subscribe({
      next: (report) => {
        this.categoryReport = report;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.errorMessage = e.error?.error ?? 'No se pudieron cargar los reportes.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });

    this.reportsService.getIncomeVsExpenses(from!, to!).subscribe({
      next: (report) => {
        this.ieReport = report;
        this.cdr.detectChanges();
      },
    });
  }

  // --- Gastos por categoría (donut) ---

  protected get categorySlices(): CategorySlice[] {
    if (!this.categoryReport) return [];
    return buildCategorySlicesFromTotals(
      this.categoryReport.categories.map((c) => ({ name: c.categoryName, total: Number(c.total) })),
    );
  }

  protected get donutGradient(): string {
    return categoryDonutGradient(this.categorySlices);
  }

  // --- Tendencia de los últimos 6 meses (ingresos vs. gastos) ---

  private isInMonth(dateStr: string, ref: Date): boolean {
    const [year, month] = dateStr.slice(0, 10).split('-').map(Number);
    return year === ref.getFullYear() && month === ref.getMonth() + 1;
  }

  private sumInMonth(list: DatedAmount[], ref: Date): number {
    return list.filter((row) => this.isInMonth(row.date, ref)).reduce((acc, row) => acc + Number(row.amount), 0);
  }

  private monthLabel(ref: Date): string {
    const label = ref.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  protected get trendMonths(): { label: string; income: number; expense: number; incomeY: number; expenseY: number }[] {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const ref = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        label: this.monthLabel(ref),
        income: this.sumInMonth(this.incomes, ref),
        expense: this.sumInMonth(this.expenses, ref),
      };
    });

    const max = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1);
    return months.map((m) => ({
      ...m,
      incomeY: 130 - (m.income / max) * 110,
      expenseY: 130 - (m.expense / max) * 110,
    }));
  }

  protected formatCurrency(value: number | string): string {
    const n = typeof value === 'string' ? Number(value) : value;
    return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
