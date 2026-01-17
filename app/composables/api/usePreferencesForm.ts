import type {
  GetPreferencesResponse,
  LinkedPlaylist,
  UserPreferences,
} from '#shared/schema';

export const usePreferencesForm = () => {
  const { data, pending, error, refresh } = useFetch<GetPreferencesResponse>(
    '/api/preferences',
    {
      key: 'preferences',
    },
  );
  const { updating, updatePreferences } = useUpdatePreferences({
    onSuccess: () => refresh(),
  });

  const linkedPlaylists = computed<LinkedPlaylist[]>(
    () => data.value?.linkedPlaylists ?? [],
  );

  // Local state for toggle values - only initialized when data loads
  const localPreferences = ref<UserPreferences | null>(null);

  // Initialize local state when data loads
  watch(
    () => data.value?.preferences,
    (prefs) => {
      if (prefs && !localPreferences.value) {
        localPreferences.value = { ...prefs };
      }
    },
    { immediate: true },
  );

  // Check if individual preference has changed
  const isChanged = (key: keyof UserPreferences) => {
    const prefs = data.value?.preferences;
    if (!prefs || !localPreferences.value) return false;
    return localPreferences.value[key] !== prefs[key];
  };

  // Check if there are any unsaved changes
  const hasChanges = computed(() => {
    if (!localPreferences.value) return false;
    return (
      isChanged('trackListeningHistory') ||
      isChanged('createTodaysAlbumPlaylist') ||
      isChanged('createSongOfDayPlaylist')
    );
  });

  const save = async () => {
    if (!localPreferences.value) return;
    await updatePreferences(localPreferences.value);
  };

  return {
    localPreferences,
    linkedPlaylists,
    pending,
    error,
    updating,
    hasChanges,
    isChanged,
    save,
  };
};
