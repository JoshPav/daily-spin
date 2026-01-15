import type { ListenOrder, ListenTime } from '@prisma/client';
import type { PlayHistory } from '@spotify/web-api-ts-sdk';
import { getTrackListenTime } from '#shared/utils/listenTime.utils';
import { getSpotifyClientForUser } from '../clients/spotify';
import {
  type AlbumListenInput,
  type CreateAlbum,
  DailyListenRepository,
} from '../repositories/dailyListen.repository';
import { getAlbumArtwork } from '../utils/albums.utils';
import { getStartOfDayTimestamp, isPlayedToday } from '../utils/datetime.utils';
import {
  areTracksInOrder,
  areTracksPlayedContinuously,
  type GroupedTracks,
  groupTracksByAlbum,
  type PlayHistoryWithIndex,
} from '../utils/tracks.utils';
import { BacklogService } from './backlog.service';
import type { AuthDetails, UserWithAuthTokens } from './user.service';

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

const MIN_REQUIRED_TRACKS = 5;

export class RecentlyPlayedService {
  constructor(
    private dailyListenRepo = new DailyListenRepository(),
    private backlogService = new BacklogService(),
  ) {}

  async processTodaysListens({ id: userId, auth }: UserWithAuthTokens) {
    const todaysListens = await this.getTodaysFullListens(auth);

    if (!todaysListens.length) {
      console.debug('No finished albums found today.');
      return;
    }

    const result = await this.dailyListenRepo.saveListens(
      userId,
      todaysListens,
    );

    // Remove listened albums from backlog
    await Promise.all(
      todaysListens.map((listen) =>
        this.backlogService.removeBacklogItemByAlbumSpotifyId(
          userId,
          listen.album.spotifyId,
        ),
      ),
    );

    return result;
  }

  private async getTodaysFullListens(
    auth: AuthDetails,
  ): Promise<AlbumListenInput[]> {
    const todaysTracks = await this.getTodaysPlays(auth);

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

  private async getTodaysPlays(auth: AuthDetails): Promise<PlayHistory[]> {
    const today = new Date();

    try {
      const spotifyApi = getSpotifyClientForUser(auth);

      const recentlyPlayed = await spotifyApi.player.getRecentlyPlayedTracks(
        50,
        {
          type: 'after',
          timestamp: getStartOfDayTimestamp(today),
        },
      );

      return recentlyPlayed.items
        .filter(
          (item) =>
            isPlayedToday(item.played_at, today) &&
            item.track.album.total_tracks >= MIN_REQUIRED_TRACKS,
        )
        .sort(
          (a, b) =>
            new Date(a.played_at).getTime() - new Date(b.played_at).getTime(),
        );
    } catch (err) {
      console.error('An error occured fetching recently played songs', { err });
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
      uniqueTracks.size === totalTracks && totalTracks >= 5;

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
