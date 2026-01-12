import { authClient } from '~/lib/auth-client';

export default defineNuxtRouteMiddleware(async (to, from) => {
  // const { data: session } = await authClient.useSession(useFetch);
  const session = await authClient.getSession();
  console.log({ session });
  if (!session?.data) {
    if (to.path === '/') {
      console.log('redirecting');
      return navigateTo('/login');
    }
  }
});
