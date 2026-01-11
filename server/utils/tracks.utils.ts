import type { ListenTime } from '@prisma/client';
import type { PlayHistory, SimplifiedAlbum } from '@spotify/web-api-ts-sdk';

export const areTracksInOrder = (tracks: PlayHistory[]): boolean => {
  let previousTrackNumber = 0;
  let previousDiscNumber = 1;

  for (const { track } of tracks) {
    const currentDiscNumber = track.disc_number;
    const currentTrackNumber = track.track_number;

    if (currentTrackNumber === previousTrackNumber) {
      // Played the same song again that's fine.
      continue;
    }

    if (currentDiscNumber < previousDiscNumber) {
      // Went backwards to a previous disc - not in order
      return false;
    }
    if (currentDiscNumber > previousDiscNumber) {
      // If we moved to a new disc, track numbers reset
      previousTrackNumber = 0;
      previousDiscNumber = currentDiscNumber;
    }

    // Check if track number is ascending on the current disc
    if (currentTrackNumber !== previousTrackNumber + 1) {
      return false;
    }

    previousTrackNumber = currentTrackNumber;
  }

  return true;
};

export type GroupedTracks = {
  album: SimplifiedAlbum;
  tracks: PlayHistory[];
};

export type AlbumMap = Map<string, GroupedTracks>;

export const groupTracksByAlbum = (tracks: PlayHistory[]): AlbumMap => {
  const albumMap = new Map<string, GroupedTracks>();

  for (const play of tracks) {
    const { track } = play;
    const albumId = track.album.id;

    if (!albumMap.has(track.album.id)) {
      albumMap.set(albumId, { album: track.album, tracks: [] });
    }

    const albumData = albumMap.get(albumId);
    albumData?.tracks.push(play);
  }

  return albumMap;
};

type HourRange = { start: number; end: number };

const TIME_RANGES: Record<ListenTime, HourRange> = {
  morning: { start: 5, end: 12 },
  noon: { start: 12, end: 18 },
  evening: { start: 18, end: 22 },
  night: { start: 22, end: 5 },
};

const inHourRange =
  (hour: number) =>
  ({ start, end }: HourRange) =>
    hour >= start && hour < end;

export const getTrackListenTime = (playedAt: string): ListenTime => {
  const inRange = inHourRange(new Date(playedAt).getHours());

  if (inRange(TIME_RANGES.morning)) {
    return 'morning';
  }

  if (inRange(TIME_RANGES.noon)) {
    return 'noon';
  }

  if (inRange(TIME_RANGES.evening)) {
    return 'evening';
  }

  return 'night';
};
