/**
 * Component tests for the backlog page - basic functionality.
 * Tests page header, empty state, and common elements.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupAfterTest, screen, waitFor } from '~~/tests/component';
import {
  mountBacklog,
  resetMockState,
  setMockBacklogData,
} from './setup';

describe('Backlog Page', () => {
  const TODAY = new Date('2026-01-15T12:00:00.000Z');

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    resetMockState();
    clearNuxtData('backlog');
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupAfterTest();
  });

  describe('page header', () => {
    it('should render the page title', async () => {
      await mountBacklog();

      expect(screen.getByRole('heading', { name: 'Backlog' })).toBeDefined();
    });

    it('should render the Add Album button that links to /backlog/add', async () => {
      await mountBacklog();

      const addButton = screen.getByRole('link', { name: /Add Album/i });
      expect(addButton).toBeDefined();
      expect(addButton.getAttribute('href')).toBe('/backlog/add');
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      setMockBacklogData({ albums: [] });
    });

    it('should render empty state when backlog has no albums', async () => {
      await mountBacklog();

      await waitFor(
        () => screen.queryByText('Your backlog is empty') !== null,
      );

      expect(screen.getByText('Your backlog is empty')).toBeDefined();
      expect(
        screen.getByText('Add albums you want to listen to later'),
      ).toBeDefined();
    });

    it('should render Add Your First Album button in empty state', async () => {
      await mountBacklog();

      await waitFor(
        () => screen.queryByText('Add Your First Album') !== null,
      );

      const addFirstButton = screen.getByRole('link', {
        name: /Add Your First Album/i,
      });
      expect(addFirstButton).toBeDefined();
      expect(addFirstButton.getAttribute('href')).toBe('/backlog/add');
    });

    it('should not render filters in empty state', async () => {
      await mountBacklog();

      await waitFor(
        () => screen.queryByText('Your backlog is empty') !== null,
      );

      const searchInput = screen.queryByPlaceholderText(
        /Search albums or artists/i,
      );
      expect(searchInput).toBeNull();
    });
  });
});
