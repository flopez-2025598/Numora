import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRepository } from './auth.repository.js';
import type { RegisterInput, LoginInput, AuthUser } from './auth.types.js';

const SALT_ROUNDS = 10;

function isStrongPassword(password: string): boolean {
  return password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && !/\s/.test(password);
}

// Firma un token nuevo para el usuario indicado. Se usa tanto en login()
// como en refresh() para que la duración (JWT_EXPIRES_IN) y el secreto
// (JWT_SECRET) se lean siempre del mismo lugar, sin repetir código.
function signToken(userId: number, role: string): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET no está definida. Revisa tu archivo .env');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!expiresIn) {
    throw new Error('JWT_EXPIRES_IN no está definida. Revisa tu archivo .env');
  }

  const tokenExpiresIn = expiresIn as NonNullable<jwt.SignOptions['expiresIn']>;
  return jwt.sign({ userId, role }, secret, { expiresIn: tokenExpiresIn });
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthUser> {
    if (!isStrongPassword(input.password)) {
      throw new Error('WEAK_PASSWORD');
    }

    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await authRepository.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
    });

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };
  },

  async login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
    const user = await authRepository.findByEmail(input.email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const token = signToken(user.id, user.role);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      token,
    };
  },

  // Emite un token nuevo (misma duración JWT_EXPIRES_IN, contada desde
  // ahora) para el usuario ya autenticado. Solo se llama mientras el
  // usuario sigue activo en la página; si no hay actividad, el frontend
  // deja de pedir renovaciones y el token original expira normalmente.
  refresh(userId: number, role: string): { token: string } {
    return { token: signToken(userId, role) };
  },

  async me(userId: number): Promise<AuthUser> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };
  },
};
