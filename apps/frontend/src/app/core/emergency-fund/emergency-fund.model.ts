export interface EmergencyFund {
  id: number;
  userId: number;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'DEPOSIT' | 'WITHDRAWAL';

export interface EmergencyFundMovement {
  id: number;
  emergencyFundId: number;
  type: MovementType;
  amount: string;
  date: string;
  description: string | null;
  createdAt: string;
}

export interface MovementRequest {
  amount: string;
  description?: string;
}
