export interface ReportPeriod {
  from: string;
  to: string;
}

export interface ExpenseCategoryReportItem {
  categoryId: number;
  categoryName: string;
  total: string;
}

export interface ExpensesByCategoryReport {
  period: ReportPeriod;
  total: string;
  categories: ExpenseCategoryReportItem[];
}

export interface IncomeVsExpensesReport {
  period: ReportPeriod;
  income: { total: string };
  expenses: { total: string };
  balance: { available: string };
}
