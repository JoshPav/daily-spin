import { describe, expect, it } from 'vitest';
import {
  simplifiedAlbum,
  simplifiedArtist,
} from '~~/tests/factories/spotify.factory';
import { formatReleaseDate, getArtistNames } from './albumUtils';

describe('albumUtils', () => {
  describe('getArtistNames', () => {
    describe('with artist array', () => {
      it('should return a single artist name', () => {
        const artists = [simplifiedArtist({ name: 'The Beatles' })];

        expect(getArtistNames(artists)).toBe('The Beatles');
      });

      it('should join multiple artist names with commas', () => {
        const artists = [
          simplifiedArtist({ name: 'Daft Punk' }),
          simplifiedArtist({ name: 'Pharrell Williams' }),
        ];

        expect(getArtistNames(artists)).toBe('Daft Punk, Pharrell Williams');
      });

      it('should handle three or more artists', () => {
        const artists = [
          simplifiedArtist({ name: 'Artist One' }),
          simplifiedArtist({ name: 'Artist Two' }),
          simplifiedArtist({ name: 'Artist Three' }),
        ];

        expect(getArtistNames(artists)).toBe(
          'Artist One, Artist Two, Artist Three',
        );
      });

      it('should return empty string for empty array', () => {
        expect(getArtistNames([])).toBe('');
      });
    });

    describe('with album object', () => {
      it('should extract and join artist names from album', () => {
        const album = simplifiedAlbum({
          artists: [
            simplifiedArtist({ name: 'Pink Floyd' }),
            simplifiedArtist({ name: 'Roger Waters' }),
          ],
        });

        expect(getArtistNames(album)).toBe('Pink Floyd, Roger Waters');
      });

      it('should handle album with single artist', () => {
        const album = simplifiedAlbum({
          artists: [simplifiedArtist({ name: 'Radiohead' })],
        });

        expect(getArtistNames(album)).toBe('Radiohead');
      });
    });
  });

  describe('formatReleaseDate', () => {
    it('should return null for undefined input', () => {
      expect(formatReleaseDate(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(formatReleaseDate('')).toBeNull();
    });

    it('should return year only for 4-character date', () => {
      expect(formatReleaseDate('2024')).toBe('2024');
    });

    it('should format year-month date', () => {
      expect(formatReleaseDate('2024-03')).toBe('Mar 2024');
    });

    it('should format year-month for January', () => {
      expect(formatReleaseDate('2024-01')).toBe('Jan 2024');
    });

    it('should format year-month for December', () => {
      expect(formatReleaseDate('2024-12')).toBe('Dec 2024');
    });

    it('should format full date', () => {
      expect(formatReleaseDate('2024-03-15')).toBe('Mar 15, 2024');
    });

    it('should format full date for first day of month', () => {
      expect(formatReleaseDate('2024-01-01')).toBe('Jan 1, 2024');
    });

    it('should format full date for last day of month', () => {
      expect(formatReleaseDate('2024-12-31')).toBe('Dec 31, 2024');
    });
  });
});
