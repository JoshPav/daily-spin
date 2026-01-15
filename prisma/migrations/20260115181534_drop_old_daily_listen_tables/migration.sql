-- DropForeignKey
ALTER TABLE "album_listen_old" DROP CONSTRAINT IF EXISTS "album_listen_old_dailyListenId_fkey";

-- DropForeignKey
ALTER TABLE "daily_listen_old" DROP CONSTRAINT IF EXISTS "daily_listen_old_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "album_listen_old";

-- DropTable
DROP TABLE IF EXISTS "daily_listen_old";
