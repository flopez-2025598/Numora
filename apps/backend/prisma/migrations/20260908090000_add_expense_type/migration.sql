-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('FIXED', 'VARIABLE', 'EXTRAORDINARY');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "type" "ExpenseType" NOT NULL DEFAULT 'VARIABLE';
