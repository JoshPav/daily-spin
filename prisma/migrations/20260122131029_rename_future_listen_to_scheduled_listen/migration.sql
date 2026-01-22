-- AlterTable
ALTER TABLE "scheduled_listen" RENAME CONSTRAINT "future_listen_pkey" TO "scheduled_listen_pkey";

-- RenameForeignKey
ALTER TABLE "scheduled_listen" RENAME CONSTRAINT "future_listen_albumId_fkey" TO "scheduled_listen_albumId_fkey";

-- RenameForeignKey
ALTER TABLE "scheduled_listen" RENAME CONSTRAINT "future_listen_userId_fkey" TO "scheduled_listen_userId_fkey";

-- RenameIndex
ALTER INDEX "future_listen_albumId_idx" RENAME TO "scheduled_listen_albumId_idx";

-- RenameIndex
ALTER INDEX "future_listen_date_idx" RENAME TO "scheduled_listen_date_idx";

-- RenameIndex
ALTER INDEX "future_listen_userId_date_key" RENAME TO "scheduled_listen_userId_date_key";

-- RenameIndex
ALTER INDEX "future_listen_userId_idx" RENAME TO "scheduled_listen_userId_idx";
