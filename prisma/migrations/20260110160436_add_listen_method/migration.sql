-- CreateEnum
CREATE TYPE "ListenMethod" AS ENUM ('spotify', 'vinyl');

-- AlterTable
ALTER TABLE "AlbumListen" ADD COLUMN     "listenMethod" "ListenMethod" NOT NULL DEFAULT 'spotify';
