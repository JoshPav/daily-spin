-- CreateTable
CREATE TABLE "future_listen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "future_listen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "future_listen_userId_idx" ON "future_listen"("userId");

-- CreateIndex
CREATE INDEX "future_listen_albumId_idx" ON "future_listen"("albumId");

-- CreateIndex
CREATE INDEX "future_listen_date_idx" ON "future_listen"("date");

-- CreateIndex
CREATE UNIQUE INDEX "future_listen_userId_date_key" ON "future_listen"("userId", "date");

-- AddForeignKey
ALTER TABLE "future_listen" ADD CONSTRAINT "future_listen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "future_listen" ADD CONSTRAINT "future_listen_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
