import type { PlayHistory } from '@spotify/web-api-ts-sdk';
import { describe, expect, it } from 'vitest';
import {
  context,
  simplifiedAlbum,
  track,
} from '~~/tests/factories/spotify.factory';
import {
  areTracksInOrder,
  getTrackListenTime,
  groupTracksByAlbum,
} from './tracks.utils';

describe('tracks.utils', () => {
  describe('areTracksInOrder', () => {
    it('should return true for tracks played in order', () => {
      const tracks: PlayHistory[] = [
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
        },
        {
          track: track({ disc_number: 1, track_number: 2 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
        },
        {
          track: track({ disc_number: 1, track_number: 3 }),
          played_at: '2024-01-01T10:10:00Z',
          context: context(),
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(true);
    });

    it('should return true when the same track is played multiple times', () => {
      const tracks: PlayHistory[] = [
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
        },
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
        },
        {
          track: track({ disc_number: 1, track_number: 2 }),
          played_at: '2024-01-01T10:10:00Z',
          context: context(),
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(true);
    });

    it('should return false for tracks played out of order', () => {
      const tracks: PlayHistory[] = [
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
        },
        {
          track: track({ disc_number: 1, track_number: 3 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(false);
    });

    it('should return true for multi-disc albums played in order', () => {
      const tracks: PlayHistory[] = [
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
        },
        {
          track: track({ disc_number: 1, track_number: 2 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
        },
        {
          track: track({ disc_number: 2, track_number: 1 }),
          played_at: '2024-01-01T10:10:00Z',
          context: context(),
        },
        {
          track: track({ disc_number: 2, track_number: 2 }),
          played_at: '2024-01-01T10:15:00Z',
          context: context(),
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(true);
    });

    it('should return false when going backwards on the same disc', () => {
      const tracks: PlayHistory[] = [
        {
          track: track({ disc_number: 1, track_number: 3 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
        },
        {
          track: track({ disc_number: 1, track_number: 2 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
        },
      ];

      expect(areTracksInOrder(tracks)).toBe(false);
    });

    it('should return true for empty track list', () => {
      expect(areTracksInOrder([])).toBe(true);
    });

    it('should return true for single track', () => {
      const tracks: PlayHistory[] = [
        {
          track: track({ disc_number: 1, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
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

      const tracks: PlayHistory[] = [
        {
          track: track({ album: album1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
        },
        {
          track: track({ album: album2 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
        },
        {
          track: track({ album: album1 }),
          played_at: '2024-01-01T10:10:00Z',
          context: context(),
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

      const tracks: PlayHistory[] = [
        {
          track: track({ album, track_number: 1 }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
        },
        {
          track: track({ album, track_number: 2 }),
          played_at: '2024-01-01T10:05:00Z',
          context: context(),
        },
        {
          track: track({ album, track_number: 3 }),
          played_at: '2024-01-01T10:10:00Z',
          context: context(),
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

      const tracks: PlayHistory[] = [
        {
          track: track({ album }),
          played_at: '2024-01-01T10:00:00Z',
          context: context(),
        },
      ];

      const result = groupTracksByAlbum(tracks);

      expect(result.size).toBe(1);
      expect(result.get('album1')?.tracks.length).toBe(1);
    });
  });

  describe('getTrackListenTime', () => {
    describe('night (22:00 - 04:59)', () => {
      it('should return night for 22:00', () => {
        expect(getTrackListenTime('2024-01-01T22:00:00Z')).toBe('night');
      });

      it('should return night for 23:59', () => {
        expect(getTrackListenTime('2024-01-01T23:59:00Z')).toBe('night');
      });

      it('should return night for midnight', () => {
        expect(getTrackListenTime('2024-01-01T00:00:00Z')).toBe('night');
      });

      it('should return night for 04:59', () => {
        expect(getTrackListenTime('2024-01-01T04:59:00Z')).toBe('night');
      });
    });

    describe('morning (05:00 - 11:59)', () => {
      it('should return morning for 05:00', () => {
        expect(getTrackListenTime('2024-01-01T05:00:00Z')).toBe('morning');
      });

      it('should return morning for 08:30', () => {
        expect(getTrackListenTime('2024-01-01T08:30:00Z')).toBe('morning');
      });

      it('should return morning for 11:59', () => {
        expect(getTrackListenTime('2024-01-01T11:59:00Z')).toBe('morning');
      });
    });

    describe('noon (12:00 - 17:59)', () => {
      it('should return noon for 12:00', () => {
        expect(getTrackListenTime('2024-01-01T12:00:00Z')).toBe('noon');
      });

      it('should return noon for 15:30', () => {
        expect(getTrackListenTime('2024-01-01T15:30:00Z')).toBe('noon');
      });

      it('should return noon for 17:59', () => {
        expect(getTrackListenTime('2024-01-01T17:59:00Z')).toBe('noon');
      });
    });

    describe('evening (18:00 - 21:59)', () => {
      it('should return evening for 18:00', () => {
        expect(getTrackListenTime('2024-01-01T18:00:00Z')).toBe('evening');
      });

      it('should return evening for 20:30', () => {
        expect(getTrackListenTime('2024-01-01T20:30:00Z')).toBe('evening');
      });

      it('should return evening for 21:59', () => {
        expect(getTrackListenTime('2024-01-01T21:59:00Z')).toBe('evening');
      });
    });

    describe('boundary conditions', () => {
      it('should handle transition from night to morning (04:59 -> 05:00)', () => {
        expect(getTrackListenTime('2024-01-01T04:59:59Z')).toBe('night');
        expect(getTrackListenTime('2024-01-01T05:00:00Z')).toBe('morning');
      });

      it('should handle transition from morning to noon (11:59 -> 12:00)', () => {
        expect(getTrackListenTime('2024-01-01T11:59:59Z')).toBe('morning');
        expect(getTrackListenTime('2024-01-01T12:00:00Z')).toBe('noon');
      });

      it('should handle transition from noon to evening (17:59 -> 18:00)', () => {
        expect(getTrackListenTime('2024-01-01T17:59:59Z')).toBe('noon');
        expect(getTrackListenTime('2024-01-01T18:00:00Z')).toBe('evening');
      });

      it('should handle transition from evening to night (21:59 -> 22:00)', () => {
        expect(getTrackListenTime('2024-01-01T21:59:59Z')).toBe('evening');
        expect(getTrackListenTime('2024-01-01T22:00:00Z')).toBe('night');
      });
    });
  });
});
