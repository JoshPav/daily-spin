/**
 * Shared test setup for backlog page component tests.
 *
 * IMPORTANT: This file must be imported in each test file to set up the mocks.
 * The mocks are registered at module level when this file is imported.
 */
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import { computed, ref } from 'vue';
import type {
  GetBacklogResponse,
  ScheduledListenItem,
} from '~~/shared/schema';
import { fireEvent, mountPage, waitFor } from '~~/tests/component';

// Shared mock state that tests can modify
export let mockBacklogData: GetBacklogResponse = { albums: [] };
export let mockScheduledListensData: Record<string, ScheduledListenItem | null> = {};
export let deletedBacklogIds: string[] = [];

export const setMockBacklogData = (data: GetBacklogResponse) => {
  mockBacklogData = data;
};

export const setMockScheduledListensData = (data: Record<string, ScheduledListenItem | null>) => {
  mockScheduledListensData = data;
};

export const resetMockState = () => {
  mockBacklogData = { albums: [] };
  mockScheduledListensData = {};
  deletedBacklogIds = [];
};

export const addDeletedBacklogId = (id: string) => {
  deletedBacklogIds.push(id);
};

// Mock useAuth to bypass auth loading (must be at module level)
mockNuxtImport('useAuth', () => {
  return () => ({
    loggedIn: computed(() => true),
    user: computed(() => ({
      id: 'test-user-id',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
      initial: 'T',
    })),
    loading: ref(false),
    requiresReauth: computed(() => false),
  });
});

// Register endpoint mock for /api/backlog (GET)
registerEndpoint('/api/backlog', () => mockBacklogData);

// Register endpoint mock for /api/listens/scheduled (GET)
registerEndpoint('/api/listens/scheduled', () => ({
  items: mockScheduledListensData,
  pagination: {
    startDate: '2026-01-15',
    endDate: '2026-02-14',
    total: Object.values(mockScheduledListensData).filter((v) => v !== null)
      .length,
    hasMore: false,
  },
}));

/**
 * Mount the backlog page
 */
export const mountBacklog = () => mountPage('/backlog');

/**
 * Helper to switch to Albums view mode.
 * The view mode dropdown is icon-only - look for the button that opens the dropdown.
 */
export const switchToAlbumsView = async () => {
  // The view mode button is one of the outline buttons in the header
  // It's NOT the "Add Album" link and NOT a trash button
  const allButtons = document.querySelectorAll('button');
  const candidates = Array.from(allButtons).filter((btn) => {
    const isInHeader = btn.closest('main')?.querySelector('h1');
    const isTrash = btn.querySelector('[class*="trash"]');
    const isAddAlbum = btn.textContent?.includes('Add');
    return isInHeader && !isTrash && !isAddAlbum;
  });

  // Find the button that's likely the view mode dropdown (outline style, has icon)
  const viewModeButton =
    candidates.find(
      (btn) =>
        btn.classList.contains('btn-outline') ||
        btn.getAttribute('class')?.includes('outline'),
    ) || candidates[0];

  if (viewModeButton) {
    await fireEvent.click(viewModeButton);

    // Wait for dropdown menu to appear
    await waitFor(
      () => document.querySelector('[role="menuitem"]') !== null,
      { timeout: 3000 },
    );

    // Find and click the Albums option
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    const albumsOption = Array.from(menuItems).find((item) =>
      item.textContent?.includes('Albums'),
    );

    if (albumsOption) {
      await fireEvent.click(albumsOption);
      // Wait for menu to close
      await waitFor(
        () => document.querySelector('[role="menuitem"]') === null,
        { timeout: 2000 },
      );
    }
  }
};
