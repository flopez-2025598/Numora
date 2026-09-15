import type { Request, Response } from 'express';
import { expensesService } from './expenses.service.js';
import type { UpdateExpenseInput } from './expenses.types.js';

function handleError(err: unknown, res: Response) {
  if (err instanceof Error) {
    if (err.message === 'EXPENSE_NOT_FOUND') {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }
    if (err.message === 'EXPENSE_CATEGORY_NOT_FOUND') {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    if (err.message === 'EXPENSE_CATEGORY_GLOBAL') {
      return res.status(403).json({ error: 'No puedes eliminar una categoría predeterminada' });
    }
    if (err.message === 'EXPENSE_CATEGORY_IN_USE') {
      return res.status(409).json({ error: 'Esta categoría tiene gastos registrados. Elimina o reasigna esos gastos primero.' });
    }
    if (err.message === 'FUTURE_DATE') {
      return res.status(400).json({ error: 'No puedes registrar un gasto con una fecha que aún no ha llegado' });
    }
    if (err.message === 'INSUFFICIENT_FUNDS') {
      return res.status(409).json({ error: 'No puedes gastar más de lo que tienes disponible' });
    }
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

export const expensesController = {
  async listCategories(req: Request, res: Response) {
    const userId = req.auth!.userId;
    try {
      const categories = await expensesService.listCategories(userId);
      return res.status(200).json(categories);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async createCategory(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    try {
      const category = await expensesService.createCategory(userId, { name });
      return res.status(201).json(category);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async removeCategory(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    try {
      await expensesService.deleteCategory(userId, id);
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  },

  async create(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const { categoryId, type, amount, description, date } = req.body;

    if (!categoryId || !type || !amount || !date) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    try {
      const expense = await expensesService.create(userId, {
        categoryId: Number(categoryId),
        type,
        amount: String(amount),
        date,
        ...(description !== undefined && { description }),
      });
      return res.status(201).json(expense);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async list(req: Request, res: Response) {
    const userId = req.auth!.userId;
    try {
      const expenses = await expensesService.listForUser(userId);
      return res.status(200).json(expenses);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async getOne(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    try {
      const expense = await expensesService.getOne(id, userId);
      return res.status(200).json(expense);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async update(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { categoryId, type, amount, description, date } = req.body;

    try {
      const input: UpdateExpenseInput = {
        ...(categoryId !== undefined && { categoryId: Number(categoryId) }),
        ...(type !== undefined && { type }),
        ...(amount !== undefined && { amount: String(amount) }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date }),
      };

      const expense = await expensesService.update(id, userId, input);
      return res.status(200).json(expense);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async remove(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    try {
      await expensesService.remove(id, userId);
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  },
};