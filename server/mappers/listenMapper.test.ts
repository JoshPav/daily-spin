import { describe, expect, it } from 'vitest';
import {
  albumListen,
  dailyListenWithAlbums,
} from '~~/tests/factories/prisma.factory';
import { mapDailyListens } from './listenMapper';

describe('listenMapper', () => {
  describe('mapDailyListens', () => {
    it('should map a daily listen with no albums to an empty albums array', () => {
      const dailyListen = dailyListenWithAlbums({
        date: new Date('2024-06-15'),
        albums: [],
      });

      const result = mapDailyListens(dailyListen);

      expect(result.date).toBe('2024-06-15T00:00:00.000Z');
      expect(result.albums).toEqual([]);
    });

    it('should map a daily listen with a single album', () => {
      const album = albumListen({
        albumId: 'album-123',
        albumName: 'Test Album',
        artistNames: 'Test Artist',
        imageUrl: 'https://example.com/image.jpg',
        listenOrder: 'ordered',
        listenMethod: 'spotify',
        listenTime: 'morning',
      });

      const dailyListen = dailyListenWithAlbums({
        date: new Date('2024-06-15'),
        albums: [album],
      });

      const result = mapDailyListens(dailyListen);

      expect(result.date).toBe('2024-06-15T00:00:00.000Z');
      expect(result.albums).toHaveLength(1);
      expect(result.albums[0]).toEqual({
        album: {
          albumId: 'album-123',
          albumName: 'Test Album',
          artistNames: 'Test Artist',
          imageUrl: 'https://example.com/image.jpg',
        },
        listenMetadata: {
          listenOrder: 'ordered',
          listenMethod: 'spotify',
          listenTime: 'morning',
        },
      });
    });

    it('should map a daily listen with multiple albums', () => {
      const album1 = albumListen({
        albumId: 'album-1',
        albumName: 'First Album',
        artistNames: 'Artist One',
        imageUrl: 'https://example.com/image1.jpg',
      });

      const album2 = albumListen({
        albumId: 'album-2',
        albumName: 'Second Album',
        artistNames: 'Artist Two',
        imageUrl: 'https://example.com/image2.jpg',
      });

      const dailyListen = dailyListenWithAlbums({
        date: new Date('2024-06-15'),
        albums: [album1, album2],
      });

      const result = mapDailyListens(dailyListen);

      expect(result.albums).toHaveLength(2);
      expect(result.albums[0].album.albumId).toBe('album-1');
      expect(result.albums[1].album.albumId).toBe('album-2');
    });

    it('should handle null listenTime', () => {
      const album = albumListen({
        listenTime: null,
      });

      const dailyListen = dailyListenWithAlbums({
        date: new Date('2024-06-15'),
        albums: [album],
      });

      const result = mapDailyListens(dailyListen);

      expect(result.albums[0].listenMetadata.listenTime).toBeNull();
    });

    it('should map all listen order values correctly', () => {
      const orderedAlbum = albumListen({ listenOrder: 'ordered' });
      const shuffledAlbum = albumListen({ listenOrder: 'shuffled' });
      const interruptedAlbum = albumListen({ listenOrder: 'interrupted' });

      const dailyListen = dailyListenWithAlbums({
        date: new Date('2024-06-15'),
        albums: [orderedAlbum, shuffledAlbum, interruptedAlbum],
      });

      const result = mapDailyListens(dailyListen);

      expect(result.albums[0].listenMetadata.listenOrder).toBe('ordered');
      expect(result.albums[1].listenMetadata.listenOrder).toBe('shuffled');
      expect(result.albums[2].listenMetadata.listenOrder).toBe('interrupted');
    });

    it('should map all listen method values correctly', () => {
      const spotifyAlbum = albumListen({ listenMethod: 'spotify' });
      const vinylAlbum = albumListen({ listenMethod: 'vinyl' });
      const streamedAlbum = albumListen({ listenMethod: 'streamed' });

      const dailyListen = dailyListenWithAlbums({
        date: new Date('2024-06-15'),
        albums: [spotifyAlbum, vinylAlbum, streamedAlbum],
      });

      const result = mapDailyListens(dailyListen);

      expect(result.albums[0].listenMetadata.listenMethod).toBe('spotify');
      expect(result.albums[1].listenMetadata.listenMethod).toBe('vinyl');
      expect(result.albums[2].listenMetadata.listenMethod).toBe('streamed');
    });

    it('should map all listen time values correctly', () => {
      const morningAlbum = albumListen({ listenTime: 'morning' });
      const noonAlbum = albumListen({ listenTime: 'noon' });
      const eveningAlbum = albumListen({ listenTime: 'evening' });
      const nightAlbum = albumListen({ listenTime: 'night' });

      const dailyListen = dailyListenWithAlbums({
        date: new Date('2024-06-15'),
        albums: [morningAlbum, noonAlbum, eveningAlbum, nightAlbum],
      });

      const result = mapDailyListens(dailyListen);

      expect(result.albums[0].listenMetadata.listenTime).toBe('morning');
      expect(result.albums[1].listenMetadata.listenTime).toBe('noon');
      expect(result.albums[2].listenMetadata.listenTime).toBe('evening');
      expect(result.albums[3].listenMetadata.listenTime).toBe('night');
    });

    it('should convert date to ISO string format', () => {
      const testDate = new Date('2024-12-25T00:00:00.000Z');
      const dailyListen = dailyListenWithAlbums({
        date: testDate,
        albums: [],
      });

      const result = mapDailyListens(dailyListen);

      expect(result.date).toBe('2024-12-25T00:00:00.000Z');
    });

    it('should preserve album order in the result', () => {
      const albums = [
        albumListen({ albumId: 'first', albumName: 'First' }),
        albumListen({ albumId: 'second', albumName: 'Second' }),
        albumListen({ albumId: 'third', albumName: 'Third' }),
      ];

      const dailyListen = dailyListenWithAlbums({
        date: new Date('2024-06-15'),
        albums,
      });

      const result = mapDailyListens(dailyListen);

      expect(result.albums[0].album.albumName).toBe('First');
      expect(result.albums[1].album.albumName).toBe('Second');
      expect(result.albums[2].album.albumName).toBe('Third');
    });

    it('should not include extra database fields in the result', () => {
      const album = albumListen({
        id: 'should-not-appear',
        dailyListenId: 'should-not-appear',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dailyListen = dailyListenWithAlbums({
        id: 'daily-listen-id',
        userId: 'user-id',
        date: new Date('2024-06-15'),
        albums: [album],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = mapDailyListens(dailyListen);

      // Result should only have date and albums properties
      expect(Object.keys(result)).toEqual(['date', 'albums']);

      // Album result should only have album and listenMetadata
      expect(Object.keys(result.albums[0])).toEqual([
        'album',
        'listenMetadata',
      ]);

      // Album should only have the expected fields
      expect(Object.keys(result.albums[0].album)).toEqual([
        'albumId',
        'albumName',
        'artistNames',
        'imageUrl',
      ]);

      // Metadata should only have the expected fields
      expect(Object.keys(result.albums[0].listenMetadata)).toEqual([
        'listenOrder',
        'listenMethod',
        'listenTime',
      ]);
    });
  });
});
