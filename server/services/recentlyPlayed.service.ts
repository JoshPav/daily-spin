import type { ListenOrder, ListenTime } from '@prisma/client';
import type { PlayHistory } from '@spotify/web-api-ts-sdk';
import { getTrackListenTime } from '#shared/utils/listenTime.utils';
import { getSpotifyClientForUser } from '../clients/spotify';
import { DailyListenRepository } from '../repositories/dailyListen.repository';
import { getAlbumArtwork } from '../utils/albums.utils';
import { getStartOfDayTimestamp, isPlayedToday } from '../utils/datetime.utils';
import {
  areTracksInOrder,
  areTracksPlayedContinuously,
  type GroupedTracks,
  groupTracksByAlbum,
  type PlayHistoryWithIndex,
} from '../utils/tracks.utils';
import type { AuthDetails, UserWithAuthTokens } from './user.service';

type UnfinishedAlbum = {
  albumId: string;
  albumName: string;
  listenedInFull: false;
};

type FinishedAlbum = {
  albumId: string;
  artistNames: string;
  imageUrl: string;
  albumName: string;
  listenedInFull: true;
  listenOrder: ListenOrder;
  listenMethod: 'spotify';
  listenTime: ListenTime;
};

type ProcssedGroup = UnfinishedAlbum | FinishedAlbum;

const MIN_REQUIRED_TRACKS = 5;

export class RecentlyPlayedService {
  constructor(private dailyListenRepo = new DailyListenRepository()) {}

  async processTodaysListens({ id: userId, auth }: UserWithAuthTokens) {
    const todaysListens = await this.getTodaysFullListens(auth);

    if (!todaysListens.length) {
      console.debug('No finished albums found today.');
      return;
    }

    return this.dailyListenRepo.saveListens(userId, todaysListens);
  }

  private async getTodaysFullListens(auth: AuthDetails) {
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

    return processed.filter((group) => group.listenedInFull);
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
  }: GroupedTracks): ProcssedGroup {
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

    return {
      albumId,
      albumName,
      imageUrl: getAlbumArtwork(images),
      artistNames: artists.map((a) => a.name).join(', '),
      listenedInFull,
      listenOrder,
      listenMethod: 'spotify',
      listenTime: getTrackListenTime(tracks[0].played_at),
    };
  }
}
