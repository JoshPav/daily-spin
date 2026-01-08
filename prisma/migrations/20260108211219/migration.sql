/*
  Warnings:

  - Added the required column `albumName` to the `AlbumListen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `artistNames` to the `AlbumListen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `AlbumListen` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AlbumListen" ADD COLUMN     "albumName" TEXT NOT NULL,
ADD COLUMN     "artistNames" TEXT NOT NULL,
ADD COLUMN     "imageUrl" TEXT NOT NULL;
