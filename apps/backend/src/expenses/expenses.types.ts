export type ExpenseType = 'FIXED' | 'VARIABLE' | 'EXTRAORDINARY';

export interface ExpenseCategoryOutput {
  id: number;
  name: string;
  userId: number | null;
}

export interface CreateExpenseCategoryInput {
  name: string;
}

export interface CreateExpenseInput {
  categoryId: number;
  type: ExpenseType;
  amount: string;
  description?: string;
  date: string;
}

export interface UpdateExpenseInput {
  categoryId?: number;
  type?: ExpenseType;
  amount?: string;
  description?: string;
  date?: string;
}

export interface ExpenseOutput {
  id: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  type: ExpenseType;
  amount: string;
  description: string | null;
  date: Date;
  createdAt: Date;
}
