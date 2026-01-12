<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import type { DailyListens } from '~~/shared/schema';

const { data, pending, error, refresh } = useListens();

function getNextNDays(startDate: Date, n: number): Date[] {
  const days: Date[] = [];

  for (let i = 0; i < n; i++) {
    const nextDay = new Date(startDate);
    nextDay.setDate(startDate.getDate() + i);
    days.push(nextDay);
  }

  return days;
}

const listens = computed<DailyListens[]>(() => {
  if (!data.value) {
    return [];
  }

  const mostRecentListen = data.value.at(-1);

  if (!mostRecentListen) {
    return data.value;
  }

  const datesInFuture = getNextNDays(new Date(mostRecentListen.date), 7);

  return [
    ...data.value,
    ...datesInFuture
      .slice(1)
      .map((date) => ({ date: date.toISOString(), albums: [] })),
  ];
});

// Refs for scrolling
const scrollContainer = ref<HTMLElement | null>(null);
const todayItem = ref<HTMLElement | null>(null);
const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

// Smooth scroll function
const scrollToToday = () => {
  const container = scrollContainer.value;
  const item = todayItem.value;

  if (container && item) {
    const top = item.offsetTop - container.offsetTop;
    container.scrollTo({
      top: top - container.offsetHeight / 2 + item.offsetHeight / 2,
      behavior: 'smooth',
    });
  }
};

// Also scroll on page refresh
onMounted(async () => {
  if (listens.value && listens.value.length > 0) {
    await nextTick();
    scrollToToday();
  }
});
</script>

<template>
    <div class="app-container">
      <main class="main-content">
        <!-- Loading / Error / Empty states outside scrollable area -->
        <div v-if="pending" class="loading">Loading...</div>
        <div v-else-if="error" class="error">Error: {{ error }}</div>
        <div v-else-if="listens && listens.length === 0" class="empty-state">
          No listens yet for this month
        </div>

        <!-- Scrollable grid + button -->
        <div v-else class="scroll-wrapper" >
          <div class="day-container" ref="scrollContainer">
            <StickyMonthHeader />
            <DailyListens
              v-for="day in listens"
              :key="day.date"
              :day-listens="day"
              :ref="el => {
                if (day.date.split('T')[0] === today) {
                  todayItem = (el as any)?.$el ?? el ?? null;
                }
              }"
            />
          </div>
        </div>
      </main>

      <Teleport to="body">
        <DailyListensModal />
        <LogAlbumModal />
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

  height: calc(100vh - 120px); /* adjust for header/footer */
  display: flex;
  flex-direction: column;
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

.scroll-wrapper {
  display: flex;
  align-items: center;
  flex-direction: column;
  height: 100%;
}

.day-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  grid-auto-rows: min-content;
  gap: 24px;
  margin: 0 0 32px 0;
  width: 100%;

  flex-grow: 1;
  overflow-y: auto;
  padding-right: 8px;
  padding-top: 40px; /* Space for month banners that stick out above */
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px auto 0;
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

  .main-content {
    padding: 0 16px;
  }

  .day-container {
    gap: 16px;
    margin: 0 0 16px 0;
    padding-top: 40px;
  }
}
</style>
