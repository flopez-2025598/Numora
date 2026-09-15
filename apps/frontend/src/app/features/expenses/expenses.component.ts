import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { AuthUser } from '../../core/auth/auth.model';
import { ExpenseService } from '../../core/expense/expense.service';
import type { Expense, ExpenseCategory, ExpenseType } from '../../core/expense/expense.model';
import { buildCategoryBreakdown, categoryDonutGradient, OTHER_COLOR } from '../../core/expense/expense.util';
import { IncomeService } from '../../core/income/income.service';
import type { Income } from '../../core/income/income.model';
import { notFutureDate, todayISO } from '../../core/validators';

const TYPE_LABELS: Record<ExpenseType, string> = {
  FIXED: 'Fijo',
  VARIABLE: 'Variable',
  EXTRAORDINARY: 'Extra',
};

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
})
export class ExpensesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly expenseService = inject(ExpenseService);
  private readonly incomeService = inject(IncomeService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  protected user: AuthUser | null = null;
  protected isMenuOpen = false;
  protected isLoading = false;
  protected errorMessage = '';

  protected expenses: Expense[] = [];
  protected incomes: Income[] = [];
  protected categories: ExpenseCategory[] = [];
  protected showAll = false;

  protected showExpenseForm = false;
  protected showCategoryForm = false;
  protected isSubmitting = false;
  protected formError = '';
  protected categoryError = '';
  protected deletingCategoryId: number | null = null;

  protected readonly expenseForm = this.fb.group({
    categoryId: ['', Validators.required],
    type: ['VARIABLE' as ExpenseType, Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    description: [''],
    date: [this.today(), [Validators.required, notFutureDate]],
  });

  // Para el atributo [max] del <input type="date">: no deja programar un gasto
  // en una fecha que aún no ha llegado.
  protected get maxDate(): string {
    return todayISO();
  }

  protected readonly categoryForm = this.fb.group({
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

    this.expenseService.listCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.cdr.detectChanges();
      },
    });

    // Los ingresos se usan solo para calcular el dinero disponible
    // (ingresos - gastos) y no dejar gastar de más.
    this.incomeService.list().subscribe({
      next: (incomes) => {
        this.incomes = incomes;
        this.cdr.detectChanges();
      },
      error: () => {
        // silencioso: si falla, availableTotal queda como -total de gastos
      },
    });

    this.expenseService.list().subscribe({
      next: (expenses) => {
        this.expenses = expenses;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.errorMessage = `No se pudieron cargar tus gastos: ${e.error?.error ?? 'Error desconocido'}`;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Dinero disponible = todos los ingresos - todos los gastos (todo el historial).
  protected get availableTotal(): number {
    const incomeTotal = this.incomes.reduce((acc, i) => acc + Number(i.amount), 0);
    return incomeTotal - this.sum(this.expenses);
  }

  // --- Cálculos derivados de los datos reales (nada hardcodeado) ---

  private isInMonth(dateStr: string, ref: Date): boolean {
    const d = new Date(dateStr);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }

  private get now(): Date {
    return new Date();
  }

  private get previousMonthRef(): Date {
    return new Date(this.now.getFullYear(), this.now.getMonth() - 1, 1);
  }

  protected get currentMonthExpenses(): Expense[] {
    return this.expenses.filter((e) => this.isInMonth(e.date, this.now));
  }

  private get previousMonthExpenses(): Expense[] {
    return this.expenses.filter((e) => this.isInMonth(e.date, this.previousMonthRef));
  }

  private sum(list: Expense[]): number {
    return list.reduce((acc, e) => acc + Number(e.amount), 0);
  }

  protected get totalThisMonth(): number {
    return this.sum(this.currentMonthExpenses);
  }

  private get totalPreviousMonth(): number {
    return this.sum(this.previousMonthExpenses);
  }

  protected totalByType(type: ExpenseType): number {
    return this.sum(this.currentMonthExpenses.filter((e) => e.type === type));
  }

  protected vsLastMonthPct(current: number, type?: ExpenseType): number | null {
    const previous = type
      ? this.sum(this.previousMonthExpenses.filter((e) => e.type === type))
      : this.totalPreviousMonth;
    if (previous <= 0) {
      return null;
    }
    return ((current - previous) / previous) * 100;
  }

  protected get categoryBreakdown() {
    return buildCategoryBreakdown(this.currentMonthExpenses);
  }

  protected get donutGradient(): string {
    return categoryDonutGradient(this.categoryBreakdown);
  }

  protected categoryColor(name: string): string {
    return this.categoryBreakdown.find((b) => b.name === name)?.color ?? OTHER_COLOR;
  }

  protected typeLabel(type: ExpenseType): string {
    return TYPE_LABELS[type];
  }

  protected get visibleExpenses(): Expense[] {
    return this.showAll ? this.expenses : this.expenses.slice(0, 5);
  }

  // --- Formularios ---

  protected openExpenseForm(): void {
    this.formError = '';
    this.expenseForm.reset({ type: 'VARIABLE', date: this.today(), categoryId: '', amount: '', description: '' });
    this.showExpenseForm = true;
  }

  protected closeExpenseForm(): void {
    this.showExpenseForm = false;
  }

  protected openCategoryForm(): void {
    this.formError = '';
    this.categoryError = '';
    this.categoryForm.reset({ name: '' });
    this.showCategoryForm = true;
  }

  protected closeCategoryForm(): void {
    this.showCategoryForm = false;
  }

  protected submitExpense(): void {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const { categoryId, type, amount, description, date } = this.expenseForm.getRawValue();

    // No se puede gastar más de lo que se tiene disponible.
    if (Number(amount) > this.availableTotal) {
      this.formError = `No puedes gastar más de lo que tienes disponible (${this.formatCurrency(this.availableTotal)}).`;
      return;
    }

    this.isSubmitting = true;
    this.formError = '';

    this.expenseService.create({
      categoryId: Number(categoryId),
      type: type as ExpenseType,
      amount: String(amount),
      description: description || undefined,
      date: date!,
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showExpenseForm = false;
        this.loadAll();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.formError = e.error?.error ?? 'No se pudo registrar el gasto.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected submitCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const { name } = this.categoryForm.getRawValue();
    this.isSubmitting = true;
    this.formError = '';

    this.expenseService.createCategory({ name: name! }).subscribe({
      next: (category) => {
        this.isSubmitting = false;
        this.categories = [...this.categories, category].sort((a, b) => a.name.localeCompare(b.name));
        this.categoryForm.reset({ name: '' });
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.formError = e.error?.error ?? 'No se pudo crear la categoría.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected deleteExpense(expense: Expense): void {
    this.expenseService.remove(expense.id).subscribe({
      next: () => this.loadAll(),
    });
  }

  protected deleteCategory(category: ExpenseCategory): void {
    // Las categorías predeterminadas (userId null) no se pueden borrar.
    if (category.userId === null) {
      return;
    }

    this.categoryError = '';
    this.deletingCategoryId = category.id;

    this.expenseService.removeCategory(category.id).subscribe({
      next: () => {
        this.categories = this.categories.filter((c) => c.id !== category.id);
        this.deletingCategoryId = null;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.categoryError = e.error?.error ?? 'No se pudo eliminar la categoría.';
        this.deletingCategoryId = null;
        this.cdr.detectChanges();
      },
    });
  }

  protected formatCurrency(value: number | string): string {
    const n = typeof value === 'string' ? Number(value) : value;
    return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
