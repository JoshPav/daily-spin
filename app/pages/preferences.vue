<script setup lang="ts">
import { Icons } from '~/components/common/icons';

const { data, pending, error, refresh } = usePreferences();
const { updating, updatePreferences } = useUpdatePreferences({
  onSuccess: () => {
    refresh();
  },
});

const preferences = computed(() => data.value?.preferences);
const linkedPlaylists = computed(() => data.value?.linkedPlaylists ?? []);

const handleToggle = async (field: string, value: boolean) => {
  try {
    await updatePreferences({
      [field]: value,
    });
  } catch (err) {
    console.error('Failed to update preference:', err);
  }
};

const getPlaylistTypeLabel = (type: 'album_of_the_day' | 'song_of_the_day') => {
  return type === 'album_of_the_day' ? 'Album of the Day' : 'Song of the Day';
};
</script>

<template>
  <div class="flex flex-col overflow-hidden h-full">
    <main class="max-w-200 mx-auto p-4 md:p-6 w-full flex-1 flex flex-col overflow-hidden">
      <h1 class="m-0 text-2xl md:text-[32px] font-black text-highlighted mb-6">
        Preferences
      </h1>

      <div v-if="pending" class="text-center py-12 px-6 text-base font-medium text-muted">
        Loading...
      </div>

      <div v-else-if="error" class="text-center py-12 px-6 text-base font-medium text-secondary-500">
        Error: {{ error }}
      </div>

      <div v-else class="flex flex-col gap-6 overflow-y-auto flex-1">
        <!-- Feature Preferences Section -->
        <section>
          <h2 class="text-xl font-bold mb-4">Features</h2>
          <UCard>
            <div class="flex flex-col gap-4">
              <!-- Track Listening History -->
              <div class="flex items-center justify-between py-2">
                <div class="flex-1">
                  <h3 class="text-base font-semibold mb-1">Track Listening History</h3>
                  <p class="text-sm text-muted">
                    Automatically detect and record albums you listen to on Spotify
                  </p>
                </div>
                <UToggle
                  :model-value="preferences?.trackListeningHistory"
                  :disabled="updating"
                  @update:model-value="handleToggle('trackListeningHistory', $event)"
                />
              </div>

              <UDivider />

              <!-- Create Today's Album Playlist -->
              <div class="flex items-center justify-between py-2">
                <div class="flex-1">
                  <h3 class="text-base font-semibold mb-1">Create Today's Album Playlist</h3>
                  <p class="text-sm text-muted">
                    Automatically create/update a Spotify playlist for your scheduled album
                  </p>
                </div>
                <UToggle
                  :model-value="preferences?.createTodaysAlbumPlaylist"
                  :disabled="updating"
                  @update:model-value="handleToggle('createTodaysAlbumPlaylist', $event)"
                />
              </div>

              <UDivider />

              <!-- Create Song of Day Playlist -->
              <div class="flex items-center justify-between py-2">
                <div class="flex-1">
                  <h3 class="text-base font-semibold mb-1">Create Song of the Day Playlist</h3>
                  <p class="text-sm text-muted">
                    Automatically create/update a Spotify playlist for daily song picks
                  </p>
                  <UBadge color="gray" variant="subtle" size="xs" class="mt-2">
                    Coming Soon
                  </UBadge>
                </div>
                <UToggle
                  :model-value="preferences?.createSongOfDayPlaylist"
                  :disabled="true"
                />
              </div>
            </div>
          </UCard>
        </section>

        <!-- Linked Playlists Section -->
        <section>
          <h2 class="text-xl font-bold mb-4">Linked Playlists</h2>

          <div v-if="linkedPlaylists.length === 0">
            <UCard>
              <div class="text-center py-8 text-muted">
                <p class="text-base font-medium mb-2">No playlists linked yet</p>
                <p class="text-sm">
                  Enable playlist features above to automatically create and link Spotify playlists
                </p>
              </div>
            </UCard>
          </div>

          <div v-else class="flex flex-col gap-3">
            <UCard
              v-for="playlist in linkedPlaylists"
              :key="playlist.spotifyPlaylistId"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <UIcon
                    :name="Icons.SPOTIFY"
                    class="text-green-500 text-2xl"
                  />
                  <div>
                    <h3 class="text-base font-semibold">
                      {{ getPlaylistTypeLabel(playlist.type) }}
                    </h3>
                    <p class="text-sm text-muted">
                      Playlist ID: {{ playlist.spotifyPlaylistId }}
                    </p>
                  </div>
                </div>
                <UButton
                  color="primary"
                  variant="soft"
                  :icon="Icons.EXTERNAL_LINK"
                  :to="playlist.spotifyUrl"
                  target="_blank"
                  external
                >
                  Open in Spotify
                </UButton>
              </div>
            </UCard>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
