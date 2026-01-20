/** biome-ignore-all lint/style/noNonNullAssertion: ignore potential nulls for test code */
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computed, ref } from 'vue';
import {
  cleanupAfterTest,
  fireEvent,
  mockUser,
  mountPage,
  screen,
  waitFor,
  waitForElement,
} from '~~/tests/component';

// Mock API endpoints
registerEndpoint('/api/backlog', () => ({
  albums: [],
}));

// Module-level state to control auth mock behavior
let isLoggedIn = true;

// Mock useAuth at module level (required due to hoisting)
mockNuxtImport('useAuth', () => {
  return () => ({
    loggedIn: computed(() => isLoggedIn),
    user: computed(() => (isLoggedIn ? mockUser : null)),
    loading: ref(false),
    requiresReauth: computed(() => false),
  });
});

describe('Header Navigation', () => {
  afterEach(() => {
    cleanupAfterTest();
  });

  describe('when the user is logged in', () => {
    beforeEach(async () => {
      isLoggedIn = true;
      await mountPage('/dashboard');
    });

    it('should not render the login with spotify button', () => {
      const allButtons = screen.getAllByRole('button');
      const loginButton = allButtons.find((btn) =>
        btn.textContent?.includes('Login'),
      );

      expect(loginButton).toBeUndefined();
    });

    describe('navigation links', () => {
      it('should display Dashboard and Backlog links in the header', () => {
        const allLinks = screen.getAllByRole('link');
        const dashboardLink = allLinks.find(
          (link) => link.textContent === 'Dashboard',
        );
        const backlogLink = allLinks.find(
          (link) => link.textContent === 'Backlog',
        );

        expect(dashboardLink).toBeDefined();
        expect(backlogLink).toBeDefined();
      });

      it('should show Dashboard as active when on dashboard route', () => {
        // Then - Dashboard link should have aria-current="page"
        const allLinks = screen.getAllByRole('link');
        const dashboardLink = allLinks.find(
          (link) => link.textContent === 'Dashboard',
        );

        expect(dashboardLink?.getAttribute('aria-current')).toBe('page');
      });

      it('should show Backlog as active when on backlog route', async () => {
        // Given - navigate to backlog
        await mountPage('/backlog');

        // Then - Backlog link should have aria-current="page"
        const allLinks = screen.getAllByRole('link');
        const backlogLink = allLinks.find(
          (link) => link.textContent === 'Backlog',
        );

        expect(backlogLink?.getAttribute('aria-current')).toBe('page');
      });
    });

    describe('navigation behavior', () => {
      it('should navigate to Backlog when Backlog link is clicked', async () => {
        // When - click Backlog link
        const allLinks = screen.getAllByRole('link');
        const backlogLink = allLinks.find(
          (link) => link.textContent === 'Backlog',
        );

        expect(backlogLink).toBeDefined();
        await fireEvent.click(backlogLink!);

        // Then - should navigate to backlog
        await waitFor(() => window.location.pathname === '/backlog');
        expect(window.location.pathname).toBe('/backlog');
      });

      it('should navigate to Dashboard when Dashboard link is clicked', async () => {
        // Given - start on backlog
        await mountPage('/backlog');

        // When - click Dashboard link
        const allLinks = screen.getAllByRole('link');
        const dashboardLink = allLinks.find(
          (link) => link.textContent === 'Dashboard',
        );

        expect(dashboardLink).toBeDefined();
        await fireEvent.click(dashboardLink!);

        // Then - should navigate to dashboard
        await waitFor(() => window.location.pathname === '/dashboard');
        expect(window.location.pathname).toBe('/dashboard');
      });
    });

    describe('mobile navigation menu', () => {
      /**
       * Helper to find and click the mobile menu toggle button.
       * Returns the opened dialog element.
       */
      const openMobileMenu = async (): Promise<Element> => {
        const allButtons = screen.getAllByRole('button');
        const toggleButton = allButtons.find(
          (btn) => btn.textContent?.trim() === '',
        );

        await fireEvent.click(toggleButton!);

        return waitForElement('[role="dialog"]');
      };

      it('should open the navigation menu when toggle button is clicked', async () => {
        // When - click the toggle button
        const dialog = await openMobileMenu();

        // Then - dialog should be visible
        expect(dialog).toBeTruthy();
        expect(dialog.getAttribute('role')).toBe('dialog');
      });

      it('should display user information in the menu', async () => {
        // When - open the menu
        const dialog = await openMobileMenu();

        // Then - should show user name
        expect(dialog.textContent).toContain(mockUser.name);

        // And - should show user avatar
        const avatar = dialog.querySelector(`img[src="${mockUser.image}"]`);
        expect(avatar).toBeTruthy();
      });

      it('should display all navigation items in the menu', async () => {
        // When - open the menu
        const dialog = await openMobileMenu();

        // Then - should show all navigation items
        expect(dialog.textContent).toContain('Dashboard');
        expect(dialog.textContent).toContain('Backlog');
        expect(dialog.textContent).toContain('Bulk import');
        expect(dialog.textContent).toContain('Preferences');
        expect(dialog.textContent).toContain('Sign out');
      });

      it('should show Bulk import as disabled', async () => {
        // When - open the menu
        const dialog = await openMobileMenu();

        // Then - Bulk import should be disabled
        // Find the element containing "Bulk import" text
        const menuItems = Array.from(dialog.querySelectorAll('button, a'));
        const bulkImportItem = menuItems.find((item) =>
          item.textContent?.includes('Bulk import'),
        );

        expect(bulkImportItem).toBeDefined();

        expect((bulkImportItem as HTMLButtonElement).disabled).toBe(true);
      });

      it('should navigate to Preferences when clicked in mobile menu', async () => {
        // When - open menu and click Preferences
        const dialog = await openMobileMenu();

        const preferencesLink = Array.from(
          dialog.querySelectorAll('a, button'),
        ).find((item) => item.textContent?.includes('Preferences'));

        expect(preferencesLink).toBeDefined();
        await fireEvent.click(preferencesLink as HTMLElement);

        // Then - should navigate to preferences
        await waitFor(() => window.location.pathname === '/preferences');
        expect(window.location.pathname).toBe('/preferences');
      });

      it('should show active state for current route in mobile menu', async () => {
        // When - open menu on dashboard
        const dialog = await openMobileMenu();

        // Then - Dashboard should be highlighted/active
        const menuLinks = Array.from(dialog.querySelectorAll('a'));
        const dashboardLink = menuLinks.find((link) =>
          link.textContent?.includes('Dashboard'),
        ) as HTMLElement;

        expect(dashboardLink).toBeDefined();
        // Check for active indicator (aria-current or active class)
        const isActive =
          dashboardLink.getAttribute('aria-current') === 'page' ||
          dashboardLink.className.includes('active');
        expect(isActive).toBe(true);
      });
    });

    describe('branding', () => {
      it('should display DailySpin title that links to dashboard', () => {
        const allLinks = screen.getAllByRole('link');
        const titleLink = allLinks.find((link) =>
          link.textContent?.includes('DailySpin'),
        );

        expect(titleLink).toBeDefined();
        const href = titleLink?.getAttribute('href');
        expect(href).toEqual('/dashboard');
      });
    });
  });

  describe('when the user is not logged in', () => {
    beforeEach(async () => {
      isLoggedIn = false;
      await mountPage('/dashboard');
    });

    it('should render the DailySpin title linking to "/"', () => {
      const allLinks = screen.getAllByRole('link');
      const titleLink = allLinks.find((link) =>
        link.textContent?.includes('DailySpin'),
      );

      expect(titleLink).toBeDefined();
      const href = titleLink?.getAttribute('href');
      expect(href).toEqual('/');
    });

    it('should not render the menu toggle', () => {
      const allButtons = screen.queryAllByRole('button');
      const toggleButton = allButtons.find(
        (btn) => btn.getAttribute('aria-label') === 'Open menu',
      );

      // The toggle button exists but should be hidden when not logged in
      expect(toggleButton?.classList.contains('hidden')).toBe(true);
    });

    it('should render the login with spotify button', () => {
      const allButtons = screen.getAllByRole('button');
      const loginButton = allButtons.find((btn) =>
        btn.textContent?.includes('Login'),
      );

      expect(loginButton).toBeDefined();
    });
  });
});
