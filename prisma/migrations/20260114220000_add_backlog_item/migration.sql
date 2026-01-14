-- CreateEnum
CREATE TYPE "BacklogType" AS ENUM ('album', 'artist');

-- CreateTable
CREATE TABLE "backlog_item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BacklogType" NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "artistNames" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backlog_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backlog_item_userId_idx" ON "backlog_item"("userId");

-- CreateIndex
CREATE INDEX "backlog_item_type_idx" ON "backlog_item"("type");

-- CreateIndex
CREATE UNIQUE INDEX "backlog_item_userId_spotifyId_type_key" ON "backlog_item"("userId", "spotifyId", "type");

-- AddForeignKey
ALTER TABLE "backlog_item" ADD CONSTRAINT "backlog_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
