import { Router } from 'express';
import { budgetsController } from './budgets.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const budgetsRoutes: Router = Router();

budgetsRoutes.use(requireAuth);

budgetsRoutes.get('/', budgetsController.list);
budgetsRoutes.post('/', budgetsController.create);
budgetsRoutes.patch('/:id', budgetsController.update);
budgetsRoutes.delete('/:id', budgetsController.remove);
