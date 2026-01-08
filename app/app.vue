<script setup lang="ts">
import { watch } from 'vue';
import { resetSeenMonths } from '~/composables/useDate';

const { data: listens, pending, error, refresh } = useListens();

// Fetch all albums when listens data changes
watch(
  listens,
  async (newListens) => {
    resetSeenMonths();

    if (newListens) {
      // Collect all unique album IDs
      const albumIds = new Set<string>();
      for (const listen of newListens) {
        for (const album of listen.albums) {
          albumIds.add(album.albumId);
        }
      }

      // Fetch all albums in bulk
      if (albumIds.size > 0) {
        // await fetchAlbums(Array.from(albumIds));
      }
    }
  },
  { immediate: true },
);

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap',
    },
  ],
});
</script>

<template>
  <div class="app-container">
    <header class="header">
      <h1 class="title">Album of the Day</h1>
    </header>

    <main class="main-content">
      <div v-if="pending" class="loading">Loading...</div>
      <div v-else-if="error" class="error">Error: {{ error }}</div>
      <div v-else-if="listens">
        <div v-if="listens.length === 0" class="empty-state">
          No listens yet for this month
        </div>
        <div v-else>
          <div class="day-container">
            <DailyListens
              v-for="day in listens"
              :key="day.date"
              :day-listens="day"
            />
          </div>
          <button class="refresh-button" @click="refresh()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <AlbumModal />
    </Teleport>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background-color: #121212;
  color: #ffffff;
  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* View Transitions */
@view-transition {
  navigation: auto;
}

::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

::view-transition-old(*),
::view-transition-new(*) {
  animation-duration: 0.4s;
}

.app-container {
  min-height: 100vh;
  background-color: #121212;
  padding-bottom: 40px;
}

.header {
  padding: 32px 24px 24px;
  background-color: #121212;
}

.title {
  margin: 0;
  font-size: 48px;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: #ffffff;
  text-align: center;
}

.main-content {
  max-width: 1800px;
  margin: 0 auto;
  padding: 0 24px;
}

.loading,
.error,
.empty-state {
  text-align: center;
  padding: 48px 24px;
  font-size: 16px;
  font-weight: 500;
  color: #b3b3b3;
}

.error {
  color: #f15e6c;
}

.day-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 24px;
  margin: 32px auto;
  max-width: calc(7 * 180px + 6 * 24px);
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 32px auto 0;
  padding: 12px 32px;

  background-color: #1db954;
  color: #ffffff;

  border: none;
  border-radius: 500px;

  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;

  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-button:hover {
  background-color: #1ed760;
  transform: scale(1.04);
}

.refresh-button:active {
  transform: scale(0.98);
}

.refresh-button svg {
  transition: transform 0.3s ease;
}

.refresh-button:hover svg {
  transform: rotate(180deg);
}

@media (max-width: 768px) {
  .title {
    font-size: 32px;
  }

  .day-container {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px;
  }
}
</style>
  