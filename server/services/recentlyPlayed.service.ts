import type { ListenTime } from '@prisma/client';
import { type PlayHistory, SpotifyApi } from '@spotify/web-api-ts-sdk';
import { getSpotifyApiClient } from '../clients/spotify';
import { DailyListenRepository } from '../repositories/dailyListen.repository';
import { getAlbumArtwork } from '../utils/albums.utils';
import { getStartOfDayTimestamp, isPlayedToday } from '../utils/datetime.utils';
import {
  areTracksInOrder,
  type GroupedTracks,
  getTrackListenTime,
  groupTracksByAlbum,
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
  listenedInOrder: boolean;
  listenMethod: 'spotify';
  listenTime: ListenTime;
};

type ProcssedGroup = UnfinishedAlbum | FinishedAlbum;

const MIN_REQUIRED_TRACKS = 5;

export class RecentlyPlayedService {
  constructor(
    _spotifyApi: SpotifyApi = getSpotifyApiClient(),
    private dailyListenRepo = new DailyListenRepository(),
  ) {}

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

    const groupedTracks = groupTracksByAlbum(todaysTracks);

    const processed = Array.from(groupedTracks.values()).map(
      this.processGroupedTracks,
    );

    return processed.filter((group) => group.listenedInFull);
  }

  private async getTodaysPlays(auth: AuthDetails): Promise<PlayHistory[]> {
    const today = new Date();

    try {
      const spotifyApi = SpotifyApi.withAccessToken(
        process.env.SPOTIFY_CLIENT_ID as string,
        {
          access_token: auth.accessToken!,
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: auth.refreshToken!,
        },
      );

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

    return {
      albumId,
      albumName,
      imageUrl: getAlbumArtwork(images),
      artistNames: artists.map((a) => a.name).join(', '),
      listenedInFull,
      listenedInOrder: areTracksInOrder(tracks),
      listenMethod: 'spotify',
      listenTime: getTrackListenTime(tracks[0].played_at),
    };
  }
}
