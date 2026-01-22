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
            v-if="scheduledListenItem.album.imageUrl"
            :src="scheduledListenItem.album.imageUrl"
            :alt="scheduledListenItem.album.name"
            class="w-full h-full object-cover"
          >
          <div v-else class="w-full h-full flex items-center justify-center">
            <UIcon name="i-lucide-disc-3" class="text-6xl text-neutral-500" />
          </div>
        </div>

        <div class="text-center">
          <h3
            class="font-montserrat text-xl font-bold text-white leading-tight"
          >
            {{ scheduledListenItem.album.name }}
          </h3>
          <p class="font-montserrat text-sm text-neutral-400 mt-1">
            {{ artistNames }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3 w-full">
          <OpenInSpotifyButton
            variant="solid"
            block
            type="album"
            text="Open in Spotify"
            size="lg"
            :spotify-id="scheduledListenItem.album.spotifyId"
          />
          <UButton
            block
            color="neutral"
            variant="subtle"
            size="lg"
            :loading="removing"
            @click="handleRemove"
          >
            <UIcon :name="Icons.CALENDAR.REMOVE" class="size-4.5" />
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
import type { ScheduledListenItem } from '~~/shared/schema';

const { scheduledListenItem } = defineProps<{
  scheduledListenItem: ScheduledListenItem;
}>();
const emit = defineEmits<{ close: [] }>();

const { removeScheduledListen, removing } = useScheduledListensActions();

const modalHeader = computed(() => 'Scheduled Album');

const modalSubheading = computed(() =>
  formatDate(new Date(scheduledListenItem.date)),
);

const artistNames = computed(() =>
  scheduledListenItem.album.artists.map((a) => a.name).join(', '),
);

const handleRemove = async () => {
  await removeScheduledListen(scheduledListenItem.id);
  emit('close');
};
</script>
