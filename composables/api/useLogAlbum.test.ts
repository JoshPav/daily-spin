import type { SimplifiedArtist } from '@spotify/web-api-ts-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useLogAlbum } from './useLogAlbum';

const mockSearchResult = {
  id: 'test-album-id',
  name: 'Test Album',
  artists: [{ name: 'Test Artist' }],
  images: [{ url: 'https://example.com/image.jpg' }],
} as SearchResult;

describe('useLogAlbum', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('$fetch', mockFetch);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with undefined selectedAlbum', () => {
      const date = ref(new Date('2024-01-15'));
      const { selectedAlbum } = useLogAlbum({ date });

      expect(selectedAlbum.value).toBeUndefined();
    });

    it('should initialize listenedInOrder as true', () => {
      const date = ref(new Date('2024-01-15'));
      const { listenedInOrder } = useLogAlbum({ date });

      expect(listenedInOrder.value).toBe(true);
    });

    it('should initialize listenMethod as spotify', () => {
      const date = ref(new Date('2024-01-15'));
      const { listenMethod } = useLogAlbum({ date });

      expect(listenMethod.value).toBe('spotify');
    });

    it('should initialize saving as false', () => {
      const date = ref(new Date('2024-01-15'));
      const { saving } = useLogAlbum({ date });

      expect(saving.value).toBe(false);
    });
  });

  describe('form state updates', () => {
    it('should update selectedAlbum', () => {
      const date = ref(new Date('2024-01-15'));
      const { selectedAlbum } = useLogAlbum({ date });

      selectedAlbum.value = mockSearchResult;

      expect(selectedAlbum.value).toStrictEqual(mockSearchResult);
    });

    it('should update listenedInOrder', () => {
      const date = ref(new Date('2024-01-15'));
      const { listenedInOrder } = useLogAlbum({ date });

      listenedInOrder.value = false;

      expect(listenedInOrder.value).toBe(false);
    });

    it('should update listenMethod', () => {
      const date = ref(new Date('2024-01-15'));
      const { listenMethod } = useLogAlbum({ date });

      listenMethod.value = 'vinyl';

      expect(listenMethod.value).toBe('vinyl');
    });
  });

  describe('logAlbumListen', () => {
    it('should not call API if selectedAlbum is undefined', async () => {
      const date = ref(new Date('2024-01-15'));
      const { logAlbumListen } = useLogAlbum({ date });

      await logAlbumListen();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not call API if date is undefined', async () => {
      const date = ref<Date | undefined>(undefined);
      const { selectedAlbum, logAlbumListen } = useLogAlbum({ date });

      selectedAlbum.value = mockSearchResult;
      await logAlbumListen();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call API with correct payload', async () => {
      // Mock the current time to be 10:00 AM (morning)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));

      const testDate = new Date('2024-01-15');
      const date = ref(testDate);
      const { selectedAlbum, logAlbumListen } = useLogAlbum({ date });

      selectedAlbum.value = mockSearchResult;
      await logAlbumListen();

      expect(mockFetch).toHaveBeenCalledWith('/api/listens', {
        method: 'POST',
        body: {
          date: testDate.toISOString(),
          album: {
            albumId: 'test-album-id',
            albumName: 'Test Album',
            artistNames: 'Test Artist',
            imageUrl: 'https://example.com/image.jpg',
          },
          listenMetadata: {
            inOrder: true,
            listenMethod: 'spotify',
            listenTime: 'morning',
          },
        },
      });

      vi.useRealTimers();
    });

    it('should set saving to true while loading', async () => {
      const date = ref(new Date('2024-01-15'));
      const { selectedAlbum, saving, logAlbumListen } = useLogAlbum({ date });

      selectedAlbum.value = mockSearchResult;

      const promise = logAlbumListen();
      expect(saving.value).toBe(true);

      await promise;
    });

    it('should set saving to false after success', async () => {
      const date = ref(new Date('2024-01-15'));
      const { selectedAlbum, saving, logAlbumListen } = useLogAlbum({ date });

      selectedAlbum.value = mockSearchResult;
      await logAlbumListen();

      expect(saving.value).toBe(false);
    });

    it('should set saving to false after error', async () => {
      vi.mocked(mockFetch).mockRejectedValueOnce(new Error('API Error'));

      const date = ref(new Date('2024-01-15'));
      const { selectedAlbum, saving, logAlbumListen } = useLogAlbum({ date });

      selectedAlbum.value = mockSearchResult;
      await logAlbumListen();

      expect(saving.value).toBe(false);
    });

    it('should reset form after successful save', async () => {
      const date = ref(new Date('2024-01-15'));
      const { selectedAlbum, listenedInOrder, listenMethod, logAlbumListen } =
        useLogAlbum({ date });

      selectedAlbum.value = mockSearchResult;
      listenedInOrder.value = false;
      listenMethod.value = 'vinyl';

      await logAlbumListen();

      expect(selectedAlbum.value).toBeUndefined();
      expect(listenedInOrder.value).toBe(true);
      expect(listenMethod.value).toBe('spotify');
    });

    it('should call onSuccess callback after successful save', async () => {
      const onSuccess = vi.fn();
      const date = ref(new Date('2024-01-15'));
      const { selectedAlbum, logAlbumListen } = useLogAlbum({
        date,
        onSuccess,
      });

      selectedAlbum.value = mockSearchResult;
      await logAlbumListen();

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('should not call onSuccess callback after error', async () => {
      vi.mocked(mockFetch).mockRejectedValueOnce(new Error('API Error'));

      const onSuccess = vi.fn();
      const date = ref(new Date('2024-01-15'));
      const { selectedAlbum, logAlbumListen } = useLogAlbum({
        date,
        onSuccess,
      });

      selectedAlbum.value = mockSearchResult;
      await logAlbumListen();

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should handle multiple artists correctly', async () => {
      const date = ref(new Date('2024-01-15'));
      const { selectedAlbum, logAlbumListen } = useLogAlbum({ date });

      selectedAlbum.value = {
        ...mockSearchResult,
        artists: [
          { name: 'Artist 1' } as SimplifiedArtist,
          { name: 'Artist 2' } as SimplifiedArtist,
          { name: 'Artist 3' } as SimplifiedArtist,
        ],
      };
      await logAlbumListen();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/listens',
        expect.objectContaining({
          body: expect.objectContaining({
            album: expect.objectContaining({
              artistNames: 'Artist 1, Artist 2, Artist 3',
            }),
          }),
        }),
      );
    });

    it('should handle album with no images', async () => {
      const date = ref(new Date('2024-01-15'));
      const { selectedAlbum, logAlbumListen } = useLogAlbum({ date });

      selectedAlbum.value = {
        ...mockSearchResult,
        images: [],
      };
      await logAlbumListen();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/listens',
        expect.objectContaining({
          body: expect.objectContaining({
            album: expect.objectContaining({
              imageUrl: '',
            }),
          }),
        }),
      );
    });
  });
});
