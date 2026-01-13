-- AlterTable
ALTER TABLE "user" ADD COLUMN     "createSongOfDayPlaylist" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createTodaysAlbumPlaylist" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "trackListeningHistory" BOOLEAN NOT NULL DEFAULT true;
