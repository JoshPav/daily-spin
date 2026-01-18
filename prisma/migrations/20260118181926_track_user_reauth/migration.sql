-- AlterTable
ALTER TABLE "account" ADD COLUMN     "requiresReauth" BOOLEAN NOT NULL DEFAULT false;
