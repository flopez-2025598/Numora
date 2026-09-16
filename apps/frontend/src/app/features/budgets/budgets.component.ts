import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { AuthUser } from '../../core/auth/auth.model';
import { BudgetService } from '../../core/budget/budget.service';
import type { Budget } from '../../core/budget/budget.model';
import { ExpenseService } from '../../core/expense/expense.service';
import type { ExpenseCategory } from '../../core/expense/expense.model';

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.scss',
})
export class BudgetsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly budgetService = inject(BudgetService);
  private readonly expenseService = inject(ExpenseService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  protected user: AuthUser | null = null;
  protected isMenuOpen = false;
  protected isLoading = false;
  protected errorMessage = '';

  protected budgets: Budget[] = [];
  protected categories: ExpenseCategory[] = [];

  protected showBudgetForm = false;
  protected editingBudget: Budget | null = null;
  protected isSubmitting = false;
  protected formError = '';
  protected deletingBudgetId: number | null = null;

  private readonly now = new Date();
  protected readonly currentMonth = this.now.getMonth() + 1;
  protected readonly currentYear = this.now.getFullYear();

  protected readonly budgetForm = this.fb.group({
    categoryId: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]],
  });

  protected get periodLabel(): string {
    return `${MONTH_NAMES[this.currentMonth - 1]} ${this.currentYear}`;
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

    this.expenseService.listCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.cdr.detectChanges();
      },
    });

    this.budgetService.list(this.currentMonth, this.currentYear).subscribe({
      next: (budgets) => {
        this.budgets = budgets;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.errorMessage = `No se pudieron cargar tus presupuestos: ${e.error?.error ?? 'Error desconocido'}`;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // --- Totales del mes ---

  protected get totalBudgeted(): number {
    return this.budgets.reduce((acc, b) => acc + Number(b.amount), 0);
  }

  protected get totalSpent(): number {
    return this.budgets.reduce((acc, b) => acc + Number(b.spent), 0);
  }

  protected get totalRemaining(): number {
    return this.totalBudgeted - this.totalSpent;
  }

  protected get overBudgetCount(): number {
    return this.budgets.filter((b) => b.percentUsed >= 100).length;
  }

  // Categorías que todavía no tienen presupuesto este mes — las únicas
  // que tiene sentido ofrecer al crear un presupuesto nuevo.
  protected get availableCategories(): ExpenseCategory[] {
    const used = new Set(this.budgets.map((b) => b.categoryId));
    return this.categories.filter((c) => !used.has(c.id));
  }

  protected progressState(pct: number): 'ok' | 'warn' | 'over' {
    if (pct >= 100) return 'over';
    if (pct >= 80) return 'warn';
    return 'ok';
  }

  // --- Formulario ---

  protected openCreateForm(): void {
    this.editingBudget = null;
    this.formError = '';
    this.budgetForm.reset({ categoryId: '', amount: '' });
    this.budgetForm.controls.categoryId.enable();
    this.showBudgetForm = true;
  }

  protected openEditForm(budget: Budget): void {
    this.editingBudget = budget;
    this.formError = '';
    this.budgetForm.reset({ categoryId: String(budget.categoryId), amount: budget.amount });
    this.budgetForm.controls.categoryId.disable();
    this.showBudgetForm = true;
  }

  protected closeForm(): void {
    this.showBudgetForm = false;
    this.editingBudget = null;
  }

  protected submitBudget(): void {
    if (this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      return;
    }

    const { categoryId, amount } = this.budgetForm.getRawValue();
    this.isSubmitting = true;
    this.formError = '';

    const request = this.editingBudget
      ? this.budgetService.update(this.editingBudget.id, { amount: String(amount) })
      : this.budgetService.create({
          categoryId: Number(categoryId),
          amount: String(amount),
          month: this.currentMonth,
          year: this.currentYear,
        });

    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showBudgetForm = false;
        this.editingBudget = null;
        this.loadAll();
      },
      error: (err: unknown) => {
        const e = err as { error?: { error?: string } };
        this.formError = e.error?.error ?? 'No se pudo guardar el presupuesto.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected deleteBudget(budget: Budget): void {
    this.deletingBudgetId = budget.id;
    this.budgetService.remove(budget.id).subscribe({
      next: () => {
        this.deletingBudgetId = null;
        this.loadAll();
      },
      error: () => {
        this.deletingBudgetId = null;
        this.cdr.detectChanges();
      },
    });
  }

  protected isOverBudget(remaining: string): boolean {
    return Number(remaining) < 0;
  }

  protected formatCurrency(value: number | string): string {
    const n = typeof value === 'string' ? Number(value) : value;
    return `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  protected formatAbsCurrency(value: string): string {
    return this.formatCurrency(Math.abs(Number(value)));
  }
}
