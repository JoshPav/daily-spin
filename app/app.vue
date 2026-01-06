<script setup lang="ts">
const { data: listens, pending, error, refresh } = useListens()
</script>

<template>
  <div>
    <h1>Album of the day</h1>

    <div v-if="pending">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else-if="listens">
      <div v-if="listens.length === 0">
        No listens yet for this month
      </div>
      <div v-else>
        <div v-for="day in listens" :key="day.dayOfMonth">
          <h2>Day {{ day.dayOfMonth }}</h2>
          <ul>
            <li v-for="albumId in day.albums" :key="albumId">
              {{ albumId }}
            </li>
          </ul>
        </div>
      </div>
      <button @click="refresh()">Refresh</button>
    </div>
  </div>
</template>
  