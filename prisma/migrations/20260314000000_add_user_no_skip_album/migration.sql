-- CreateTable
CREATE TABLE "user_no_skip_album" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_no_skip_album_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_no_skip_album_userId_albumId_key" ON "user_no_skip_album"("userId", "albumId");

-- CreateIndex
CREATE INDEX "user_no_skip_album_userId_idx" ON "user_no_skip_album"("userId");

-- CreateIndex
CREATE INDEX "user_no_skip_album_albumId_idx" ON "user_no_skip_album"("albumId");

-- AddForeignKey
ALTER TABLE "user_no_skip_album" ADD CONSTRAINT "user_no_skip_album_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_no_skip_album" ADD CONSTRAINT "user_no_skip_album_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
