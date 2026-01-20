import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
// @ts-expect-error - Vue files are handled by Nuxt test environment at runtime
import App from '~~/app/app.vue';

/**
 * Global wrapper reference for automatic cleanup.
 * Set by mountPage() and cleaned up by cleanupAfterTest().
 */
export let wrapper: VueWrapper | null = null;

/**
 * Mounts the app at the specified route and waits for initial render.
 * Sets the global wrapper for automatic cleanup.
 *
 * @param route - The route path to mount (e.g., '/dashboard', '/backlog')
 * @returns The mounted wrapper
 *
 * @example
 * beforeEach(async () => {
 *   await mountPage('/dashboard');
 * });
 */
export const mountPage = async (route: string): Promise<VueWrapper> => {
  wrapper = await mountSuspended(App, { route });
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
