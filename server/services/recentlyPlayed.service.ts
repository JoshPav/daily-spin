import type { SpotifyApi, Track } from '@spotify/web-api-ts-sdk';
import { getSpotifyApiClient } from '../clients/spotify';
import { DailyListenRepository } from '../repositories/dailyListenRepository';
import { getStartOfDayTimestamp, isPlayedToday } from '../utils/datetime.utils';
import {
  areTracksInOrder,
  type GroupedTracks,
  groupTracksByAlbum,
} from '../utils/tracks.utils';

type UnfinishedAlbum = {
  albumId: string;
  name: string;
  listenedInFull: false;
};

type FinishedAlbum = {
  albumId: string;
  name: string;
  listenedInFull: true;
  listenedInOrder: boolean;
};

type ProcssedGroup = UnfinishedAlbum | FinishedAlbum;

export class RecentlyPlayedService {
  constructor(
    private spotifyApi: SpotifyApi = getSpotifyApiClient(),
    private dailyListenRepo = new DailyListenRepository(),
  ) {}

  processTodaysListens = async (userId: string) => {
    const todaysListens = await this.getTodaysFullListens();

    if (!todaysListens.length) {
      console.debug('No finished albums found today.');
      return;
    }

    return this.dailyListenRepo.saveListens(userId, todaysListens);
  };

  private getTodaysFullListens = async () => {
    const todaysTracks = await this.getTodaysPlays();

    const groupedTracks = groupTracksByAlbum(todaysTracks);

    const processed = Array.from(groupedTracks.values()).map(
      this.processGroupedTracks,
    );

    return processed.filter((group) => group.listenedInFull);
  };

  private getTodaysPlays = async (): Promise<Track[]> => {
    const today = new Date();

    const recentlyPlayed = await this.spotifyApi.player.getRecentlyPlayedTracks(
      50,
      {
        type: 'after',
        timestamp: getStartOfDayTimestamp(today),
      },
    );

    return recentlyPlayed.items
      .filter((item) => isPlayedToday(item.played_at, today))
      .sort(
        (a, b) =>
          new Date(a.played_at).getTime() - new Date(b.played_at).getTime(),
      )
      .map((play) => play.track);
  };

  private processGroupedTracks = ({
    album: { id: albumId, name, total_tracks: totalTracks },
    tracks,
  }: GroupedTracks): ProcssedGroup => {
    const uniqueTracks = new Set([...tracks.map((track) => track.id)]);

    const listenedInFull = uniqueTracks.size === totalTracks;

    if (!listenedInFull) {
      return {
        albumId,
        name,
        listenedInFull: false,
      };
    }

    return {
      albumId,
      name,
      listenedInFull,
      listenedInOrder: areTracksInOrder(tracks),
    };
  };
}
