import type { ListenOrder, ListenTime } from '@prisma/client';
import type { PlayHistory } from '@spotify/web-api-ts-sdk';
import { getTrackListenTime } from '#shared/utils/listenTime.utils';
import {
  type CreateAlbum,
  DailyListenRepository,
} from '~~/server/repositories/dailyListen.repository';
import { BacklogService } from '~~/server/services/backlog.service';
import { ScheduledListenService } from '~~/server/services/scheduledListen.service';
import { SpotifyService } from '~~/server/services/spotify/spotify.service';
import type {
  AuthDetails,
  UserWithAuthTokens,
} from '~~/server/services/user.service';
import { getAlbumArtwork } from '~~/server/utils/albums.utils';
import {
  getStartOfDayTimestamp,
  isPlayedToday,
} from '~~/server/utils/datetime.utils';
import { createTaggedLogger } from '~~/server/utils/logger';
import {
  areTracksInOrder,
  areTracksPlayedContinuously,
  type GroupedTracks,
  groupTracksByAlbum,
  type PlayHistoryWithIndex,
} from '~~/server/utils/tracks.utils';

const logger = createTaggedLogger('Service:RecentlyPlayed');

type UnfinishedAlbum = {
  albumId: string;
  albumName: string;
  listenedInFull: false;
};

type FinishedAlbum = {
  album: CreateAlbum;
  listenedInFull: true;
  listenOrder: ListenOrder;
  listenMethod: 'spotify';
  listenTime: ListenTime;
};

type ProcessedGroup = UnfinishedAlbum | FinishedAlbum;

const MIN_REQUIRED_TRACKS = 4;

export class RecentlyPlayedService {
  constructor(
    private dailyListenRepo = new DailyListenRepository(),
    private backlogService = new BacklogService(),
    private scheduledListenService = new ScheduledListenService(),
    private spotifyService = new SpotifyService(),
  ) {}

  async processTodaysListens({ id: userId, auth }: UserWithAuthTokens) {
    logger.info("Processing today's listens", { userId });

    const todaysListens = await this.getTodaysFullListens(userId, auth);

    if (!todaysListens.length) {
      logger.debug('No finished albums found today', { userId });
      return;
    }

    logger.info('Found finished albums', {
      userId,
      albumCount: todaysListens.length,
    });

    const result = await this.dailyListenRepo.saveListens(
      userId,
      todaysListens,
    );

    // Remove listened albums from backlog and scheduled listens
    await Promise.all(
      todaysListens.flatMap((listen) => [
        this.backlogService.removeBacklogItemByAlbumSpotifyId(
          userId,
          listen.album.spotifyId,
        ),
        this.scheduledListenService.removeScheduledListenByAlbumSpotifyId(
          userId,
          listen.album.spotifyId,
        ),
      ]),
    );

    logger.info("Successfully processed today's listens", {
      userId,
      albumCount: todaysListens.length,
    });

    return result;
  }

  private async getTodaysFullListens(userId: string, auth: AuthDetails) {
    const todaysTracks = await this.getTodaysPlays(userId, auth);

    if (!todaysTracks.length) {
      return [];
    }

    // Add play index to each track for interruption detection
    const tracksWithIndex: PlayHistoryWithIndex[] = todaysTracks.map(
      (track, index) => ({
        ...track,
        playIndex: index,
      }),
    );

    const groupedTracks = groupTracksByAlbum(tracksWithIndex);

    const processed = Array.from(groupedTracks.values()).map(
      this.processGroupedTracks,
    );

    return processed
      .filter((group): group is FinishedAlbum => group.listenedInFull)
      .map(({ album, listenOrder, listenMethod, listenTime }) => ({
        album,
        listenOrder,
        listenMethod,
        listenTime,
      }));
  }

  private async getTodaysPlays(
    userId: string,
    auth: AuthDetails,
  ): Promise<PlayHistory[]> {
    const today = new Date();
    const afterTimestamp = getStartOfDayTimestamp(today);

    logger.debug("Fetching today's plays from Spotify", {
      userId,
      afterTimestamp,
    });

    try {
      const spotifyApi = await this.spotifyService.getClientForUser(
        userId,
        auth,
      );

      const recentlyPlayed = await spotifyApi.player.getRecentlyPlayedTracks(
        50,
        {
          type: 'after',
          timestamp: afterTimestamp,
        },
      );

      const filteredTracks = recentlyPlayed.items
        .filter(
          (item) =>
            isPlayedToday(item.played_at, today) &&
            item.track.album.total_tracks >= MIN_REQUIRED_TRACKS,
        )
        .sort(
          (a, b) =>
            new Date(a.played_at).getTime() - new Date(b.played_at).getTime(),
        );

      logger.debug("Fetched and filtered today's plays", {
        userId,
        totalTracks: recentlyPlayed.items.length,
        filteredTracks: filteredTracks.length,
      });

      return filteredTracks;
    } catch (err) {
      logger.error('Failed to fetch recently played songs from Spotify', {
        userId,
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });

      return [];
    }
  }

  private processGroupedTracks({
    album: {
      id: albumId,
      name: albumName,
      total_tracks: totalTracks,
      artists,
      images,
    },
    tracks,
  }: GroupedTracks): ProcessedGroup {
    const uniqueTracks = new Set([...tracks.map(({ track }) => track.id)]);

    const listenedInFull =
      uniqueTracks.size === totalTracks && totalTracks >= MIN_REQUIRED_TRACKS;

    if (!listenedInFull) {
      return {
        albumId,
        albumName,
        listenedInFull: false,
      };
    }

    const playedContinuously = areTracksPlayedContinuously(tracks);
    const tracksInSequentialOrder = areTracksInOrder(tracks);

    let listenOrder: ListenOrder;
    if (!playedContinuously) {
      listenOrder = 'interrupted';
    } else if (tracksInSequentialOrder) {
      listenOrder = 'ordered';
    } else {
      listenOrder = 'shuffled';
    }

    const firstTrack = tracks[0];
    if (!firstTrack) {
      throw new Error('No tracks found for album that was listened in full');
    }

    return {
      album: {
        spotifyId: albumId,
        name: albumName,
        imageUrl: getAlbumArtwork(images),
        artists: artists.map((artist) => ({
          spotifyId: artist.id,
          name: artist.name,
          // Note: SimplifiedArtist doesn't include images
        })),
      },
      listenedInFull,
      listenOrder,
      listenMethod: 'spotify',
      listenTime: getTrackListenTime(firstTrack.played_at),
    };
  }
}
