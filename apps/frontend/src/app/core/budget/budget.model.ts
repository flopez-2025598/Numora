export interface Budget {
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

export interface CreateBudgetRequest {
  categoryId: number;
  amount: string;
  month: number;
  year: number;
}

export interface UpdateBudgetRequest {
  amount: string;
}
