-- CreateEnum
CREATE TYPE "ListenTime" AS ENUM ('morning', 'noon', 'evening', 'night');

-- AlterEnum
ALTER TYPE "ListenMethod" ADD VALUE 'streamed';

-- AlterTable
ALTER TABLE "AlbumListen" ADD COLUMN     "listenTime" "ListenTime";
