import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';
import { describe, expect, it } from 'vitest';
import { simplifiedAlbum } from '~~/tests/factories/spotify.factory';
import { filterRealAlbums, getAlbumArtwork, isRealAlbum } from './albums.utils';

describe('albums.utils', () => {
  describe('getAlbumArtwork', () => {
    it('should return the 300px image URL when available', () => {
      const images: SimplifiedAlbum['images'] = [
        { url: 'https://example.com/640.jpg', height: 640, width: 640 },
        { url: 'https://example.com/300.jpg', height: 300, width: 300 },
        { url: 'https://example.com/64.jpg', height: 64, width: 64 },
      ];

      expect(getAlbumArtwork(images)).toBe('https://example.com/300.jpg');
    });

    it('should return the first image URL when 300px is not available', () => {
      const images: SimplifiedAlbum['images'] = [
        { url: 'https://example.com/640.jpg', height: 640, width: 640 },
        { url: 'https://example.com/64.jpg', height: 64, width: 64 },
      ];

      expect(getAlbumArtwork(images)).toBe('https://example.com/640.jpg');
    });

    it('should return undefined for empty images array', () => {
      const images: SimplifiedAlbum['images'] = [];

      expect(getAlbumArtwork(images)).toBeUndefined();
    });

    it('should find 300px image regardless of position in array', () => {
      const images: SimplifiedAlbum['images'] = [
        { url: 'https://example.com/64.jpg', height: 64, width: 64 },
        { url: 'https://example.com/300.jpg', height: 300, width: 300 },
        { url: 'https://example.com/640.jpg', height: 640, width: 640 },
      ];

      expect(getAlbumArtwork(images)).toBe('https://example.com/300.jpg');
    });

    it('should return single image URL when only one image exists', () => {
      const images: SimplifiedAlbum['images'] = [
        { url: 'https://example.com/500.jpg', height: 500, width: 500 },
      ];

      expect(getAlbumArtwork(images)).toBe('https://example.com/500.jpg');
    });

    it('should return 300px image even if it is the only image', () => {
      const images: SimplifiedAlbum['images'] = [
        { url: 'https://example.com/300.jpg', height: 300, width: 300 },
      ];

      expect(getAlbumArtwork(images)).toBe('https://example.com/300.jpg');
    });

    it('should match on width only, not height', () => {
      const images: SimplifiedAlbum['images'] = [
        { url: 'https://example.com/wide.jpg', height: 200, width: 300 },
        { url: 'https://example.com/tall.jpg', height: 300, width: 200 },
      ];

      expect(getAlbumArtwork(images)).toBe('https://example.com/wide.jpg');
    });

    it('should return first 300px image if multiple exist', () => {
      const images: SimplifiedAlbum['images'] = [
        { url: 'https://example.com/first-300.jpg', height: 300, width: 300 },
        { url: 'https://example.com/second-300.jpg', height: 300, width: 300 },
      ];

      expect(getAlbumArtwork(images)).toBe('https://example.com/first-300.jpg');
    });
  });

  describe('isRealAlbum', () => {
    it('should return true for album with 8+ tracks', () => {
      const album = simplifiedAlbum({ album_type: 'album', total_tracks: 10 });

      expect(isRealAlbum(album)).toBe(true);
    });

    it('should return true for album with exactly 4 tracks (minimum)', () => {
      const album = simplifiedAlbum({ album_type: 'album', total_tracks: 4 });

      expect(isRealAlbum(album)).toBe(true);
    });

    it('should return false for album with less than 4 tracks', () => {
      const album = simplifiedAlbum({ album_type: 'album', total_tracks: 3 });

      expect(isRealAlbum(album)).toBe(false);
    });

    it('should return false for singles', () => {
      const album = simplifiedAlbum({ album_type: 'single', total_tracks: 10 });

      expect(isRealAlbum(album)).toBe(false);
    });

    it('should return false for compilations', () => {
      const album = simplifiedAlbum({
        album_type: 'compilation',
        total_tracks: 20,
      });

      expect(isRealAlbum(album)).toBe(false);
    });

    it('should return true for album with 6 tracks', () => {
      const album = simplifiedAlbum({ album_type: 'album', total_tracks: 6 });

      expect(isRealAlbum(album)).toBe(true);
    });

    it('should return true for album with 7 tracks (max EP threshold)', () => {
      const album = simplifiedAlbum({ album_type: 'album', total_tracks: 7 });

      expect(isRealAlbum(album)).toBe(true);
    });
  });

  describe('filterRealAlbums', () => {
    it('should filter out singles and keep albums', () => {
      const albums = [
        simplifiedAlbum({ album_type: 'album', total_tracks: 10 }),
        simplifiedAlbum({ album_type: 'single', total_tracks: 3 }),
        simplifiedAlbum({ album_type: 'album', total_tracks: 8 }),
      ];

      const result = filterRealAlbums(albums);

      expect(result).toHaveLength(2);
      expect(result.every((a) => a.album_type === 'album')).toBe(true);
    });

    it('should filter out albums with too few tracks', () => {
      const albums = [
        simplifiedAlbum({ album_type: 'album', total_tracks: 10 }),
        simplifiedAlbum({ album_type: 'album', total_tracks: 2 }),
        simplifiedAlbum({ album_type: 'album', total_tracks: 4 }),
      ];

      const result = filterRealAlbums(albums);

      expect(result).toHaveLength(2);
      expect(result.every((a) => a.total_tracks >= 4)).toBe(true);
    });

    it('should filter out compilations', () => {
      const albums = [
        simplifiedAlbum({ album_type: 'album', total_tracks: 10 }),
        simplifiedAlbum({ album_type: 'compilation', total_tracks: 20 }),
      ];

      const result = filterRealAlbums(albums);

      expect(result).toHaveLength(1);
      expect(result[0]?.album_type).toBe('album');
    });

    it('should return empty array when no albums qualify', () => {
      const albums = [
        simplifiedAlbum({ album_type: 'single', total_tracks: 2 }),
        simplifiedAlbum({ album_type: 'compilation', total_tracks: 30 }),
      ];

      const result = filterRealAlbums(albums);

      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      expect(filterRealAlbums([])).toHaveLength(0);
    });
  });
});
