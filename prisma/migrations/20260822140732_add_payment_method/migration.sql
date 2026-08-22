-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYPAL', 'BANK_TRANSFER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PAYPAL';
