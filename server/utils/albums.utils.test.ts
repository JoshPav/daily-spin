import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';
import { describe, expect, it } from 'vitest';
import { getAlbumArtwork } from './albums.utils';

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
});
