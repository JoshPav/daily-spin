import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { computed, ref } from 'vue';
import { mockUser } from './mocks';

/**
 * Mock useAuth to bypass authentication in component tests.
 * Always returns logged in state with the default mock user.
 *
 * IMPORTANT: Must be called at module level (outside describe blocks)
 * due to mockNuxtImport hoisting requirements.
 *
 * For tests that need to toggle between logged in/out states (e.g., navigation tests),
 * use an inline mock with a module-level variable instead.
 *
 * @example
 * import { mockUseAuth } from '~~/tests/component/authMock';
 * mockUseAuth(); // At module level, before describe()
 */
export const mockUseAuth = () => {
  mockNuxtImport('useAuth', () => {
    return () => ({
      loggedIn: computed(() => true),
      user: computed(() => mockUser),
      loading: ref(false),
      requiresReauth: computed(() => false),
    });
  });
};
