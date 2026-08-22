-- AlterTable
ALTER TABLE "Order" ADD COLUMN "checkedInAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "receiptDocId" TEXT;
ALTER TABLE "Order" ADD COLUMN "receiptNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "receiptUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN "receiptIssuedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "receiptError" TEXT;
