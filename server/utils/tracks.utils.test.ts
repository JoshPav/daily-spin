import { describe, expect, it } from 'vitest';
import {
  context,
  simplifiedAlbum,
  track,
} from '~~/tests/factories/spotify.factory';
import {
  areTracksInOrder,
  groupTracksByAlbum,
  type PlayHistoryWithIndex,
} from './tracks.utils';

describe('tracks.utils', () => {
  describe('areTracksInOrder', () => {
    it('should return true for tracks played in order', () => {
      const tracks: PlayHistoryWithIndex[] = [
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
          playIndex: 1,
        },
        {
          track: track({ disc_number: 1, track_number: 2 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
          playIndex: 2,
        },
        {
          track: track({ disc_number: 1, track_number: 3 }),
          played_at: '2024-01-01T10:10:00Z',
          context: context(),
          playIndex: 3,
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(true);
    });

    it('should return true when the same track is played multiple times', () => {
      const tracks: PlayHistoryWithIndex[] = [
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
          playIndex: 1,
        },
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
          playIndex: 2,
        },
        {
          track: track({ disc_number: 1, track_number: 2 }),
          played_at: '2024-01-01T10:10:00Z',
          context: context(),
          playIndex: 3,
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(true);
    });

    it('should return false for tracks played out of order', () => {
      const tracks: PlayHistoryWithIndex[] = [
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
          playIndex: 1,
        },
        {
          track: track({ disc_number: 1, track_number: 3 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
          playIndex: 2,
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(false);
    });

    it('should return true for multi-disc albums played in order', () => {
      const tracks: PlayHistoryWithIndex[] = [
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
          playIndex: 1,
        },
        {
          track: track({ disc_number: 1, track_number: 2 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
          playIndex: 2,
        },
        {
          track: track({ disc_number: 2, track_number: 1 }),
          played_at: '2024-01-01T10:10:00Z',
          context: context(),
          playIndex: 3,
        },
        {
          track: track({ disc_number: 2, track_number: 2 }),
          played_at: '2024-01-01T10:15:00Z',
          context: context(),
          playIndex: 4,
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(true);
    });

    it('should return false when going backwards on the same disc', () => {
      const tracks: PlayHistoryWithIndex[] = [
        {
          track: track({ disc_number: 1, track_number: 3 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
          playIndex: 1,
        },
        {
          track: track({ disc_number: 1, track_number: 2 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
          playIndex: 2,
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(false);
    });

    it('should return true for empty track list', () => {
      expect(areTracksInOrder([])).toBe(true);
    });

    it('should return true for single track', () => {
      const tracks: PlayHistoryWithIndex[] = [
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
          playIndex: 1,
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(true);
    });
  });

  describe('groupTracksByAlbum', () => {
    it('should group tracks by album', () => {
      const album1 = simplifiedAlbum({
        id: 'album1',
        name: 'Album 1',
      });
      const album2 = simplifiedAlbum({
        id: 'album2',
        name: 'Album 2',
      });

      const tracks: PlayHistoryWithIndex[] = [
        {
          track: track({ album: album1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
          playIndex: 1,
        },
        {
          track: track({ album: album2 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
          playIndex: 2,
        },
        {
          track: track({ album: album1 }),
          played_at: '2024-01-01T10:10:00Z',
          context: context(),
          playIndex: 3,
        },
      ];

      const result = groupTracksByAlbum(tracks);

      expect(result.size).toBe(2);
      expect(result.get('album1')?.tracks.length).toBe(2);
      expect(result.get('album2')?.tracks.length).toBe(1);
      expect(result.get('album1')?.album).toEqual(album1);
      expect(result.get('album2')?.album).toEqual(album2);
    });

    it('should preserve track order within albums', () => {
      const album = simplifiedAlbum({
        id: 'album1',
        name: 'Album 1',
      });

      const tracks: PlayHistoryWithIndex[] = [
        {
          track: track({ album, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
          playIndex: 1,
        },
        {
          track: track({ album, track_number: 2 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
          playIndex: 2,
        },
        {
          track: track({ album, track_number: 3 }),
          played_at: '2024-01-01T10:10:00Z',
          context: context(),
          playIndex: 3,
        },
      ];

      const result = groupTracksByAlbum(tracks);
      const albumTracks = result.get('album1')?.tracks;

      expect(albumTracks?.length).toBe(3);
      expect(albumTracks?.[0].track.track_number).toBe(1);
      expect(albumTracks?.[1].track.track_number).toBe(2);
      expect(albumTracks?.[2].track.track_number).toBe(3);
    });

    it('should return empty map for empty track list', () => {
      const result = groupTracksByAlbum([]);
      expect(result.size).toBe(0);
    });

    it('should handle single album', () => {
      const album = simplifiedAlbum({
        id: 'album1',
        name: 'Album 1',
      });

      const tracks: PlayHistoryWithIndex[] = [
        {
          track: track({ album }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
          playIndex: 1,
        },
      ];

      const result = groupTracksByAlbum(tracks);

      expect(result.size).toBe(1);
      expect(result.get('album1')?.tracks.length).toBe(1);
    });
  });
});
