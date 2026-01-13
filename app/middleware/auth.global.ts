import { isNavigatingTo, Route } from '~/pages/routes';

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    try {
      // ! Keep it here to avoid Buffer error when bundling
      const { auth } = await import('#shared/auth');

      const data = await auth.api.getSession({ headers: useRequestHeaders() });

      const loggedIn = !!data;

      const goingToLandingPage = isNavigatingTo(to, Route.LANDING_PAGE);

      if (goingToLandingPage && loggedIn) {
        return navigateTo(Route.DASHBOARD);
      }

      if (!loggedIn && !goingToLandingPage) {
        return navigateTo(Route.LANDING_PAGE);
      }
    } catch (error) {
      console.error('Failed to fetch session', error);
    }
  }
});
