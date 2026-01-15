-- AlterTable
ALTER TABLE "album_listen_old" RENAME CONSTRAINT "AlbumListen_pkey" TO "album_listen_old_pkey";

-- AlterTable
ALTER TABLE "daily_listen_old" RENAME CONSTRAINT "DailyListen_pkey" TO "daily_listen_old_pkey";

-- RenameForeignKey
ALTER TABLE "album_listen_old" RENAME CONSTRAINT "AlbumListen_dailyListenId_fkey" TO "album_listen_old_dailyListenId_fkey";

-- RenameForeignKey
ALTER TABLE "daily_listen_old" RENAME CONSTRAINT "DailyListen_userId_fkey" TO "daily_listen_old_userId_fkey";

-- RenameIndex
ALTER INDEX "AlbumListen_albumId_idx" RENAME TO "album_listen_old_albumId_idx";

-- RenameIndex
ALTER INDEX "AlbumListen_dailyListenId_albumId_key" RENAME TO "album_listen_old_dailyListenId_albumId_key";

-- RenameIndex
ALTER INDEX "AlbumListen_dailyListenId_idx" RENAME TO "album_listen_old_dailyListenId_idx";

-- RenameIndex
ALTER INDEX "DailyListen_date_idx" RENAME TO "daily_listen_old_date_idx";

-- RenameIndex
ALTER INDEX "DailyListen_userId_date_key" RENAME TO "daily_listen_old_userId_date_key";

-- RenameIndex
ALTER INDEX "DailyListen_userId_idx" RENAME TO "daily_listen_old_userId_idx";
