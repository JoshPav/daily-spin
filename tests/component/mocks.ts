/**
 * Default mock user for authenticated tests.
 *
 * Use this constant when setting up useAuth mocks in your tests.
 *
 * @example
 * mockNuxtImport('useAuth', () => {
 *   return () => ({
 *     loggedIn: computed(() => true),
 *     user: computed(() => mockUser),
 *     loading: ref(false),
 *     requiresReauth: computed(() => false),
 *   });
 * });
 */
export const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  initial: 'T',
};
