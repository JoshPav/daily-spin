import type {
  GetPreferencesResponse,
  LinkedPlaylist,
  UserPreferences,
} from '#shared/schema';

export const usePreferencesForm = () => {
  const { data, status, error, refresh } = useFetch<GetPreferencesResponse>(
    '/api/preferences',
    {
      key: 'preferences',
      lazy: true,
      server: false,
    },
  );

  // Show loading when idle (before fetch starts) or pending (during fetch)
  const pending = computed(
    () => status.value === 'idle' || status.value === 'pending',
  );
  const { updating, updatePreferences } = useUpdatePreferences({
    onSuccess: () => refresh(),
  });

  const linkedPlaylists = computed<LinkedPlaylist[]>(
    () => data.value?.linkedPlaylists ?? [],
  );

  // Local state for toggle values - initialized with defaults, updated when data loads
  const localPreferences = ref<UserPreferences>({
    trackListeningHistory: false,
    createTodaysAlbumPlaylist: false,
    createSongOfDayPlaylist: false,
  });

  // Track if we've initialized from server data
  const initialized = ref(false);

  // Update local state when data loads
  watch(
    () => data.value?.preferences,
    (prefs) => {
      if (prefs && !initialized.value) {
        localPreferences.value = { ...prefs };
        initialized.value = true;
      }
    },
    { immediate: true },
  );

  // Check if individual preference has changed from server value
  const isChanged = (key: keyof UserPreferences) => {
    const serverPrefs = data.value?.preferences;
    if (!serverPrefs) return false;
    return localPreferences.value[key] !== serverPrefs[key];
  };

  // Check if there are any unsaved changes
  const hasChanges = computed(() => {
    return (
      isChanged('trackListeningHistory') ||
      isChanged('createTodaysAlbumPlaylist') ||
      isChanged('createSongOfDayPlaylist')
    );
  });

  const save = async () => {
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
