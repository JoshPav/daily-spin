import { describe, expect, it } from 'vitest';

import { getTrackListenTime } from './listenTime.utils';

describe('tracks.utils', () => {
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
