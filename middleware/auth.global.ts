import { auth } from '~/lib/auth';

export default defineNuxtRouteMiddleware(async (to, from) => {
  const event = useRequestEvent();

  if (!event) {
    return;
  }

  const session = await auth.api.getSession({
    headers: event.node.req.headers,
  });

  console.log({ session });

  if (!session) {
    if (to.path === '/') {
      console.log('redirecting');
      return navigateTo('/login');
    }
  }
});
