-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyListen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyListen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumListen" (
    "id" TEXT NOT NULL,
    "dailyListenId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "listenedInOrder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlbumListen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyListen_userId_idx" ON "DailyListen"("userId");

-- CreateIndex
CREATE INDEX "DailyListen_date_idx" ON "DailyListen"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyListen_userId_date_key" ON "DailyListen"("userId", "date");

-- CreateIndex
CREATE INDEX "AlbumListen_dailyListenId_idx" ON "AlbumListen"("dailyListenId");

-- CreateIndex
CREATE INDEX "AlbumListen_albumId_idx" ON "AlbumListen"("albumId");

-- AddForeignKey
ALTER TABLE "DailyListen" ADD CONSTRAINT "DailyListen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumListen" ADD CONSTRAINT "AlbumListen_dailyListenId_fkey" FOREIGN KEY ("dailyListenId") REFERENCES "DailyListen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
