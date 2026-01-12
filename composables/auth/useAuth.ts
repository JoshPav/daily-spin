import { useSession } from '~/lib/auth-client';

export const useAuth = () => {
  // Use BetterAuth's useSession which handles SSR automatically
  const session = useSession();

  const loggedIn = computed(() => !!session.value?.data);

  const user = computed(() => {
    const data = session.value?.data;
    if (!data) {
      return undefined;
    }
    const { name, image } = data.user;
    return {
      name,
      image: image || undefined,
      initial: name[0]?.toUpperCase(),
    };
  });

  return {
    loggedIn,
    user,
    token: computed(() => session.value?.data?.session.token),
  };
};
