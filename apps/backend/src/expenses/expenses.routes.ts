import { Router } from 'express';
import { expensesController } from './expenses.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const expensesRoutes: Router = Router();

expensesRoutes.use(requireAuth);

expensesRoutes.get('/categories', expensesController.listCategories);
expensesRoutes.post('/categories', expensesController.createCategory);
expensesRoutes.delete('/categories/:id', expensesController.removeCategory);

expensesRoutes.get('/', expensesController.list);
expensesRoutes.post('/', expensesController.create);
expensesRoutes.get('/:id', expensesController.getOne);
expensesRoutes.patch('/:id', expensesController.update);
expensesRoutes.delete('/:id', expensesController.remove);