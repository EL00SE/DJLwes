-- AlterTable
ALTER TABLE "NotifySignup" ADD COLUMN "ipAddress" TEXT;

-- CreateIndex
CREATE INDEX "NotifySignup_ipAddress_createdAt_idx" ON "NotifySignup"("ipAddress", "createdAt");
