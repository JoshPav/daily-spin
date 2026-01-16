-- CreateEnum
CREATE TYPE "PlaylistType" AS ENUM ('album_of_the_day', 'song_of_the_day');

-- CreateTable
CREATE TABLE "user_playlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playlistType" "PlaylistType" NOT NULL,
    "spotifyPlaylistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_playlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_playlist_userId_idx" ON "user_playlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_playlist_userId_playlistType_key" ON "user_playlist"("userId", "playlistType");

-- AddForeignKey
ALTER TABLE "user_playlist" ADD CONSTRAINT "user_playlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
