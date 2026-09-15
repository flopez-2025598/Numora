import { Decimal } from 'decimal.js';
import { expensesRepository } from './expenses.repository.js';
import { isFutureDate } from '../shared/date.util.js';
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseOutput,
  ExpenseType,
  CreateExpenseCategoryInput,
  ExpenseCategoryOutput,
} from './expenses.types.js';

function toExpenseOutput(expense: {
  id: number;
  userId: number;
  categoryId: number;
  category: { name: string };
  type: string;
  amount: unknown;
  description: string | null;
  date: Date;
  createdAt: Date;
}): ExpenseOutput {
  return {
    id: expense.id,
    userId: expense.userId,
    categoryId: expense.categoryId,
    categoryName: expense.category.name,
    type: expense.type as ExpenseType,
    amount: (expense.amount as { toString(): string }).toString(),
    description: expense.description,
    date: expense.date,
    createdAt: expense.createdAt,
  };
}

export const expensesService = {
  async listCategories(userId: number): Promise<ExpenseCategoryOutput[]> {
    const categories = await expensesRepository.findCategoriesForUser(userId);
    const seen = new Set<string>();
    return categories.filter((category) => {
      const key = category.name.trim().toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((c) => ({ id: c.id, name: c.name, userId: c.userId }));
  },

  async createCategory(userId: number, input: CreateExpenseCategoryInput): Promise<ExpenseCategoryOutput> {
    const category = await expensesRepository.createCategory(userId, input.name);
    return { id: category.id, name: category.name, userId: category.userId };
  },

  async deleteCategory(userId: number, id: number): Promise<void> {
    const category = await expensesRepository.findCategoryById(id);
    if (!category) {
      throw new Error('EXPENSE_CATEGORY_NOT_FOUND');
    }
    // Las categorías globales (userId null, vienen del seed) no se pueden borrar.
    if (category.userId === null) {
      throw new Error('EXPENSE_CATEGORY_GLOBAL');
    }
    // Un usuario solo puede borrar sus propias categorías.
    if (category.userId !== userId) {
      throw new Error('EXPENSE_CATEGORY_NOT_FOUND');
    }
    // No se puede borrar una categoría que todavía tiene gastos asociados.
    const inUse = await expensesRepository.countExpensesForCategory(id);
    if (inUse > 0) {
      throw new Error('EXPENSE_CATEGORY_IN_USE');
    }

    await expensesRepository.deleteCategory(id);
  },

  async create(userId: number, input: CreateExpenseInput): Promise<ExpenseOutput> {
    // No se puede registrar un gasto con una fecha que aún no ha llegado.
    if (isFutureDate(input.date)) {
      throw new Error('FUTURE_DATE');
    }

    const category = await expensesRepository.findCategoryById(input.categoryId);
    if (!category) {
      throw new Error('EXPENSE_CATEGORY_NOT_FOUND');
    }
    if (category.userId !== null && category.userId !== userId) {
      throw new Error('EXPENSE_CATEGORY_NOT_FOUND');
    }

    // No se puede gastar más de lo que se tiene disponible (ingresos - gastos).
    const { incomeTotal, expenseTotal } = await expensesRepository.userTotals(userId);
    const available = new Decimal(incomeTotal).minus(expenseTotal);
    if (new Decimal(input.amount).greaterThan(available)) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    const expense = await expensesRepository.create(userId, {
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      date: new Date(input.date),
      ...(input.description !== undefined && { description: input.description }),
    });

    return toExpenseOutput(expense);
  },

  async listForUser(userId: number): Promise<ExpenseOutput[]> {
    const expenses = await expensesRepository.findAllByUser(userId);
    return expenses.map(toExpenseOutput);
  },

  async getOne(id: number, userId: number): Promise<ExpenseOutput> {
    const expense = await expensesRepository.findByIdForUser(id, userId);
    if (!expense) {
      throw new Error('EXPENSE_NOT_FOUND');
    }
    return toExpenseOutput(expense);
  },

  async update(id: number, userId: number, input: UpdateExpenseInput): Promise<ExpenseOutput> {
    const existing = await expensesRepository.findByIdForUser(id, userId);
    if (!existing) {
      throw new Error('EXPENSE_NOT_FOUND');
    }

    const data: Record<string, unknown> = {};
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.type !== undefined) data.type = input.type;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.description !== undefined) data.description = input.description;
    if (input.date !== undefined) data.date = new Date(input.date);

    const updated = await expensesRepository.update(id, data);
    return toExpenseOutput(updated);
  },

  async remove(id: number, userId: number): Promise<void> {
    const existing = await expensesRepository.findByIdForUser(id, userId);
    if (!existing) {
      throw new Error('EXPENSE_NOT_FOUND');
    }
    await expensesRepository.delete(id);
  },
};
