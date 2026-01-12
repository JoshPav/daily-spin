import { useSession } from '~/lib/auth-client';

export const useAuth = () => {
  const session = useSession();

  const sessionData = computed(() => session.value.data);

  const user = computed(() => {
    if (!sessionData.value) {
      return undefined;
    }

    const { id, name, image } = sessionData.value.user;

    return {
      id,
      name,
      image: image || undefined,
      initial: name[0]?.toUpperCase(),
    };
  });

  return {
    loggedIn: computed(() => !!user.value),
    user,
    token: computed(() => session.value?.data?.session.token),
  };
};
