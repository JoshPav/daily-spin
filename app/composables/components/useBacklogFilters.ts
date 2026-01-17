import type { ComputedRef, Ref } from 'vue';
import { computed, ref, watch } from 'vue';
import type { Artist, BacklogAlbum } from '#shared/schema';

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'artist-asc'
  | 'artist-desc'
  | 'date-added-asc'
  | 'date-added-desc';
export type ViewMode = 'albums' | 'artists';

type GroupedAlbums = Map<string, { artist: Artist; albums: BacklogAlbum[] }>;

export interface BacklogFilters {
  searchTerm: Ref<string>;
  sortBy: Ref<SortOption>;
  viewMode: Ref<ViewMode>;
  filteredAlbums: ComputedRef<BacklogAlbum[]>;
  groupedByArtist: ComputedRef<GroupedAlbums>;
}

export function useBacklogFilters(albums: Ref<BacklogAlbum[]>): BacklogFilters {
  const searchTerm = ref('');
  const sortBy = ref<SortOption>('date-added-desc');
  const viewMode = ref<ViewMode>('albums');

  // When switching to artist view, ensure sort option is valid
  watch(viewMode, (newMode) => {
    if (newMode === 'artists') {
      // Album name sorting doesn't make sense in artist view
      if (sortBy.value === 'name-asc' || sortBy.value === 'name-desc') {
        sortBy.value = 'artist-asc';
      }
    }
  });

  // Filter albums by search term
  const searchedAlbums = computed(() => {
    if (!searchTerm.value) return albums.value;

    const term = searchTerm.value.toLowerCase();
    return albums.value.filter((album) => {
      const albumName = album.name.toLowerCase();
      const artistNames = album.artists
        .map((a) => a.name.toLowerCase())
        .join(' ');
      return albumName.includes(term) || artistNames.includes(term);
    });
  });

  // Sort albums
  const filteredAlbums = computed(() => {
    const sorted = [...searchedAlbums.value];

    switch (sortBy.value) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'artist-asc':
        return sorted.sort((a, b) => {
          const artistA = a.artists[0]?.name || '';
          const artistB = b.artists[0]?.name || '';
          return artistA.localeCompare(artistB);
        });
      case 'artist-desc':
        return sorted.sort((a, b) => {
          const artistA = a.artists[0]?.name || '';
          const artistB = b.artists[0]?.name || '';
          return artistB.localeCompare(artistA);
        });
      case 'date-added-asc':
        return sorted.sort((a, b) => {
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        });
      case 'date-added-desc':
        return sorted.sort((a, b) => {
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        });
      default:
        return sorted;
    }
  });

  // Group albums by artist
  const groupedByArtist = computed((): GroupedAlbums => {
    const groups: GroupedAlbums = new Map();

    for (const album of searchedAlbums.value) {
      const primaryArtist = album.artists[0];
      if (!primaryArtist) continue;

      const key = `${primaryArtist.spotifyId}|${primaryArtist.name}`;
      if (!groups.has(key)) {
        groups.set(key, { albums: [], artist: primaryArtist });
      }
      groups.get(key)?.albums.push(album);
    }

    // Sort groups based on current sort option
    const sortedGroups = Array.from(groups.entries()).sort(
      ([keyA, groupA], [keyB, groupB]) => {
        switch (sortBy.value) {
          case 'artist-asc': {
            const nameA = keyA.split('|')[1];
            const nameB = keyB.split('|')[1];
            if (!nameA || !nameB) return 0;
            return nameA.localeCompare(nameB);
          }
          case 'artist-desc': {
            const nameA = keyA.split('|')[1];
            const nameB = keyB.split('|')[1];
            if (!nameA || !nameB) return 0;
            return nameB.localeCompare(nameA);
          }
          case 'date-added-asc': {
            // Sort by oldest album in each group
            if (groupA.albums.length === 0 || groupB.albums.length === 0)
              return 0;
            const firstAlbumA = groupA.albums[0];
            const firstAlbumB = groupB.albums[0];
            if (!firstAlbumA || !firstAlbumB) return 0;

            const oldestA = groupA.albums.reduce((oldest, album) => {
              return new Date(album.addedAt) < new Date(oldest.addedAt)
                ? album
                : oldest;
            }, firstAlbumA);
            const oldestB = groupB.albums.reduce((oldest, album) => {
              return new Date(album.addedAt) < new Date(oldest.addedAt)
                ? album
                : oldest;
            }, firstAlbumB);
            return (
              new Date(oldestA.addedAt).getTime() -
              new Date(oldestB.addedAt).getTime()
            );
          }
          case 'date-added-desc': {
            // Sort by newest album in each group
            if (groupA.albums.length === 0 || groupB.albums.length === 0)
              return 0;
            const firstAlbumA = groupA.albums[0];
            const firstAlbumB = groupB.albums[0];
            if (!firstAlbumA || !firstAlbumB) return 0;

            const newestA = groupA.albums.reduce((newest, album) => {
              return new Date(album.addedAt) > new Date(newest.addedAt)
                ? album
                : newest;
            }, firstAlbumA);
            const newestB = groupB.albums.reduce((newest, album) => {
              return new Date(album.addedAt) > new Date(newest.addedAt)
                ? album
                : newest;
            }, firstAlbumB);
            return (
              new Date(newestB.addedAt).getTime() -
              new Date(newestA.addedAt).getTime()
            );
          }
          default:
            return 0;
        }
      },
    );

    return new Map(sortedGroups);
  });

  return {
    searchTerm,
    sortBy,
    viewMode,
    filteredAlbums,
    groupedByArtist,
  };
}
