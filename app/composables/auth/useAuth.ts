import { useSession } from '~/lib/auth-client';

export const useAuth = () => {
  const session = useSession();

  const sessionData = computed(() => session.value.data);

  const user = computed(() => {
    if (!sessionData.value) {
      return undefined;
    }

    const { id, name, image, email } = sessionData.value.user;

    const firstInitial = /^[0-9]/.test(name[0] || '') ? email[0] : name[0];

    return {
      id,
      name,
      image: image || undefined,
      initial: firstInitial?.toUpperCase(),
    };
  });

  const requiresReauth = computed(
    () => sessionData.value?.requiresReauth ?? false,
  );

  return {
    loggedIn: computed(() => !!user.value),
    user,
    loading: computed(() => session.value.isPending),
    requiresReauth,
  };
};
