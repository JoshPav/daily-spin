<template>
  <UCarousel
    ref="carouselRef"
    :items="albums"
    loop
    :arrows="hasMultiple"
    :dots="hasMultiple"
    indicators
    :next="{ size: 'xl' }"
    :prev="{ size: 'xl' }"
    :ui="{
      dots: 'bottom-0 md:-bottom-2',
      arrows: '',
      prev: 'left-2 md:left-2 top-44',
      next: 'right-2 md:right-2 top-44',
    }"
    @select="handleCarouselChange"
  >
    <template #default="{ item, index }">
      <AlbumCarouselItem
        :ref="(el) => setItemRef(el, index)"
        :album-listen="item"
        :favorite-song="favoriteSong"
        :disabled="disabled"
        @select-track="(track, albumId) => $emit('selectTrack', track, albumId)"
      />
    </template>
  </UCarousel>
</template>

<script setup lang="ts">
import type { AlbumCarouselItem } from '#components';
import type { DailyAlbumListen, FavoriteSong } from '#shared/schema';
import type { AlbumTrack } from '~/composables/api/spotify/useAlbumTracks';

const props = defineProps<{
  albums: DailyAlbumListen[];
  favoriteSong: FavoriteSong | null;
  disabled?: boolean;
}>();

defineEmits<{
  selectTrack: [track: AlbumTrack, albumId: string];
}>();

const hasMultiple = computed(() => props.albums.length > 1);

// Refs for carousel items
const carouselRef = ref();
const itemRefs = ref<Map<number, InstanceType<typeof AlbumCarouselItem>>>(
  new Map(),
);
const currentIndex = ref<number | null>(null);

const setItemRef = (
  el: InstanceType<typeof AlbumCarouselItem> | null,
  index: number,
) => {
  if (el) {
    itemRefs.value.set(index, el);
  } else {
    itemRefs.value.delete(index);
  }
};

// Collapse all items when carousel navigates to a different slide
const handleCarouselChange = (index: number) => {
  // Skip if this is the initial selection or same index
  if (currentIndex.value === null || currentIndex.value === index) {
    currentIndex.value = index;
    return;
  }

  currentIndex.value = index;
  for (const item of itemRefs.value.values()) {
    item.collapse?.();
  }
};

// Expand the first item's track list
const expandFirstItem = () => {
  const firstItem = itemRefs.value.get(0);
  firstItem?.expand?.();
};

defineExpose({ expandFirstItem });
</script>
