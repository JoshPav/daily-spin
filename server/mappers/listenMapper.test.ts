import { describe, expect, it } from 'vitest';
import {
  albumListen,
  albumModel,
  artistModel,
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

      expect(result.date).toBe('2024-06-15');
      expect(result.albums).toEqual([]);
      expect(result.favoriteSong).toBeNull();
    });

    it('should map a daily listen with a single album', () => {
      const artist = artistModel({ name: 'Test Artist' });
      const album = albumModel({
        spotifyId: 'album-123',
        name: 'Test Album',
        imageUrl: 'https://example.com/image.jpg',
        releaseDate: '2024-03-15',
        artists: [
          {
            id: 'aa-1',
            albumId: 'album-123',
            artistId: artist.id,
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            artist,
          },
        ],
      });

      const albumListenData = albumListen({
        album,
        listenOrder: 'ordered',
        listenMethod: 'spotify',
        listenTime: 'morning',
      });

      const dailyListen = dailyListenWithAlbums({
        date: new Date('2024-06-15'),
        albums: [albumListenData],
      });

      const result = mapDailyListens(dailyListen);

      expect(result.date).toBe('2024-06-15');
      expect(result.albums).toHaveLength(1);
      expect(result.albums[0]).toEqual({
        id: albumListenData.id,
        album: {
          albumId: 'album-123',
          albumName: 'Test Album',
          artists: [
            {
              name: 'Test Artist',
              spotifyId: artist.spotifyId,
            },
          ],
          imageUrl: 'https://example.com/image.jpg',
          releaseDate: '2024-03-15',
        },
        listenMetadata: {
          listenOrder: 'ordered',
          listenMethod: 'spotify',
          listenTime: 'morning',
        },
      });
      expect(result.favoriteSong).toBeNull();
    });

    it('should map a daily listen with multiple albums', () => {
      const artist1 = artistModel({ name: 'Artist One' });
      const artist2 = artistModel({ name: 'Artist Two' });

      const album1 = albumModel({
        spotifyId: 'album-1',
        name: 'First Album',
        imageUrl: 'https://example.com/image1.jpg',
        artists: [
          {
            id: 'aa-1',
            albumId: 'album-1',
            artistId: artist1.id,
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            artist: artist1,
          },
        ],
      });

      const album2 = albumModel({
        spotifyId: 'album-2',
        name: 'Second Album',
        imageUrl: 'https://example.com/image2.jpg',
        artists: [
          {
            id: 'aa-2',
            albumId: 'album-2',
            artistId: artist2.id,
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            artist: artist2,
          },
        ],
      });

      const dailyListen = dailyListenWithAlbums({
        date: new Date('2024-06-15'),
        albums: [
          albumListen({ album: album1 }),
          albumListen({ album: album2 }),
        ],
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

    it('should convert date to YYYY-MM-DD format', () => {
      const testDate = new Date('2024-12-25T00:00:00.000Z');
      const dailyListen = dailyListenWithAlbums({
        date: testDate,
        albums: [],
      });

      const result = mapDailyListens(dailyListen);

      expect(result.date).toBe('2024-12-25');
    });

    it('should preserve album order in the result', () => {
      const album1 = albumModel({ spotifyId: 'first', name: 'First' });
      const album2 = albumModel({ spotifyId: 'second', name: 'Second' });
      const album3 = albumModel({ spotifyId: 'third', name: 'Third' });

      const albums = [
        albumListen({ album: album1 }),
        albumListen({ album: album2 }),
        albumListen({ album: album3 }),
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

      // Result should only have date, albums, and favoriteSong properties
      expect(Object.keys(result)).toEqual(['date', 'albums', 'favoriteSong']);

      // Album result should only have id, album and listenMetadata
      expect(Object.keys(result.albums[0])).toEqual([
        'id',
        'album',
        'listenMetadata',
      ]);

      // Album should only have the expected fields
      expect(Object.keys(result.albums[0].album)).toEqual([
        'albumId',
        'albumName',
        'artists',
        'imageUrl',
        'releaseDate',
      ]);

      // Metadata should only have the expected fields (no favoriteSong - it's on DailyListens now)
      expect(Object.keys(result.albums[0].listenMetadata)).toEqual([
        'listenOrder',
        'listenMethod',
        'listenTime',
      ]);
    });
  });
});
