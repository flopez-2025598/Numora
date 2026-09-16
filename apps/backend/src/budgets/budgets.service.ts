import { Decimal } from 'decimal.js';
import { budgetsRepository } from './budgets.repository.js';
import { expensesRepository } from '../expenses/expenses.repository.js';
import type { CreateBudgetInput, UpdateBudgetInput, BudgetOutput } from './budgets.types.js';

function toBudgetOutput(
  budget: {
    id: number;
    userId: number;
    categoryId: number;
    category: { name: string };
    amount: unknown;
    month: number;
    year: number;
  },
  spent: string,
): BudgetOutput {
  const amount = new Decimal((budget.amount as { toString(): string }).toString());
  const spentDecimal = new Decimal(spent);
  const remaining = amount.minus(spentDecimal);
  const percentUsed = amount.isZero() ? 0 : spentDecimal.div(amount).times(100).toNumber();

  return {
    id: budget.id,
    userId: budget.userId,
    categoryId: budget.categoryId,
    categoryName: budget.category.name,
    amount: amount.toString(),
    month: budget.month,
    year: budget.year,
    spent: spentDecimal.toString(),
    remaining: remaining.toString(),
    percentUsed,
  };
}

export const budgetsService = {
  async listForPeriod(userId: number, month: number, year: number): Promise<BudgetOutput[]> {
    const budgets = await budgetsRepository.findAllByUserForPeriod(userId, month, year);

    return Promise.all(
      budgets.map(async (budget) => {
        const spent = await budgetsRepository.spentForCategoryInPeriod(userId, budget.categoryId, month, year);
        return toBudgetOutput(budget, spent);
      }),
    );
  },

  async create(userId: number, input: CreateBudgetInput): Promise<BudgetOutput> {
    const category = await expensesRepository.findCategoryById(input.categoryId);
    if (!category) {
      throw new Error('EXPENSE_CATEGORY_NOT_FOUND');
    }
    if (category.userId !== null && category.userId !== userId) {
      throw new Error('EXPENSE_CATEGORY_NOT_FOUND');
    }

    const existing = await budgetsRepository.findByCategoryAndPeriod(userId, input.categoryId, input.month, input.year);
    if (existing) {
      throw new Error('BUDGET_ALREADY_EXISTS');
    }

    const budget = await budgetsRepository.create(userId, {
      categoryId: input.categoryId,
      amount: input.amount,
      month: input.month,
      year: input.year,
    });

    const spent = await budgetsRepository.spentForCategoryInPeriod(userId, input.categoryId, input.month, input.year);
    return toBudgetOutput(budget, spent);
  },

  async update(id: number, userId: number, input: UpdateBudgetInput): Promise<BudgetOutput> {
    const existing = await budgetsRepository.findByIdForUser(id, userId);
    if (!existing) {
      throw new Error('BUDGET_NOT_FOUND');
    }

    const updated = await budgetsRepository.update(id, input.amount);
    const spent = await budgetsRepository.spentForCategoryInPeriod(userId, existing.categoryId, existing.month, existing.year);
    return toBudgetOutput(updated, spent);
  },

  async remove(id: number, userId: number): Promise<void> {
    const existing = await budgetsRepository.findByIdForUser(id, userId);
    if (!existing) {
      throw new Error('BUDGET_NOT_FOUND');
    }

    await budgetsRepository.delete(id);
  },
};
