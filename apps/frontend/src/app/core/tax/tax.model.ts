export type TaxType = 'ISR' | 'IGSS';

export interface TaxSetting {
  id: number;
  name: string;
  rate: string;
}

export interface TaxParameter {
  id: number;
  userId: number;
  taxType: TaxType;
  rate: string;
  validFrom: string;
  validTo: string | null;
}

export interface CreateTaxParameterRequest {
  taxType: TaxType;
  rate: string;
  validFrom: string;
}

export interface CalculateTaxRequest {
  taxType: TaxType | 'IVA';
  baseAmount: string;
}

export interface CalculateTaxResult {
  taxType: string;
  baseAmount: string;
  rate: string;
  amount: string;
}
