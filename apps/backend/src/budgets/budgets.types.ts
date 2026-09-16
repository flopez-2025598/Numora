export interface CreateBudgetInput {
  categoryId: number;
  amount: string;
  month: number;
  year: number;
}

export interface UpdateBudgetInput {
  amount: string;
}

export interface BudgetOutput {
  id: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  amount: string;
  month: number;
  year: number;
  spent: string;
  remaining: string;
  percentUsed: number;
}
