/**
 * Shared test setup for backlog page component tests.
 *
 * IMPORTANT: This file must be imported in each test file to set up the mocks.
 * The mocks are registered at module level when this file is imported.
 */
import { registerEndpoint } from '@nuxt/test-utils/runtime';
import type { GetBacklogResponse, ScheduledListenItem } from '~~/shared/schema';
import { fireEvent, mountPage, screen, waitFor } from '~~/tests/component';
import { mockUseAuth } from '~~/tests/component/authMock';

// Shared mock state that tests can modify
export let mockBacklogData: GetBacklogResponse = { albums: [] };
export let mockScheduledListensData: Record<
  string,
  ScheduledListenItem | null
> = {};
export let deletedBacklogIds: string[] = [];

export const setMockBacklogData = (data: GetBacklogResponse) => {
  mockBacklogData = data;
};

export const setMockScheduledListensData = (
  data: Record<string, ScheduledListenItem | null>,
) => {
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
mockUseAuth();

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
 */
export const switchToAlbumsView = async () => {
  const viewModeButton = screen.getByTestId('view-mode-dropdown');

  await fireEvent.click(viewModeButton);

  // Wait for dropdown menu to appear
  await waitFor(() => screen.queryAllByRole('menuitem').length > 0, {
    timeout: 3000,
  });

  // Find and click the Albums option
  const menuItems = screen.getAllByRole('menuitem');
  const albumsOption = menuItems.find((item) =>
    item.textContent?.includes('Albums'),
  );

  if (albumsOption) {
    await fireEvent.click(albumsOption);
    // Wait for menu to close
    await waitFor(() => screen.queryAllByRole('menuitem').length === 0, {
      timeout: 2000,
    });
  }
};
