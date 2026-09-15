import { incomeRepository } from './income.repository.js';
import { isFutureDate } from '../shared/date.util.js';
import type {
  CreateIncomeInput,
  UpdateIncomeInput,
  IncomeOutput,
  CreateIncomeSourceInput,
  IncomeSourceOutput,
} from './income.types.js';

function toIncomeOutput(income: {
  id: number;
  userId: number;
  incomeSourceId: number;
  incomeSource: { name: string };
  type: string;
  amount: unknown;
  description: string | null;
  date: Date;
  createdAt: Date;
}): IncomeOutput {
  return {
    id: income.id,
    userId: income.userId,
    incomeSourceId: income.incomeSourceId,
    incomeSourceName: income.incomeSource.name,
    type: income.type,
    amount: income.amount!.toString(),
    description: income.description,
    date: income.date,
    createdAt: income.createdAt,
  };
}

export const incomeService = {
  async listSources(userId: number): Promise<IncomeSourceOutput[]> {
    const sources = await incomeRepository.findSourcesForUser(userId);
    const seen = new Set<string>();
    return sources.filter((source) => {
      const key = source.name.trim().toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((s) => ({ id: s.id, name: s.name, userId: s.userId }));
  },

  async createSource(userId: number, input: CreateIncomeSourceInput): Promise<IncomeSourceOutput> {
    const source = await incomeRepository.createSource(userId, input.name);
    return { id: source.id, name: source.name, userId: source.userId };
  },

  async create(userId: number, input: CreateIncomeInput): Promise<IncomeOutput> {
    // No se puede registrar un ingreso con fecha futura: solo cuenta lo ya recibido.
    if (isFutureDate(input.date)) {
      throw new Error('FUTURE_DATE');
    }

    const source = await incomeRepository.findSourceById(input.incomeSourceId);
    if (!source) {
      throw new Error('INCOME_SOURCE_NOT_FOUND');
    }
    if (source.userId !== null && source.userId !== userId) {
      throw new Error('INCOME_SOURCE_NOT_FOUND');
    }

const income = await incomeRepository.create(userId, {
  incomeSourceId: input.incomeSourceId,
  type: input.type,
  amount: input.amount,
  date: new Date(input.date),
  ...(input.description !== undefined && { description: input.description }),
});

    return toIncomeOutput(income);
  },

  async listForUser(userId: number): Promise<IncomeOutput[]> {
    const incomes = await incomeRepository.findAllByUser(userId);
    return incomes.map(toIncomeOutput);
  },

  async getOne(id: number, userId: number): Promise<IncomeOutput> {
    const income = await incomeRepository.findByIdForUser(id, userId);
    if (!income) {
      throw new Error('INCOME_NOT_FOUND');
    }
    return toIncomeOutput(income);
  },

  async update(id: number, userId: number, input: UpdateIncomeInput): Promise<IncomeOutput> {
    const existing = await incomeRepository.findByIdForUser(id, userId);
    if (!existing) {
      throw new Error('INCOME_NOT_FOUND');
    }

    const data: Record<string, unknown> = {};
    if (input.incomeSourceId !== undefined) data.incomeSourceId = input.incomeSourceId;
    if (input.type !== undefined) data.type = input.type;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.description !== undefined) data.description = input.description;
    if (input.date !== undefined) data.date = new Date(input.date);

    const updated = await incomeRepository.update(id, data);
    return toIncomeOutput(updated);
  },

  async remove(id: number, userId: number): Promise<void> {
    const existing = await incomeRepository.findByIdForUser(id, userId);
    if (!existing) {
      throw new Error('INCOME_NOT_FOUND');
    }
    await incomeRepository.delete(id);
  },
};
