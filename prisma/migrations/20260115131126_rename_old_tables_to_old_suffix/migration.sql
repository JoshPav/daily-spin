-- Rename existing tables to _old suffix
ALTER TABLE "DailyListen" RENAME TO "daily_listen_old";
ALTER TABLE "AlbumListen" RENAME TO "album_listen_old";

-- CreateTable
CREATE TABLE "daily_listen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_listen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_listen" (
    "id" TEXT NOT NULL,
    "dailyListenId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "listenOrder" "ListenOrder" NOT NULL DEFAULT 'ordered',
    "listenMethod" "ListenMethod" NOT NULL DEFAULT 'spotify',
    "listenTime" "ListenTime",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "album_listen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_listen_userId_idx" ON "daily_listen"("userId");

-- CreateIndex
CREATE INDEX "daily_listen_date_idx" ON "daily_listen"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_listen_userId_date_key" ON "daily_listen"("userId", "date");

-- CreateIndex
CREATE INDEX "album_listen_dailyListenId_idx" ON "album_listen"("dailyListenId");

-- CreateIndex
CREATE INDEX "album_listen_albumId_idx" ON "album_listen"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "album_listen_dailyListenId_albumId_key" ON "album_listen"("dailyListenId", "albumId");

-- AddForeignKey
ALTER TABLE "daily_listen" ADD CONSTRAINT "daily_listen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_listen" ADD CONSTRAINT "album_listen_dailyListenId_fkey" FOREIGN KEY ("dailyListenId") REFERENCES "daily_listen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_listen" ADD CONSTRAINT "album_listen_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
