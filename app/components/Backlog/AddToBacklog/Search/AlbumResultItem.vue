<script setup lang="ts">
import type { SimplifiedAlbum } from '@spotify/web-api-ts-sdk';
import { getArtistNames } from '#shared/utils/albumUtils';
import { Icons } from '~/components/common/icons';

const props = withDefaults(
  defineProps<{
    album: SimplifiedAlbum;
    selected?: boolean;
    compact?: boolean;
  }>(),
  {
    selected: false,
    compact: false,
  },
);

defineEmits<{
  click: [];
}>();

const artistNames = computed(() => getArtistNames(props.album));
const formattedReleaseDate = computed(() =>
  formatReleaseDate(props.album.release_date),
);
</script>

<template>
  <div
    class="flex cursor-pointer items-center transition-all rounded-lg"
    :class="[
      selected ? 'bg-primary-500' : 'bg-elevated hover:bg-muted',
      compact ? 'gap-3 p-2' : 'gap-4 p-3',
    ]"
    @click="$emit('click')"
  >
    <div
      class="shrink-0 flex items-center justify-center"
      :class="compact ? 'w-5 h-5' : 'w-6 h-6'"
    >
      <UIcon
        v-if="selected"
        :name="Icons.CHECK_CIRCLE_SOLID"
        :class="compact ? 'text-xl' : 'text-2xl'"
      />
      <UIcon
        v-else
        :name="Icons.PLUS_CIRCLE"
        :class="['text-neutral-500', compact ? 'text-xl' : 'text-2xl']"
      />
    </div>
    <img
      v-if="album.images?.[0]?.url"
      :src="album.images[0].url"
      :alt="album.name"
      class="shrink-0 rounded object-cover"
      :class="compact ? 'h-12 w-12' : 'h-16 w-16'"
    >
    <div
      class="flex min-w-0 flex-1 flex-col"
      :class="compact ? 'gap-0.5' : 'gap-1'"
    >
      <div
        class="overflow-hidden text-ellipsis whitespace-nowrap font-montserrat font-bold"
        :class="[
          selected ? 'text-black' : 'text-white',
          compact ? 'text-sm' : 'text-base',
        ]"
      >
        {{ album.name }}
      </div>
      <div
        class="overflow-hidden text-ellipsis whitespace-nowrap font-montserrat font-medium"
        :class="[
          selected ? 'text-gray-900' : 'text-muted',
          compact ? 'text-xs' : 'text-sm',
        ]"
      >
        {{ artistNames }}
      </div>
      <div
        v-if="formattedReleaseDate"
        class="font-montserrat text-xs font-medium"
        :class="selected ? 'text-gray-800' : 'text-neutral-500'"
      >
        {{ formattedReleaseDate }}
      </div>
    </div>
  </div>
</template>
