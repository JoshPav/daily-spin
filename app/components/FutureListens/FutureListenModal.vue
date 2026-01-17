<template>
  <UModal
    :title="modalHeader"
    :description="modalSubheading"
    :content="{ onOpenAutoFocus: (e) => e.preventDefault() }"
  >
    <template #body>
      <div class="flex flex-col items-center gap-6">
        <!-- Album artwork (large, centered) -->
        <div
          class="w-full aspect-square md:w-75 md:h-75 md:aspect-auto rounded-lg overflow-hidden bg-neutral-900 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <img
            v-if="futureListenItem.album.imageUrl"
            :src="futureListenItem.album.imageUrl"
            :alt="futureListenItem.album.name"
            class="w-full h-full object-cover"
          >
          <div v-else class="w-full h-full flex items-center justify-center">
            <UIcon name="i-lucide-disc-3" class="text-6xl text-neutral-500" />
          </div>
        </div>

        <!-- Album info (centered) -->
        <div class="text-center">
          <h3
            class="font-montserrat text-xl font-bold text-white leading-tight"
          >
            {{ futureListenItem.album.name }}
          </h3>
          <p class="font-montserrat text-sm text-neutral-400 mt-1">
            {{ artistNames }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3 w-full">
          <UButton
            block
            color="primary"
            size="lg"
            :to="spotifyUrl"
            target="_blank"
          >
            <UIcon :name="Icons.SPOTIFY" class="mr-2" />
            Open in Spotify
          </UButton>
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
import { Icons } from '~/components/common/icons';
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

const spotifyUrl = computed(
  () => `https://open.spotify.com/album/${futureListenItem.album.spotifyId}`,
);

const handleRemove = async () => {
  await removeFutureListen(futureListenItem.id);
  emit('close');
};
</script>
