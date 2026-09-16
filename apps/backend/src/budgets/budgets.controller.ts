import type { Request, Response } from 'express';
import { budgetsService } from './budgets.service.js';

function handleError(err: unknown, res: Response) {
  if (err instanceof Error) {
    if (err.message === 'BUDGET_NOT_FOUND') {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }
    if (err.message === 'EXPENSE_CATEGORY_NOT_FOUND') {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    if (err.message === 'BUDGET_ALREADY_EXISTS') {
      return res.status(409).json({ error: 'Ya existe un presupuesto para esta categoría en este mes' });
    }
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

// Mes/año a usar cuando no vienen en la query: el mes actual.
function resolvePeriod(req: Request): { month: number; year: number } {
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();
  return { month, year };
}

export const budgetsController = {
  async list(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const { month, year } = resolvePeriod(req);

    if (Number.isNaN(month) || Number.isNaN(year)) {
      return res.status(400).json({ error: 'Mes o año inválido' });
    }

    try {
      const budgets = await budgetsService.listForPeriod(userId, month, year);
      return res.status(200).json(budgets);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async create(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const { categoryId, amount, month, year } = req.body;

    if (!categoryId || !amount || !month || !year) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    try {
      const budget = await budgetsService.create(userId, {
        categoryId: Number(categoryId),
        amount: String(amount),
        month: Number(month),
        year: Number(year),
      });
      return res.status(201).json(budget);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async update(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const id = Number(req.params.id);
    const { amount } = req.body;

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    if (!amount) {
      return res.status(400).json({ error: 'Falta el monto' });
    }

    try {
      const budget = await budgetsService.update(id, userId, { amount: String(amount) });
      return res.status(200).json(budget);
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
      await budgetsService.remove(id, userId);
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  },
};
