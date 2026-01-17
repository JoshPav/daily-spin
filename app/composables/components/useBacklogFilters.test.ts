import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import type { BacklogAlbum } from '#shared/schema';
import { backlogAlbum } from '~~/tests/factories/api.factory';
import { useBacklogFilters } from './useBacklogFilters';

describe('useBacklogFilters', () => {
  describe('search filtering', () => {
    it('should filter albums by name', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({ id: '1', name: 'Abbey Road' }),
        backlogAlbum({ id: '2', name: 'Dark Side of the Moon' }),
        backlogAlbum({ id: '3', name: 'The Wall' }),
      ]);

      const { searchTerm, filteredAlbums } = useBacklogFilters(albums);

      searchTerm.value = 'abbey';
      expect(filteredAlbums.value).toHaveLength(1);
      expect(filteredAlbums.value[0]?.name).toBe('Abbey Road');
    });

    it('should filter albums by artist name', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Abbey Road',
          artists: [{ name: 'The Beatles', spotifyId: 'beatles-1' }],
        }),
        backlogAlbum({
          id: '2',
          name: 'Dark Side of the Moon',
          artists: [{ name: 'Pink Floyd', spotifyId: 'floyd-1' }],
        }),
        backlogAlbum({
          id: '3',
          name: 'Revolver',
          artists: [{ name: 'The Beatles', spotifyId: 'beatles-1' }],
        }),
      ]);

      const { searchTerm, filteredAlbums } = useBacklogFilters(albums);

      searchTerm.value = 'beatles';
      expect(filteredAlbums.value).toHaveLength(2);
      expect(filteredAlbums.value[0]?.name).toBe('Abbey Road');
      expect(filteredAlbums.value[1]?.name).toBe('Revolver');
    });

    it('should be case-insensitive', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({ id: '1', name: 'Abbey Road' }),
      ]);

      const { searchTerm, filteredAlbums } = useBacklogFilters(albums);

      searchTerm.value = 'ABBEY';
      expect(filteredAlbums.value).toHaveLength(1);

      searchTerm.value = 'abbey';
      expect(filteredAlbums.value).toHaveLength(1);

      searchTerm.value = 'AbBeY';
      expect(filteredAlbums.value).toHaveLength(1);
    });

    it('should return all albums when search is empty', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({ id: '1', name: 'Album 1' }),
        backlogAlbum({ id: '2', name: 'Album 2' }),
        backlogAlbum({ id: '3', name: 'Album 3' }),
      ]);

      const { searchTerm, filteredAlbums } = useBacklogFilters(albums);

      searchTerm.value = '';
      expect(filteredAlbums.value).toHaveLength(3);
    });

    it('should search across multiple artists', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Collaboration Album',
          artists: [
            { name: 'Artist One', spotifyId: 'artist-1' },
            { name: 'Artist Two', spotifyId: 'artist-2' },
          ],
        }),
      ]);

      const { searchTerm, filteredAlbums } = useBacklogFilters(albums);

      searchTerm.value = 'artist two';
      expect(filteredAlbums.value).toHaveLength(1);
    });
  });

  describe('sorting', () => {
    it('should sort by album name ascending', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({ id: '1', name: 'Zebra' }),
        backlogAlbum({ id: '2', name: 'Apple' }),
        backlogAlbum({ id: '3', name: 'Mango' }),
      ]);

      const { sortBy, filteredAlbums } = useBacklogFilters(albums);

      sortBy.value = 'name-asc';
      expect(filteredAlbums.value.map((a) => a.name)).toEqual([
        'Apple',
        'Mango',
        'Zebra',
      ]);
    });

    it('should sort by album name descending', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({ id: '1', name: 'Apple' }),
        backlogAlbum({ id: '2', name: 'Zebra' }),
        backlogAlbum({ id: '3', name: 'Mango' }),
      ]);

      const { sortBy, filteredAlbums } = useBacklogFilters(albums);

      sortBy.value = 'name-desc';
      expect(filteredAlbums.value.map((a) => a.name)).toEqual([
        'Zebra',
        'Mango',
        'Apple',
      ]);
    });

    it('should sort by artist name ascending', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Album 1',
          artists: [{ name: 'Zebra Band', spotifyId: 'z-1' }],
        }),
        backlogAlbum({
          id: '2',
          name: 'Album 2',
          artists: [{ name: 'Apple Band', spotifyId: 'a-1' }],
        }),
        backlogAlbum({
          id: '3',
          name: 'Album 3',
          artists: [{ name: 'Mango Band', spotifyId: 'm-1' }],
        }),
      ]);

      const { sortBy, filteredAlbums } = useBacklogFilters(albums);

      sortBy.value = 'artist-asc';
      expect(filteredAlbums.value.map((a) => a.artists[0]?.name)).toEqual([
        'Apple Band',
        'Mango Band',
        'Zebra Band',
      ]);
    });

    it('should sort by artist name descending', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Album 1',
          artists: [{ name: 'Apple Band', spotifyId: 'a-1' }],
        }),
        backlogAlbum({
          id: '2',
          name: 'Album 2',
          artists: [{ name: 'Zebra Band', spotifyId: 'z-1' }],
        }),
        backlogAlbum({
          id: '3',
          name: 'Album 3',
          artists: [{ name: 'Mango Band', spotifyId: 'm-1' }],
        }),
      ]);

      const { sortBy, filteredAlbums } = useBacklogFilters(albums);

      sortBy.value = 'artist-desc';
      expect(filteredAlbums.value.map((a) => a.artists[0]?.name)).toEqual([
        'Zebra Band',
        'Mango Band',
        'Apple Band',
      ]);
    });

    it('should sort by date added ascending (oldest first)', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          addedAt: new Date('2026-01-15').toISOString(),
        }),
        backlogAlbum({
          id: '2',
          addedAt: new Date('2026-01-10').toISOString(),
        }),
        backlogAlbum({
          id: '3',
          addedAt: new Date('2026-01-20').toISOString(),
        }),
      ]);

      const { sortBy, filteredAlbums } = useBacklogFilters(albums);

      sortBy.value = 'date-added-asc';
      expect(filteredAlbums.value.map((a) => a.id)).toEqual(['2', '1', '3']);
    });

    it('should sort by date added descending (newest first)', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          addedAt: new Date('2026-01-10').toISOString(),
        }),
        backlogAlbum({
          id: '2',
          addedAt: new Date('2026-01-15').toISOString(),
        }),
        backlogAlbum({
          id: '3',
          addedAt: new Date('2026-01-20').toISOString(),
        }),
      ]);

      const { sortBy, filteredAlbums } = useBacklogFilters(albums);

      sortBy.value = 'date-added-desc';
      expect(filteredAlbums.value.map((a) => a.id)).toEqual(['3', '2', '1']);
    });

    it('should apply sorting after search filtering', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Zebra Album',
          artists: [{ name: 'Artist', spotifyId: 'a-1' }],
        }),
        backlogAlbum({
          id: '2',
          name: 'Apple Album',
          artists: [{ name: 'Artist', spotifyId: 'a-1' }],
        }),
        backlogAlbum({
          id: '3',
          name: 'Mango Album',
          artists: [{ name: 'Other', spotifyId: 'o-1' }],
        }),
      ]);

      const { searchTerm, sortBy, filteredAlbums } = useBacklogFilters(albums);

      searchTerm.value = 'artist';
      sortBy.value = 'name-asc';

      expect(filteredAlbums.value).toHaveLength(2);
      expect(filteredAlbums.value.map((a) => a.name)).toEqual([
        'Apple Album',
        'Zebra Album',
      ]);
    });
  });

  describe('grouping by artist', () => {
    it('should group albums by primary artist', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Abbey Road',
          artists: [{ name: 'The Beatles', spotifyId: 'beatles-1' }],
        }),
        backlogAlbum({
          id: '2',
          name: 'Revolver',
          artists: [{ name: 'The Beatles', spotifyId: 'beatles-1' }],
        }),
        backlogAlbum({
          id: '3',
          name: 'Dark Side of the Moon',
          artists: [{ name: 'Pink Floyd', spotifyId: 'floyd-1' }],
        }),
      ]);

      const { groupedByArtist } = useBacklogFilters(albums);

      expect(groupedByArtist.value.size).toBe(2);

      const beatlesGroup = Array.from(groupedByArtist.value.values()).find(
        (g) => g.artist.name === 'The Beatles',
      );
      expect(beatlesGroup?.albums).toHaveLength(2);

      const floydGroup = Array.from(groupedByArtist.value.values()).find(
        (g) => g.artist.name === 'Pink Floyd',
      );
      expect(floydGroup?.albums).toHaveLength(1);
    });

    it('should use spotifyId and name as group key', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Album 1',
          artists: [{ name: 'Artist', spotifyId: 'id-1' }],
        }),
        backlogAlbum({
          id: '2',
          name: 'Album 2',
          artists: [{ name: 'Artist', spotifyId: 'id-2' }],
        }),
      ]);

      const { groupedByArtist } = useBacklogFilters(albums);

      // Same artist name but different IDs should create separate groups
      expect(groupedByArtist.value.size).toBe(2);
    });

    it('should sort groups by artist name ascending', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Album 1',
          artists: [{ name: 'Zebra', spotifyId: 'z-1' }],
        }),
        backlogAlbum({
          id: '2',
          name: 'Album 2',
          artists: [{ name: 'Apple', spotifyId: 'a-1' }],
        }),
        backlogAlbum({
          id: '3',
          name: 'Album 3',
          artists: [{ name: 'Mango', spotifyId: 'm-1' }],
        }),
      ]);

      const { sortBy, groupedByArtist } = useBacklogFilters(albums);

      sortBy.value = 'artist-asc';

      const artistNames = Array.from(groupedByArtist.value.values()).map(
        (g) => g.artist.name,
      );
      expect(artistNames).toEqual(['Apple', 'Mango', 'Zebra']);
    });

    it('should sort groups by artist name descending', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Album 1',
          artists: [{ name: 'Apple', spotifyId: 'a-1' }],
        }),
        backlogAlbum({
          id: '2',
          name: 'Album 2',
          artists: [{ name: 'Zebra', spotifyId: 'z-1' }],
        }),
        backlogAlbum({
          id: '3',
          name: 'Album 3',
          artists: [{ name: 'Mango', spotifyId: 'm-1' }],
        }),
      ]);

      const { sortBy, groupedByArtist } = useBacklogFilters(albums);

      sortBy.value = 'artist-desc';

      const artistNames = Array.from(groupedByArtist.value.values()).map(
        (g) => g.artist.name,
      );
      expect(artistNames).toEqual(['Zebra', 'Mango', 'Apple']);
    });

    it('should sort groups by newest album in group', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Album 1',
          artists: [{ name: 'Artist A', spotifyId: 'a-1' }],
          addedAt: new Date('2026-01-10').toISOString(),
        }),
        backlogAlbum({
          id: '2',
          name: 'Album 2',
          artists: [{ name: 'Artist A', spotifyId: 'a-1' }],
          addedAt: new Date('2026-01-20').toISOString(),
        }),
        backlogAlbum({
          id: '3',
          name: 'Album 3',
          artists: [{ name: 'Artist B', spotifyId: 'b-1' }],
          addedAt: new Date('2026-01-15').toISOString(),
        }),
      ]);

      const { sortBy, groupedByArtist } = useBacklogFilters(albums);

      sortBy.value = 'date-added-desc';

      const artistNames = Array.from(groupedByArtist.value.values()).map(
        (g) => g.artist.name,
      );
      // Artist A has newest album (Jan 20), so should come first
      expect(artistNames).toEqual(['Artist A', 'Artist B']);
    });

    it('should sort groups by oldest album in group', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Album 1',
          artists: [{ name: 'Artist A', spotifyId: 'a-1' }],
          addedAt: new Date('2026-01-10').toISOString(),
        }),
        backlogAlbum({
          id: '2',
          name: 'Album 2',
          artists: [{ name: 'Artist A', spotifyId: 'a-1' }],
          addedAt: new Date('2026-01-20').toISOString(),
        }),
        backlogAlbum({
          id: '3',
          name: 'Album 3',
          artists: [{ name: 'Artist B', spotifyId: 'b-1' }],
          addedAt: new Date('2026-01-05').toISOString(),
        }),
      ]);

      const { sortBy, groupedByArtist } = useBacklogFilters(albums);

      sortBy.value = 'date-added-asc';

      const artistNames = Array.from(groupedByArtist.value.values()).map(
        (g) => g.artist.name,
      );
      // Artist B has oldest album (Jan 5), so should come first
      expect(artistNames).toEqual(['Artist B', 'Artist A']);
    });

    it('should apply search filter before grouping', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Abbey Road',
          artists: [{ name: 'The Beatles', spotifyId: 'beatles-1' }],
        }),
        backlogAlbum({
          id: '2',
          name: 'Revolver',
          artists: [{ name: 'The Beatles', spotifyId: 'beatles-1' }],
        }),
        backlogAlbum({
          id: '3',
          name: 'Dark Side',
          artists: [{ name: 'Pink Floyd', spotifyId: 'floyd-1' }],
        }),
      ]);

      const { searchTerm, groupedByArtist } = useBacklogFilters(albums);

      searchTerm.value = 'beatles';

      expect(groupedByArtist.value.size).toBe(1);
      const beatlesGroup = Array.from(groupedByArtist.value.values())[0];
      expect(beatlesGroup?.albums).toHaveLength(2);
    });
  });

  describe('view mode switching', () => {
    it('should switch from name sort to artist sort when entering artist view', async () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({ id: '1', name: 'Album 1' }),
      ]);

      const { sortBy, viewMode } = useBacklogFilters(albums);

      sortBy.value = 'name-asc';
      expect(sortBy.value).toBe('name-asc');

      viewMode.value = 'artists';
      await nextTick();

      expect(sortBy.value).toBe('artist-asc');
    });

    it('should not change sort if already on a valid artist view sort', async () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({ id: '1', name: 'Album 1' }),
      ]);

      const { sortBy, viewMode } = useBacklogFilters(albums);

      sortBy.value = 'date-added-desc';
      expect(sortBy.value).toBe('date-added-desc');

      viewMode.value = 'artists';
      await nextTick();

      // date-added-desc is valid in artist view, should not change
      expect(sortBy.value).toBe('date-added-desc');
    });

    it('should allow manual sort changes in artist view', async () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({ id: '1', name: 'Album 1' }),
      ]);

      const { sortBy, viewMode } = useBacklogFilters(albums);

      viewMode.value = 'artists';
      await nextTick();

      sortBy.value = 'artist-desc';
      expect(sortBy.value).toBe('artist-desc');

      sortBy.value = 'date-added-asc';
      expect(sortBy.value).toBe('date-added-asc');
    });
  });

  describe('edge cases', () => {
    it('should handle empty album list', () => {
      const albums = ref<BacklogAlbum[]>([]);

      const { filteredAlbums, groupedByArtist } = useBacklogFilters(albums);

      expect(filteredAlbums.value).toHaveLength(0);
      expect(groupedByArtist.value.size).toBe(0);
    });

    it('should handle albums with no artists', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({ id: '1', name: 'Album 1', artists: [] }),
      ]);

      const { groupedByArtist } = useBacklogFilters(albums);

      // Albums with no artists should not appear in grouped view
      expect(groupedByArtist.value.size).toBe(0);
    });

    it('should handle albums with multiple artists (uses first)', () => {
      const albums = ref<BacklogAlbum[]>([
        backlogAlbum({
          id: '1',
          name: 'Collaboration',
          artists: [
            { name: 'Artist A', spotifyId: 'a-1' },
            { name: 'Artist B', spotifyId: 'b-1' },
          ],
        }),
      ]);

      const { groupedByArtist } = useBacklogFilters(albums);

      expect(groupedByArtist.value.size).toBe(1);
      const group = Array.from(groupedByArtist.value.values())[0];
      expect(group?.artist.name).toBe('Artist A');
    });
  });
});
