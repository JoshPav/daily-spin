import type { PlayHistory, SimplifiedAlbum } from '@spotify/web-api-ts-sdk';

export type PlayHistoryWithIndex = PlayHistory & { playIndex: number };

export const areTracksInOrder = (tracks: PlayHistoryWithIndex[]): boolean => {
  let previousTrackNumber = 0;
  let previousDiscNumber = 1;

  for (const { track } of tracks) {
    const currentDiscNumber = track.disc_number;
    const currentTrackNumber = track.track_number;

    if (currentTrackNumber === previousTrackNumber) {
      // Played the same song again that's fine.
      continue;
    }

    // Check if album is restarting from the beginning (disc 1, track 1 after we've played some tracks)
    if (
      currentDiscNumber === 1 &&
      currentTrackNumber === 1 &&
      previousTrackNumber > 0
    ) {
      // Album restarted, reset tracking
      previousTrackNumber = 1;
      previousDiscNumber = 1;
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

export const areTracksPlayedContinuously = (
  tracks: PlayHistoryWithIndex[],
): boolean => {
  return tracks.every((track, i, arr) => {
    if (i === 0) return true;
    const prevTrack = arr[i - 1];
    if (!prevTrack) return false;
    return track.playIndex === prevTrack.playIndex + 1;
  });
};

export type GroupedTracks = {
  album: SimplifiedAlbum;
  tracks: PlayHistoryWithIndex[];
};

export type AlbumMap = Map<string, GroupedTracks>;

export const groupTracksByAlbum = (
  tracks: PlayHistoryWithIndex[],
): AlbumMap => {
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
