-- CreateEnum
CREATE TYPE "GuestRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "GuestRequest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerInstagram" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "maleCount" INTEGER NOT NULL DEFAULT 0,
    "femaleCount" INTEGER NOT NULL DEFAULT 0,
    "otherCount" INTEGER NOT NULL DEFAULT 0,
    "status" "GuestRequestStatus" NOT NULL DEFAULT 'PENDING',
    "growPaymentLinkUrl" TEXT,
    "growPaymentLinkSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestRequest_eventId_idx" ON "GuestRequest"("eventId");

-- CreateIndex
CREATE INDEX "GuestRequest_status_idx" ON "GuestRequest"("status");

-- AddForeignKey
ALTER TABLE "GuestRequest" ADD CONSTRAINT "GuestRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A request for zero guests makes no sense; backstop the app-level (zod) validation.
ALTER TABLE "GuestRequest" ADD CONSTRAINT "GuestRequest_has_at_least_one_guest" CHECK ("maleCount" + "femaleCount" + "otherCount" >= 1);
