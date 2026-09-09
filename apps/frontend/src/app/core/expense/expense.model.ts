export type ExpenseType = 'FIXED' | 'VARIABLE' | 'EXTRAORDINARY';

export interface ExpenseCategory {
  id: number;
  name: string;
  userId: number | null;
}

export interface Expense {
  id: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  type: ExpenseType;
  amount: string;
  description: string | null;
  date: string;
  createdAt: string;
}

export interface CreateExpenseCategoryRequest {
  name: string;
}

export interface CreateExpenseRequest {
  categoryId: number;
  type: ExpenseType;
  amount: string;
  description?: string;
  date: string;
}
