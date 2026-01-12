import { useSession } from '~/lib/auth-client';
import { auth } from '~/lib/auth';

export const useAuth = async () => {
  // Server-side: Check session using request headers
  if (import.meta.server) {
    const event = useRequestEvent();

    if (!event) {
      return {
        loggedIn: ref(false),
        user: ref(undefined),
        token: undefined,
      };
    }

    const session = await auth.api.getSession({
      headers: event.node.req.headers,
    });

    const loggedIn = ref(!!session);
    const user = ref(session ? {
      name: session.user.name,
      image: session.user.image || undefined,
      initial: session.user.name[0]?.toUpperCase(),
    } : undefined);

    return {
      loggedIn,
      user,
      token: session?.session.token,
    };
  }

  // Client-side: Use reactive session
  const { data: session } = await useSession(useFetch);

  const loggedIn = computed(() => !!session.value);

  const user = computed(() => {
    if (!session.value) {
      return undefined;
    }
    const { name, image } = session.value.user;
    return {
      name,
      image: image || undefined,
      initial: name[0]?.toUpperCase(),
    };
  });

  return {
    loggedIn,
    user,
    token: session.value?.session.token,
  };
};
