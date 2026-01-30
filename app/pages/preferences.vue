<script setup lang="ts">
import type { PlaylistType } from '~~/shared/schema';

const {
  localPreferences,
  linkedPlaylists,
  pending,
  error,
  updating,
  hasChanges,
  isChanged,
  save,
} = usePreferencesForm();

const {
  isSubscribed,
  loading: pushLoading,
  supported: pushSupported,
  checking: pushChecking,
  isBlocked: pushBlocked,
  toggle: togglePush,
  permission: pushPermission,
} = usePushNotifications();

// Temporary debug flag - remove after debugging
const showPushDebug = ref(false);

const getPlaylistTypeLabel = (type: PlaylistType) => {
  return type === 'album_of_the_day' ? 'Album of the Day' : 'Song of the Day';
};

const getPlaylistTypeDescription = (type: PlaylistType) => {
  return type === 'album_of_the_day'
    ? 'Updated daily with your scheduled album'
    : 'A growing collection of your daily song picks';
};
</script>

<template>
  <div class="flex flex-col min-h-full overflow-y-auto">
    <main class="max-w-200 mx-auto p-4 md:p-6 w-full flex-1 flex flex-col">
      <h1 class="m-0 text-2xl md:text-[32px] font-black text-highlighted mb-6">
        Preferences
      </h1>

      <div
        v-if="error"
        class="text-center py-12 px-6 text-base font-medium text-secondary-500"
      >
        Error: {{ error }}
      </div>

      <div v-else class="flex flex-col gap-6 flex-1 p-1">
        <PreferencesCard
          title="Features"
          description="Control how DailySpin tracks and manages your listening activity"
        >
          <template #headerRight>
            <UButton
              class="hover:cursor-pointer"
              color="primary"
              :variant="!hasChanges ? 'outline' : 'solid'"
              :disabled="!hasChanges || updating"
              :loading="updating"
              @click="save"
            >
              Save Changes
            </UButton>
          </template>

          <div class="flex flex-col gap-2">
            <PreferenceToggle
              v-model="localPreferences.trackListeningHistory"
              title="Track Listening History"
              description="Automatically detect and record albums you listen to on Spotify"
              :loading="pending"
              :changed="isChanged('trackListeningHistory')"
            />

            <PreferenceToggle
              v-model="localPreferences.createTodaysAlbumPlaylist"
              title="Create Today's Album Playlist"
              description="Automatically create/update a Spotify playlist for your scheduled album"
              :loading="pending"
              :changed="isChanged('createTodaysAlbumPlaylist')"
            />

            <PreferenceToggle
              v-model="localPreferences.createSongOfDayPlaylist"
              title="Create Song of the Day Playlist"
              description="Automatically create/update a Spotify playlist for daily song picks"
              :loading="pending"
              :changed="isChanged('createSongOfDayPlaylist')"
            />
          </div>
        </PreferencesCard>

        <!-- Show skeleton while checking push support, or show card if supported -->
        <PreferencesCard
          v-if="pushChecking || pushSupported"
          title="Notifications"
          description="Get notified about important updates"
        >
          <div class="flex flex-col gap-2">
            <div v-if="pushBlocked" class="text-sm text-warning-500 mb-2">
              Notifications are blocked. Please enable them in your browser
              settings.
            </div>
            <PreferenceToggle
              :model-value="isSubscribed"
              title="Push Notifications"
              description="Receive notifications when you need to reconnect your Spotify account"
              :loading="pushLoading || pushChecking"
              @update:model-value="togglePush"
            />
            <!-- Temporary debug display - tap to toggle -->
            <div
              class="mt-2 p-2 bg-gray-800 rounded text-xs font-mono cursor-pointer"
              @click="showPushDebug = !showPushDebug"
            >
              <div>tap to {{ showPushDebug ? 'hide' : 'show' }} debug</div>
              <div v-if="showPushDebug" class="mt-2 space-y-1">
                <div>checking: {{ pushChecking }}</div>
                <div>supported: {{ pushSupported }}</div>
                <div>loading: {{ pushLoading }}</div>
                <div>subscribed: {{ isSubscribed }}</div>
                <div>blocked: {{ pushBlocked }}</div>
                <div>permission: {{ pushPermission }}</div>
              </div>
            </div>
          </div>
        </PreferencesCard>

        <PreferencesCard title="Linked Playlists">
          <!-- Loading skeleton for playlists -->
          <div v-if="pending" class="flex flex-col gap-3">
            <PreferencePlaylistSkeleton />
          </div>

          <div
            v-else-if="linkedPlaylists.length === 0"
            class="text-center py-8 text-muted"
          >
            <p class="text-base font-medium mb-2">No playlists linked yet</p>
            <p class="text-sm">
              Enable playlist features above to automatically create and link
              Spotify playlists
            </p>
          </div>

          <div v-else class="flex flex-col gap-3">
            <div
              v-for="playlist in linkedPlaylists"
              :key="playlist.spotifyPlaylistId"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div>
                  <h3 class="text-base font-semibold">
                    {{ getPlaylistTypeLabel(playlist.type) }}
                  </h3>
                  <p class="text-sm text-muted">
                    {{ getPlaylistTypeDescription(playlist.type) }}
                  </p>
                </div>
              </div>

              <OpenInSpotifyButton
                :spotify-id="playlist.spotifyPlaylistId"
                type="playlist"
                variant="solid"
                size="md"
              />
            </div>
          </div>
        </PreferencesCard>
      </div>
    </main>
  </div>
</template>
