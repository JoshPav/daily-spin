<script setup lang="ts">
import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';

const props = withDefaults(
  defineProps<{
    selectedAlbums: SimplifiedAlbum[];
    saving?: boolean;
    compact?: boolean;
  }>(),
  {
    saving: false,
    compact: false,
  },
);

defineEmits<{
  add: [];
  clear: [];
}>();

const albumsSelectedString = computed(
  () =>
    `${props.selectedAlbums.length} Album${props.selectedAlbums.length === 1 ? '' : 's'}`,
);
</script>

<template>
  <div
    v-if="selectedAlbums.length > 0"
    class="border-t border-neutral-700"
    :class="compact ? 'pt-3' : 'mt-4 pt-4 border-t-2'"
  >
    <div
      class="flex items-center justify-between"
      :class="compact ? 'mb-2' : 'mb-3'"
    >
      <div class="font-montserrat text-sm font-semibold text-primary-500">
        {{ albumsSelectedString }} selected
      </div>
      <UButton
        color="neutral"
        variant="ghost"
        :size="compact ? 'xs' : 'sm'"
        @click="$emit('clear')"
      >
        Clear
      </UButton>
    </div>

    <div
      class="flex gap-2 overflow-x-auto pb-2"
      :class="compact ? 'mb-2' : 'mb-3'"
    >
      <img
        v-for="album in selectedAlbums"
        :key="album.id"
        :src="album.images?.[0]?.url"
        :alt="album.name"
        :title="album.name"
        class="shrink-0 rounded object-cover"
        :class="compact ? 'h-12 w-12' : 'h-16 w-16'"
      >
    </div>

    <UButton
      block
      color="primary"
      :size="compact ? 'md' : 'lg'"
      :loading="saving"
      @click="$emit('add')"
    >
      {{ `Add ${albumsSelectedString}` }}
    </UButton>
  </div>
</template>
