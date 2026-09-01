import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const authRoutes: Router = Router();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);
authRoutes.get('/me', requireAuth, authController.me);
authRoutes.post('/refresh', requireAuth, authController.refresh);