-- CreateTable
CREATE TABLE "InstagramToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "bootstrapToken" TEXT NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramToken_pkey" PRIMARY KEY ("id")
);
