-- CreateEnum
CREATE TYPE "ListenOrder" AS ENUM ('ordered', 'shuffled', 'interrupted');

-- AlterTable: Add new column with nullable temporarily
ALTER TABLE "AlbumListen" ADD COLUMN "listenOrder" "ListenOrder";

-- Data migration: Convert boolean to enum
UPDATE "AlbumListen"
SET "listenOrder" = CASE
  WHEN "listenedInOrder" = true THEN 'ordered'::"ListenOrder"
  ELSE 'shuffled'::"ListenOrder"
END;

-- Make the column NOT NULL with default
ALTER TABLE "AlbumListen" ALTER COLUMN "listenOrder" SET NOT NULL;
ALTER TABLE "AlbumListen" ALTER COLUMN "listenOrder" SET DEFAULT 'ordered'::"ListenOrder";

-- Drop old column
ALTER TABLE "AlbumListen" DROP COLUMN "listenedInOrder";
