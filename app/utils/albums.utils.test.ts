import { describe, expect, it } from 'vitest';
import {
  album,
  artist,
  dailyAlbumListen,
  dailyListens,
  favouriteSong,
  scheduledListenAlbum,
} from '~~/tests/factories/api.factory';
import {
  getPrimaryAlbum,
  scheduledAlbumToCardInfo,
  toAlbumCardInfo,
} from './albums.utils';

describe('getPrimaryAlbum', () => {
  it('returns null when there are no albums', () => {
    const day = {
      date: '2026-01-15',
      albums: [],
      favoriteSong: null,
    };

    const result = getPrimaryAlbum(day);

    expect(result).toBeNull();
  });

  it('returns the only album when there is one album', () => {
    const singleAlbum = album({ albumId: 'album-1' });
    const day = dailyListens({
      albums: [dailyAlbumListen({ album: singleAlbum })],
      favoriteSong: null,
    });

    const result = getPrimaryAlbum(day);

    expect(result).toEqual(singleAlbum);
  });

  it('returns the first album when no favorite song is set', () => {
    const firstAlbum = album({ albumId: 'album-1' });
    const secondAlbum = album({ albumId: 'album-2' });
    const day = dailyListens({
      albums: [
        dailyAlbumListen({ album: firstAlbum }),
        dailyAlbumListen({ album: secondAlbum }),
      ],
      favoriteSong: null,
    });

    const result = getPrimaryAlbum(day);

    expect(result).toEqual(firstAlbum);
  });

  it('returns the album containing the favorite song when set', () => {
    const firstAlbum = album({ albumId: 'album-1' });
    const secondAlbum = album({ albumId: 'album-2' });
    const favSong = favouriteSong({ albumId: 'album-2' });
    const day = dailyListens({
      albums: [
        dailyAlbumListen({ album: firstAlbum }),
        dailyAlbumListen({ album: secondAlbum }),
      ],
      favoriteSong: favSong,
    });

    const result = getPrimaryAlbum(day);

    expect(result).toEqual(secondAlbum);
  });

  it('falls back to first album when favorite song album not found', () => {
    const firstAlbum = album({ albumId: 'album-1' });
    const secondAlbum = album({ albumId: 'album-2' });
    const favSong = favouriteSong({ albumId: 'non-existent-album' });
    const day = dailyListens({
      albums: [
        dailyAlbumListen({ album: firstAlbum }),
        dailyAlbumListen({ album: secondAlbum }),
      ],
      favoriteSong: favSong,
    });

    const result = getPrimaryAlbum(day);

    expect(result).toEqual(firstAlbum);
  });
});

describe('toAlbumCardInfo', () => {
  it('returns null when album is null', () => {
    const result = toAlbumCardInfo(null);

    expect(result).toBeNull();
  });

  it('converts album to AlbumCardInfo format', () => {
    const testArtist = artist({ name: 'Test Artist' });
    const testAlbum = album({
      albumName: 'Test Album',
      imageUrl: 'https://example.com/image.jpg',
      artists: [testArtist],
    });

    const result = toAlbumCardInfo(testAlbum);

    expect(result).toEqual({
      imageUrl: 'https://example.com/image.jpg',
      artistName: 'Test Artist',
      albumName: 'Test Album',
    });
  });

  it('uses "Unknown Artist" when artists array is empty', () => {
    // Create directly to bypass factory merge behavior
    const testAlbum = {
      albumId: 'test-id',
      albumName: 'Test Album',
      imageUrl: 'https://example.com/image.jpg',
      artists: [],
    };

    const result = toAlbumCardInfo(testAlbum);

    expect(result?.artistName).toBe('Unknown Artist');
  });

  it('uses first artist when multiple artists exist', () => {
    const testAlbum = album({
      artists: [
        artist({ name: 'First Artist' }),
        artist({ name: 'Second Artist' }),
      ],
    });

    const result = toAlbumCardInfo(testAlbum);

    expect(result?.artistName).toBe('First Artist');
  });
});

describe('scheduledAlbumToCardInfo', () => {
  it('returns null when album is null', () => {
    const result = scheduledAlbumToCardInfo(null);

    expect(result).toBeNull();
  });

  it('converts scheduled album to AlbumCardInfo format', () => {
    const testArtist = artist({ name: 'Scheduled Artist' });
    const testAlbum = scheduledListenAlbum({
      name: 'Scheduled Album',
      imageUrl: 'https://example.com/scheduled.jpg',
      artists: [testArtist],
    });

    const result = scheduledAlbumToCardInfo(testAlbum);

    expect(result).toEqual({
      imageUrl: 'https://example.com/scheduled.jpg',
      artistName: 'Scheduled Artist',
      albumName: 'Scheduled Album',
    });
  });

  it('uses "Unknown Artist" when artists array is empty', () => {
    // Create directly to bypass factory merge behavior
    const testAlbum = {
      spotifyId: 'test-id',
      name: 'Test Album',
      imageUrl: 'https://example.com/image.jpg',
      artists: [],
      releaseDate: '2024-01-01',
    };

    const result = scheduledAlbumToCardInfo(testAlbum);

    expect(result?.artistName).toBe('Unknown Artist');
  });
});
