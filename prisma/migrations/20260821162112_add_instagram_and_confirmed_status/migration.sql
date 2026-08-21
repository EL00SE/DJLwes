/*
  Warnings:

  - Added the required column `customerInstagram` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CONFIRMED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerInstagram" TEXT NOT NULL;
