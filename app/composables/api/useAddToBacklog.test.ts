import type { Artist } from '@spotify/web-api-ts-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { simplifiedAlbum, simplifiedArtist } from '~~/tests/factories/spotify.factory';
import { useAddToBacklog } from './useAddToBacklog';
import type { SearchResult } from './useSpotifyAlbumSearch';

const mockFetch = vi.fn();
const mockArtistsGet = vi.fn();

const mockSpotifyApi = {
  artists: {
    get: mockArtistsGet,
  },
};

function createSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  const album = simplifiedAlbum();
  return {
    ...album,
    ...overrides,
  } as SearchResult;
}

function createFullArtist(id: string, name: string, imageUrl?: string): Artist {
  return {
    id,
    name,
    type: 'artist',
    uri: `spotify:artist:${id}`,
    href: `https://api.spotify.com/v1/artists/${id}`,
    external_urls: { spotify: `https://open.spotify.com/artist/${id}` },
    followers: { href: null, total: 1000 },
    genres: ['rock'],
    images: imageUrl ? [{ url: imageUrl, height: 640, width: 640 }] : [],
    popularity: 75,
  };
}

describe('useAddToBacklog', () => {
  beforeEach(() => {
    vi.stubGlobal('$fetch', mockFetch);
    vi.stubGlobal('useSpotifyApi', vi.fn(async () => mockSpotifyApi));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with empty selectedAlbums', () => {
      const { selectedAlbums } = useAddToBacklog();

      expect(selectedAlbums.value).toEqual([]);
    });

    it('should initialize saving as false', () => {
      const { saving } = useAddToBacklog();

      expect(saving.value).toBe(false);
    });

    it('should initialize error as null', () => {
      const { error } = useAddToBacklog();

      expect(error.value).toBeNull();
    });
  });

  describe('isSelected', () => {
    it('should return true if album is selected', () => {
      const { selectedAlbums, isSelected } = useAddToBacklog();
      const album = createSearchResult({ id: 'album1' });

      selectedAlbums.value = [album];

      expect(isSelected(album)).toBe(true);
    });

    it('should return false if album is not selected', () => {
      const { selectedAlbums, isSelected } = useAddToBacklog();
      const album1 = createSearchResult({ id: 'album1' });
      const album2 = createSearchResult({ id: 'album2' });

      selectedAlbums.value = [album1];

      expect(isSelected(album2)).toBe(false);
    });

    it('should return false when no albums are selected', () => {
      const { isSelected } = useAddToBacklog();
      const album = createSearchResult({ id: 'album1' });

      expect(isSelected(album)).toBe(false);
    });
  });

  describe('toggleSelection', () => {
    it('should add album to selection if not already selected', () => {
      const { selectedAlbums, toggleSelection } = useAddToBacklog();
      const album = createSearchResult({ id: 'album1' });

      toggleSelection(album);

      expect(selectedAlbums.value).toContainEqual(album);
    });

    it('should remove album from selection if already selected', () => {
      const { selectedAlbums, toggleSelection } = useAddToBacklog();
      const album = createSearchResult({ id: 'album1' });

      selectedAlbums.value = [album];
      toggleSelection(album);

      expect(selectedAlbums.value).not.toContainEqual(album);
    });

    it('should allow selecting multiple albums', () => {
      const { selectedAlbums, toggleSelection } = useAddToBacklog();
      const album1 = createSearchResult({ id: 'album1' });
      const album2 = createSearchResult({ id: 'album2' });

      toggleSelection(album1);
      toggleSelection(album2);

      expect(selectedAlbums.value).toHaveLength(2);
      expect(selectedAlbums.value).toContainEqual(album1);
      expect(selectedAlbums.value).toContainEqual(album2);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected albums', () => {
      const { selectedAlbums, clearSelection } = useAddToBacklog();
      const album1 = createSearchResult({ id: 'album1' });
      const album2 = createSearchResult({ id: 'album2' });

      selectedAlbums.value = [album1, album2];
      clearSelection();

      expect(selectedAlbums.value).toEqual([]);
    });
  });

  describe('addToBacklog', () => {
    it('should not call API if no albums are selected', async () => {
      const { addToBacklog } = useAddToBacklog();

      await addToBacklog();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should set saving to true while adding', async () => {
      const { selectedAlbums, saving, addToBacklog } = useAddToBacklog();
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist],
      });

      mockArtistsGet.mockResolvedValue([
        createFullArtist('artist1', 'Test Artist', 'https://example.com/artist.jpg'),
      ]);
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ added: 1 }), 100)),
      );

      selectedAlbums.value = [album];
      const promise = addToBacklog();

      expect(saving.value).toBe(true);

      await promise;
    });

    it('should set saving to false after successful add', async () => {
      const { selectedAlbums, saving, addToBacklog } = useAddToBacklog();
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist],
      });

      mockArtistsGet.mockResolvedValue([
        createFullArtist('artist1', 'Test Artist', 'https://example.com/artist.jpg'),
      ]);
      mockFetch.mockResolvedValue({ added: 1 });

      selectedAlbums.value = [album];
      await addToBacklog();

      expect(saving.value).toBe(false);
    });

    it('should set saving to false after error', async () => {
      const { selectedAlbums, saving, addToBacklog } = useAddToBacklog();
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist],
      });

      mockArtistsGet.mockResolvedValue([]);
      mockFetch.mockRejectedValue(new Error('API Error'));

      selectedAlbums.value = [album];

      await expect(addToBacklog()).rejects.toThrow('API Error');
      expect(saving.value).toBe(false);
    });

    it('should call API with correct payload including artist images', async () => {
      const { selectedAlbums, addToBacklog } = useAddToBacklog();
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        name: 'Test Album',
        images: [{ url: 'https://example.com/album.jpg', height: 640, width: 640 }],
        release_date: '2024-01-15',
        total_tracks: 10,
        artists: [artist],
      });

      mockArtistsGet.mockResolvedValue([
        createFullArtist('artist1', 'Test Artist', 'https://example.com/artist.jpg'),
      ]);
      mockFetch.mockResolvedValue({ added: 1 });

      selectedAlbums.value = [album];
      await addToBacklog();

      expect(mockFetch).toHaveBeenCalledWith('/api/backlog', {
        method: 'POST',
        body: [
          {
            spotifyId: 'album1',
            name: 'Test Album',
            imageUrl: 'https://example.com/album.jpg',
            releaseDate: '2024-01-15',
            totalTracks: 10,
            artists: [
              {
                spotifyId: 'artist1',
                name: 'Test Artist',
                imageUrl: 'https://example.com/artist.jpg',
              },
            ],
          },
        ],
      });
    });

    it('should fetch artist images from Spotify API', async () => {
      const { selectedAlbums, addToBacklog } = useAddToBacklog();
      const artist1 = simplifiedArtist({ id: 'artist1', name: 'Artist 1' });
      const artist2 = simplifiedArtist({ id: 'artist2', name: 'Artist 2' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist1, artist2],
      });

      mockArtistsGet.mockResolvedValue([
        createFullArtist('artist1', 'Artist 1', 'https://example.com/artist1.jpg'),
        createFullArtist('artist2', 'Artist 2', 'https://example.com/artist2.jpg'),
      ]);
      mockFetch.mockResolvedValue({ added: 1 });

      selectedAlbums.value = [album];
      await addToBacklog();

      expect(mockArtistsGet).toHaveBeenCalledWith(['artist1', 'artist2']);
    });

    it('should deduplicate artist IDs across multiple albums', async () => {
      const { selectedAlbums, addToBacklog } = useAddToBacklog();
      const sharedArtist = simplifiedArtist({ id: 'shared-artist', name: 'Shared Artist' });
      const album1 = createSearchResult({
        id: 'album1',
        artists: [sharedArtist],
      });
      const album2 = createSearchResult({
        id: 'album2',
        artists: [sharedArtist],
      });

      mockArtistsGet.mockResolvedValue([
        createFullArtist('shared-artist', 'Shared Artist', 'https://example.com/shared.jpg'),
      ]);
      mockFetch.mockResolvedValue({ added: 2 });

      selectedAlbums.value = [album1, album2];
      await addToBacklog();

      // Should only fetch once for the deduplicated artist ID
      expect(mockArtistsGet).toHaveBeenCalledWith(['shared-artist']);
      expect(mockArtistsGet).toHaveBeenCalledTimes(1);
    });

    it('should handle artists without images', async () => {
      const { selectedAlbums, addToBacklog } = useAddToBacklog();
      const artist = simplifiedArtist({ id: 'artist1', name: 'Artist Without Image' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist],
      });

      // Artist without images array
      mockArtistsGet.mockResolvedValue([
        createFullArtist('artist1', 'Artist Without Image'),
      ]);
      mockFetch.mockResolvedValue({ added: 1 });

      selectedAlbums.value = [album];
      await addToBacklog();

      expect(mockFetch).toHaveBeenCalledWith('/api/backlog', {
        method: 'POST',
        body: [
          expect.objectContaining({
            artists: [
              expect.objectContaining({
                spotifyId: 'artist1',
                imageUrl: undefined,
              }),
            ],
          }),
        ],
      });
    });

    it('should clear selection after successful add', async () => {
      const { selectedAlbums, addToBacklog } = useAddToBacklog();
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist],
      });

      mockArtistsGet.mockResolvedValue([
        createFullArtist('artist1', 'Test Artist', 'https://example.com/artist.jpg'),
      ]);
      mockFetch.mockResolvedValue({ added: 1 });

      selectedAlbums.value = [album];
      await addToBacklog();

      expect(selectedAlbums.value).toEqual([]);
    });

    it('should call onSuccess callback after successful add', async () => {
      const onSuccess = vi.fn();
      const { selectedAlbums, addToBacklog } = useAddToBacklog({ onSuccess });
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist],
      });

      mockArtistsGet.mockResolvedValue([
        createFullArtist('artist1', 'Test Artist', 'https://example.com/artist.jpg'),
      ]);
      const response = { added: 1 };
      mockFetch.mockResolvedValue(response);

      selectedAlbums.value = [album];
      await addToBacklog();

      expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('should not call onSuccess callback on error', async () => {
      const onSuccess = vi.fn();
      const { selectedAlbums, addToBacklog } = useAddToBacklog({ onSuccess });
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist],
      });

      mockArtistsGet.mockResolvedValue([]);
      mockFetch.mockRejectedValue(new Error('API Error'));

      selectedAlbums.value = [album];

      await expect(addToBacklog()).rejects.toThrow();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should set error message on failure', async () => {
      const { selectedAlbums, error, addToBacklog } = useAddToBacklog();
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist],
      });

      mockArtistsGet.mockResolvedValue([]);
      mockFetch.mockRejectedValue(new Error('Network Error'));

      selectedAlbums.value = [album];

      await expect(addToBacklog()).rejects.toThrow();
      expect(error.value).toBe('Network Error');
    });

    it('should handle non-Error exceptions', async () => {
      const { selectedAlbums, error, addToBacklog } = useAddToBacklog();
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist],
      });

      mockArtistsGet.mockResolvedValue([]);
      mockFetch.mockRejectedValue('String error');

      selectedAlbums.value = [album];

      await expect(addToBacklog()).rejects.toBe('String error');
      expect(error.value).toBe('Failed to add albums');
    });

    it('should handle Spotify API unavailable gracefully', async () => {
      vi.stubGlobal('useSpotifyApi', vi.fn(async () => null));

      const { selectedAlbums, addToBacklog } = useAddToBacklog();
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        name: 'Test Album',
        artists: [artist],
      });

      mockFetch.mockResolvedValue({ added: 1 });

      selectedAlbums.value = [album];
      await addToBacklog();

      // Should still call API, just without artist images
      expect(mockFetch).toHaveBeenCalledWith('/api/backlog', {
        method: 'POST',
        body: [
          expect.objectContaining({
            artists: [
              expect.objectContaining({
                spotifyId: 'artist1',
                imageUrl: undefined,
              }),
            ],
          }),
        ],
      });
    });

    it('should batch fetch artists when more than 50', async () => {
      const { selectedAlbums, addToBacklog } = useAddToBacklog();

      // Create 60 unique artists
      const artists = Array.from({ length: 60 }, (_, i) =>
        simplifiedArtist({ id: `artist${i}`, name: `Artist ${i}` }),
      );

      // Create an album with all 60 artists
      const album = createSearchResult({
        id: 'album1',
        artists,
      });

      // Mock responses for both batches
      const fullArtistsBatch1 = artists.slice(0, 50).map((a) =>
        createFullArtist(a.id, a.name, `https://example.com/${a.id}.jpg`),
      );
      const fullArtistsBatch2 = artists.slice(50).map((a) =>
        createFullArtist(a.id, a.name, `https://example.com/${a.id}.jpg`),
      );

      mockArtistsGet
        .mockResolvedValueOnce(fullArtistsBatch1)
        .mockResolvedValueOnce(fullArtistsBatch2);
      mockFetch.mockResolvedValue({ added: 1 });

      selectedAlbums.value = [album];
      await addToBacklog();

      // Should be called twice for batches of 50 and 10
      expect(mockArtistsGet).toHaveBeenCalledTimes(2);
      expect(mockArtistsGet).toHaveBeenNthCalledWith(
        1,
        artists.slice(0, 50).map((a) => a.id),
      );
      expect(mockArtistsGet).toHaveBeenNthCalledWith(
        2,
        artists.slice(50).map((a) => a.id),
      );
    });

    it('should return the API response', async () => {
      const { selectedAlbums, addToBacklog } = useAddToBacklog();
      const artist = simplifiedArtist({ id: 'artist1', name: 'Test Artist' });
      const album = createSearchResult({
        id: 'album1',
        artists: [artist],
      });

      mockArtistsGet.mockResolvedValue([
        createFullArtist('artist1', 'Test Artist', 'https://example.com/artist.jpg'),
      ]);
      const response = { added: 1, skipped: 0 };
      mockFetch.mockResolvedValue(response);

      selectedAlbums.value = [album];
      const result = await addToBacklog();

      expect(result).toEqual(response);
    });
  });
});
