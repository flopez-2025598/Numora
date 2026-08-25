import type { Request, Response } from 'express';
import { authService } from './auth.service.js';

export const authController = {
  async register(req: Request, res: Response) {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    try {
      const user = await authService.register({ fullName, email, password });
      return res.status(201).json(user);
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_ALREADY_EXISTS') {
        return res.status(409).json({ error: 'El correo ya está registrado' });
      }
      if (err instanceof Error && err.message === 'WEAK_PASSWORD') {
        return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres, mayuscula, minuscula y numero, sin espacios' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    try {
      const result = await authService.login({ email, password });
      return res.status(200).json(result);
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async me(req: Request, res: Response) {
    if (!req.auth) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    try {
      const user = await authService.me(req.auth.userId);
      return res.status(200).json(user);
    } catch (err) {
      if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
        return res.status(401).json({ error: 'No autenticado' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
