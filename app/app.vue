<script setup lang="ts">
const { data: listens, pending, error, refresh } = useListens();
</script>

<template>
  <head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com">
<link
  href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap"
  rel="stylesheet">
  </head>
  <div>
    <h1>Album of the day</h1>

    <div v-if="pending">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else-if="listens">
      <div v-if="listens.length === 0">
        No listens yet for this month
      </div>
      <div v-else class="day-container">
        <DailyListens v-for="day in listens" :key="day.dayOfMonth" :day-listens="day" />
      </div>
      <button @click="refresh()">Refresh</button>
    </div>
  </div>
</template>

<style>
  .day-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;

  /* Keep a calendar-like max width (7 columns) */
  max-width: calc(7 * 240px + 6 * 16px);
  margin: 0 auto;

  /* Optional breathing room */
  padding: 8px;
  }
</style>
  