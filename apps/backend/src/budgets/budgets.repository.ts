import { prisma } from '../db/prisma.js';

export const budgetsRepository = {
  findAllByUserForPeriod(userId: number, month: number, year: number) {
    return prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
      orderBy: { category: { name: 'asc' } },
    });
  },

  findByIdForUser(id: number, userId: number) {
    return prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  },

  findByCategoryAndPeriod(userId: number, categoryId: number, month: number, year: number) {
    return prisma.budget.findFirst({
      where: { userId, categoryId, month, year },
    });
  },

  create(userId: number, data: { categoryId: number; amount: string; month: number; year: number }) {
    return prisma.budget.create({
      data: { userId, ...data },
      include: { category: true },
    });
  },

  update(id: number, amount: string) {
    return prisma.budget.update({
      where: { id },
      data: { amount },
      include: { category: true },
    });
  },

  delete(id: number) {
    return prisma.budget.delete({ where: { id } });
  },

  // Cuánto se ha gastado en una categoría durante un mes/año específico,
  // para poder comparar contra el límite del presupuesto.
  async spentForCategoryInPeriod(userId: number, categoryId: number, month: number, year: number): Promise<string> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const result = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { userId, categoryId, date: { gte: start, lt: end } },
    });

    return result._sum.amount?.toString() ?? '0';
  },
};
