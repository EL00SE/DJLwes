-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "eventDate" TIMESTAMP(3),
    "message" TEXT NOT NULL,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'NEW',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingRequest_ipAddress_createdAt_idx" ON "BookingRequest"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRequest_status_idx" ON "BookingRequest"("status");

-- The requester picks email or phone; Prisma doesn't model "at least one
-- of these columns" natively, so enforce it here too as a backstop
-- against the app-level (zod) validation — same pattern as Order.
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_has_contact_method" CHECK ("customerEmail" IS NOT NULL OR "customerPhone" IS NOT NULL);
