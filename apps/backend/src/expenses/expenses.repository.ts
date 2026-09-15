import { prisma } from '../db/prisma.js';

export const expensesRepository = {
  // Categorías
  findCategoriesForUser(userId: number) {
    return prisma.expenseCategory.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: { name: 'asc' },
    });
  },

  findCategoryById(id: number) {
    return prisma.expenseCategory.findUnique({ where: { id } });
  },

  createCategory(userId: number, name: string) {
    return prisma.expenseCategory.create({
      data: { userId, name },
    });
  },

  countExpensesForCategory(categoryId: number) {
    return prisma.expense.count({ where: { categoryId } });
  },

  // Suma de todos los ingresos y de todos los gastos del usuario, para saber
  // cuánto dinero tiene disponible (ingresos - gastos).
  async userTotals(userId: number): Promise<{ incomeTotal: string; expenseTotal: string }> {
    const [income, expense] = await Promise.all([
      prisma.income.aggregate({ _sum: { amount: true }, where: { userId } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { userId } }),
    ]);
    return {
      incomeTotal: income._sum.amount?.toString() ?? '0',
      expenseTotal: expense._sum.amount?.toString() ?? '0',
    };
  },

  deleteCategory(id: number) {
    return prisma.expenseCategory.delete({ where: { id } });
  },

  // Gastos
  create(userId: number, data: {
    categoryId: number;
    type: 'FIXED' | 'VARIABLE' | 'EXTRAORDINARY';
    amount: string;
    description?: string;
    date: Date;
  }) {
    return prisma.expense.create({
      data: { userId, ...data },
      include: { category: true },
    });
  },

  findAllByUser(userId: number) {
    return prisma.expense.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: 'desc' },
    });
  },

  findByIdForUser(id: number, userId: number) {
    return prisma.expense.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  },

  update(id: number, data: Partial<{
    categoryId: number;
    type: 'FIXED' | 'VARIABLE' | 'EXTRAORDINARY';
    amount: string;
    description: string;
    date: Date;
  }>) {
    return prisma.expense.update({
      where: { id },
      data,
      include: { category: true },
    });
  },

  delete(id: number) {
    return prisma.expense.delete({ where: { id } });
  },
};
