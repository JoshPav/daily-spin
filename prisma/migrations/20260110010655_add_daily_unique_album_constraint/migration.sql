/*
  Warnings:

  - A unique constraint covering the columns `[dailyListenId,albumId]` on the table `AlbumListen` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AlbumListen_dailyListenId_albumId_key" ON "AlbumListen"("dailyListenId", "albumId");
