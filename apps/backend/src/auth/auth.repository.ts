import { prisma } from '../db/prisma.js';

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId } });
  },  

  createFromGoogle(data: { fullName: string; email: string; googleId: string }) {
    return prisma.user.create({ data });
  },

  linkGoogleId(id: number, googleId: string) {
    return prisma.user.update({ where: { id }, data: { googleId } });
  },

  create(data: { fullName: string; email: string; passwordHash: string }) {
    return prisma.user.create({ data });
  },
};