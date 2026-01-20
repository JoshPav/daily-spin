import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
// @ts-expect-error - Vue files are handled by Nuxt test environment at runtime
import App from '~~/app/app.vue';

// Re-export Testing Library utilities
// screen queries the entire document, so it works with mountSuspended
export { fireEvent, screen } from '@testing-library/vue';

/**
 * Global wrapper reference for automatic cleanup.
 * Set by mountPage() and cleaned up by cleanupAfterTest().
 */
export let wrapper: VueWrapper | null = null;

/**
 * Mounts the app at the specified route and waits for initial render.
 * Use `screen` from Testing Library or `wrapper` from Vue Test Utils to query.
 *
 * @param route - The route path to mount (e.g., '/dashboard', '/backlog')
 *
 * @example
 * import { mountPage, screen } from '~~/tests/component';
 *
 * beforeEach(async () => {
 *   await mountPage('/dashboard');
 * });
 *
 * it('shows the title', () => {
 *   // Testing Library style
 *   expect(screen.getByText('Dashboard')).toBeDefined();
 *   // Or Vue Test Utils style
 *   expect(wrapper!.text()).toContain('Dashboard');
 * });
 */
export const mountPage = async (route: string): Promise<VueWrapper> => {
  wrapper = await mountSuspended(App, {
    route,
    attachTo: document.body,
  });
  await flushPromises();
  await nextTick();
  return wrapper;
};

/**
 * Cleans up all open modals from the DOM.
 * Call this in afterEach or when modals need to be cleared.
 */
export const cleanupModals = (): void => {
  for (const el of document.querySelectorAll('[role="dialog"]')) {
    el.remove();
  }
};

/**
 * Cleans up after a test - unmounts wrapper and removes modals.
 * Call this in afterEach.
 *
 * @example
 * afterEach(() => {
 *   cleanupAfterTest();
 * });
 */
export const cleanupAfterTest = (): void => {
  cleanupModals();
  wrapper?.unmount();
  wrapper = null;
};
