-- CreateTable
CREATE TABLE "artist" (
    "id" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album" (
    "id" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "releaseDate" TEXT,
    "totalTracks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_artist" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "album_artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backlog_item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backlog_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artist_spotifyId_key" ON "artist"("spotifyId");

-- CreateIndex
CREATE INDEX "artist_spotifyId_idx" ON "artist"("spotifyId");

-- CreateIndex
CREATE UNIQUE INDEX "album_spotifyId_key" ON "album"("spotifyId");

-- CreateIndex
CREATE INDEX "album_spotifyId_idx" ON "album"("spotifyId");

-- CreateIndex
CREATE INDEX "album_artist_albumId_idx" ON "album_artist"("albumId");

-- CreateIndex
CREATE INDEX "album_artist_artistId_idx" ON "album_artist"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "album_artist_albumId_artistId_key" ON "album_artist"("albumId", "artistId");

-- CreateIndex
CREATE INDEX "backlog_item_userId_idx" ON "backlog_item"("userId");

-- CreateIndex
CREATE INDEX "backlog_item_albumId_idx" ON "backlog_item"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "backlog_item_userId_albumId_key" ON "backlog_item"("userId", "albumId");

-- AddForeignKey
ALTER TABLE "album_artist" ADD CONSTRAINT "album_artist_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_artist" ADD CONSTRAINT "album_artist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog_item" ADD CONSTRAINT "backlog_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog_item" ADD CONSTRAINT "backlog_item_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
