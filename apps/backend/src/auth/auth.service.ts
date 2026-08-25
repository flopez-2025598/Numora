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

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET no está definida. Revisa tu archivo .env');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN;

    if (!expiresIn) {
      throw new Error('JWT_EXPIRES_IN no está definida. Revisa tu archivo .env');
    }

    const tokenExpiresIn = expiresIn as NonNullable<jwt.SignOptions['expiresIn']>;
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      {
        expiresIn: tokenExpiresIn,
      },
    );

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
