-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "customerPhone" TEXT,
ALTER COLUMN "customerEmail" DROP NOT NULL;

-- The buyer picks email or WhatsApp at checkout; Prisma doesn't model
-- "at least one of these columns" natively, so enforce it here too as a
-- backstop against the app-level (zod) validation.
ALTER TABLE "Order" ADD CONSTRAINT "Order_has_contact_method" CHECK ("customerEmail" IS NOT NULL OR "customerPhone" IS NOT NULL);
