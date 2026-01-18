/*
  Warnings:

  - You are about to drop the column `favoriteSongId` on the `album_listen` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteSongName` on the `album_listen` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteSongTrackNumber` on the `album_listen` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "album_listen" DROP COLUMN "favoriteSongId",
DROP COLUMN "favoriteSongName",
DROP COLUMN "favoriteSongTrackNumber";

-- AlterTable
ALTER TABLE "daily_listen" ADD COLUMN     "favoriteSongAlbumId" TEXT,
ADD COLUMN     "favoriteSongId" TEXT,
ADD COLUMN     "favoriteSongName" TEXT,
ADD COLUMN     "favoriteSongTrackNumber" INTEGER;

-- AddForeignKey
ALTER TABLE "daily_listen" ADD CONSTRAINT "daily_listen_favoriteSongAlbumId_fkey" FOREIGN KEY ("favoriteSongAlbumId") REFERENCES "album"("id") ON DELETE SET NULL ON UPDATE CASCADE;
