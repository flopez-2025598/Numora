import { prisma } from '../db/prisma.js';

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: { fullName: string; email: string; passwordHash: string }) {
    return prisma.user.create({ data });
  },
};