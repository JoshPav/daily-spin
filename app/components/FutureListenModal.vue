<template>
  <UModal :title="modalHeader" :description="modalSubheading" :content="{ onOpenAutoFocus: (e) => e.preventDefault() }">
    <template #body>
      <div class="flex flex-col gap-6">
        <!-- Album preview -->
        <div class="scheduled-album-preview">
          <img
            v-if="futureListenItem.album.imageUrl"
            :src="futureListenItem.album.imageUrl"
            :alt="futureListenItem.album.name"
            class="preview-image"
          />
          <div v-else class="preview-image-placeholder">
            <UIcon name="i-lucide-disc-3" class="text-4xl text-neutral-500" />
          </div>
          <div class="preview-info">
            <div class="preview-album-name">{{ futureListenItem.album.name }}</div>
            <div class="preview-artist-names">
              {{ artistNames }}
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <UButton
            block
            color="neutral"
            variant="subtle"
            size="lg"
            :loading="removing"
            @click="handleRemove"
          >
            <UIcon name="i-lucide-calendar-x" class="mr-2" />
            Remove from schedule
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/dateUtils';
import type { FutureListenItem } from '~~/shared/schema';

const { futureListenItem } = defineProps<{
  futureListenItem: FutureListenItem;
}>();
const emit = defineEmits<{ close: [] }>();

const { removeFutureListen, removing } = useFutureListensActions();

const modalHeader = computed(() => 'Scheduled Album');

const modalSubheading = computed(() =>
  formatDate(new Date(futureListenItem.date)),
);

const artistNames = computed(() =>
  futureListenItem.album.artists.map((a) => a.name).join(', '),
);

const handleRemove = async () => {
  await removeFutureListen(futureListenItem.id);
  emit('close');
};
</script>

<style scoped>
.scheduled-album-preview {
  display: flex;
  gap: 16px;
  align-items: center;
}

.preview-image {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  object-fit: cover;
}

.preview-image-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  background-color: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-album-name {
  font-family: 'Montserrat', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
}

.preview-artist-names {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #b3b3b3;
}
</style>
