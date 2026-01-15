<script setup lang="ts">
const { data, pending, error, refresh } = useBacklog();

const isAddModalOpen = ref(false);

const openAddModal = () => {
  isAddModalOpen.value = true;
};

const closeAddModal = () => {
  isAddModalOpen.value = false;
};

const handleAdded = () => {
  refresh();
};

const handleDeleted = () => {
  refresh();
};

const albums = computed(() => data.value?.albums ?? []);
</script>

<template>
  <div class="backlog-container">
    <main class="main-content">
      <div class="page-header">
        <h1 class="page-title">Backlog</h1>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          @click="openAddModal"
        >
          Add Albums
        </UButton>
      </div>

      <!-- Loading state -->
      <div v-if="pending" class="loading">Loading...</div>

      <!-- Error state -->
      <div v-else-if="error" class="error">Error: {{ error }}</div>

      <!-- Empty state -->
      <div v-else-if="albums.length === 0" class="empty-state">
        <UIcon
          name="i-heroicons-queue-list"
          class="text-6xl text-gray-600 mb-4"
        />
        <p class="empty-title">Your backlog is empty</p>
        <p class="empty-description">
          Add albums you want to listen to later
        </p>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          class="mt-4"
          @click="openAddModal"
        >
          Add Your First Album
        </UButton>
      </div>

      <!-- Backlog list -->
      <div v-else class="backlog-list">
        <BacklogItem
          v-for="album in albums"
          :key="album.id"
          :album="album"
          @deleted="handleDeleted"
        />
      </div>
    </main>

    <!-- Add to backlog modal -->
    <AddToBacklogModal
      v-if="isAddModalOpen"
      @close="closeAddModal"
      @added="handleAdded"
    />
  </div>
</template>

<style scoped>
.backlog-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #121212;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.loading,
.error {
  text-align: center;
  padding: 48px 24px;
  font-size: 16px;
  font-weight: 500;
  color: #b3b3b3;
}

.error {
  color: #f15e6c;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  flex: 1;
}

.empty-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.empty-description {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #b3b3b3;
  margin: 8px 0 0;
}

.backlog-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex: 1;
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
}
</style>
