/** biome-ignore-all lint/style/noNonNullAssertion: tests are fine to fail for type errors */
import { flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

export interface WaitOptions {
  timeout?: number;
  interval?: number;
}

/**
 * Polls for a condition to be true, similar to Playwright's waitFor.
 * Automatically flushes promises and Vue updates between checks.
 *
 * @param condition - Function that returns true when the condition is met
 * @param options - timeout (default 2000ms), interval (default 50ms)
 * @throws Error if condition is not met within timeout
 *
 * @example
 * // Wait for a button to appear
 * await waitFor(() => document.querySelector('button') !== null);
 *
 * // Wait with custom timeout
 * await waitFor(() => items.length > 0, { timeout: 5000 });
 */
export const waitFor = async (
  condition: () => boolean,
  { timeout = 2000, interval = 50 }: WaitOptions = {},
): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    await flushPromises();
    await nextTick();
    if (condition()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitFor timed out after ${timeout}ms`);
};

/**
 * Waits for an element matching the selector to appear in the DOM.
 *
 * @param selector - CSS selector to query
 * @param options - timeout (default 2000ms)
 * @returns The found element
 * @throws Error if element is not found within timeout
 *
 * @example
 * const modal = await waitForElement('[role="dialog"]');
 * const button = await waitForElement('button.submit', { timeout: 5000 });
 */
export const waitForElement = async (
  selector: string,
  options?: WaitOptions,
): Promise<Element> => {
  await waitFor(() => document.querySelector(selector) !== null, options);
  return document.querySelector(selector)!;
};

/**
 * Waits for text to appear within an element.
 *
 * @param element - The element to check for text content
 * @param text - The text to search for (uses includes)
 * @param options - timeout (default 2000ms)
 * @throws Error if text is not found within timeout
 *
 * @example
 * const modal = await waitForElement('[role="dialog"]');
 * await waitForText(modal, 'Loading complete');
 */
export const waitForText = async (
  element: Element,
  text: string,
  options?: WaitOptions,
): Promise<void> => {
  await waitFor(() => element.textContent?.includes(text) ?? false, options);
};
