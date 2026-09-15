import type { Request, Response } from 'express';
import { incomeService } from './income.service.js';
import type { UpdateIncomeInput } from './income.types.js';

function handleError(err: unknown, res: Response) {
  if (err instanceof Error) {
    if (err.message === 'INCOME_NOT_FOUND') {
      return res.status(404).json({ error: 'Ingreso no encontrado' });
    }
    if (err.message === 'INCOME_SOURCE_NOT_FOUND') {
      return res.status(404).json({ error: 'Fuente de ingreso no encontrada' });
    }
    if (err.message === 'FUTURE_DATE') {
      return res.status(400).json({ error: 'No puedes registrar un ingreso con una fecha que aún no ha llegado' });
    }
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

export const incomeController = {
  async listSources(req: Request, res: Response) {
    const userId = req.auth!.userId;
    try {
      const sources = await incomeService.listSources(userId);
      return res.status(200).json(sources);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async createSource(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    try {
      const source = await incomeService.createSource(userId, { name });
      return res.status(201).json(source);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async create(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const { incomeSourceId, type, amount, description, date } = req.body;

    if (!incomeSourceId || !type || !amount || !date) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    try {
      const income = await incomeService.create(userId, {
        incomeSourceId: Number(incomeSourceId),
        type,
        amount: String(amount),
        description,
        date,
      });
      return res.status(201).json(income);
    } catch (err) {
      return handleError(err, res);
    }
  },

  async list(req: Request, res: Response) {
    const userId = req.auth!.userId;
    try {
      const incomes = await incomeService.listForUser(userId);
      return res.status(200).json(incomes);
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
      const income = await incomeService.getOne(id, userId);
      return res.status(200).json(income);
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

    const { incomeSourceId, type, amount, description, date } = req.body;

try {
  const input: UpdateIncomeInput = {
    ...(incomeSourceId !== undefined && { incomeSourceId: Number(incomeSourceId) }),
    ...(type !== undefined && { type }),
    ...(amount !== undefined && { amount: String(amount) }),
    ...(description !== undefined && { description }),
    ...(date !== undefined && { date }),
  };

  const income = await incomeService.update(id, userId, input);
  return res.status(200).json(income);
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
      await incomeService.remove(id, userId);
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  },
};