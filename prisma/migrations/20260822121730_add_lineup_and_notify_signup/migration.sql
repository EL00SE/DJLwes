-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "lineup" TEXT;

-- CreateTable
CREATE TABLE "NotifySignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotifySignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotifySignup_email_key" ON "NotifySignup"("email");
