export type IncomeType = 'FIXED' | 'VARIABLE' | 'EXTRAORDINARY';

export interface IncomeSource {
  id: number;
  name: string;
  userId: number | null;
}

export interface Income {
  id: number;
  userId: number;
  incomeSourceId: number;
  incomeSourceName: string;
  type: IncomeType;
  amount: string;
  description: string | null;
  date: string;
  createdAt: string;
}

export interface CreateIncomeSourceRequest {
  name: string;
}

export interface CreateIncomeRequest {
  incomeSourceId: number;
  type: IncomeType;
  amount: string;
  description?: string;
  date: string;
}
