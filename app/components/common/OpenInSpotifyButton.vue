<template>
  <UButton
    color="primary"
    :size="size"
    :to="spotifyUrl"
    target="_blank"
    :block="block"
    external
  >
    <UIcon :name="Icons.SPOTIFY" :class="{'size-5': !block }" />

    <slot>{{ text }}</slot>

    <UIcon :name="Icons.EXTERNAL_LINK" class="size-3" />
  </UButton>
</template>

<script setup lang="ts">
import { Icons } from '~/components/common/icons';

type SpotifyResourceType = 'album' | 'track' | 'playlist';

const props = withDefaults(
  defineProps<{
    spotifyId: string;
    type: SpotifyResourceType;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    text?: string;
    block?: boolean;
  }>(),
  {
    size: 'xs',
    text: 'Open',
  },
);

const spotifyUrl = computed(
  () => `https://open.spotify.com/${props.type}/${props.spotifyId}`,
);
</script>
