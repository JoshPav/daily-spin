<template>
  <UModal title="Log Album" :description="subheadingText" :content="{ onOpenAutoFocus: (e) => e.preventDefault() }" >
    <template #body>
      <div class="flex flex-col gap-6">
        <AlbumSearch v-if="!selectedAlbum" v-model="selectedAlbum" />

        <div v-if="selectedAlbum" class="flex flex-col gap-4">
          <div class="flex justify-between items-center">
            <h3 class="m-0 font-montserrat text-lg font-bold text-primary-vibrant">Selected Album</h3>
            <UButton color="neutral" variant="subtle" size="lg" @click="selectedAlbum = undefined">Change</UButton>
          </div>

          <AlbumPreview  :album="selectedAlbum" />

          <RadioGroup
            v-model="listenMethod"
            label="Listen Method"
            :items="listenMethodOptions"
          />

          <RadioGroup
            v-model="listenTime"
            label="Time of Day"
            :items="listenTimeOptions"
          />

          <UButton block color="primary" size="lg" @click="logAlbumListen" :loading="saving">
            Save
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

</template>

<script lang="ts" setup>
import {
  LISTEN_METHOD_CONFIG,
  LISTEN_TIME_CONFIG,
  toRadioOptions,
} from '~/constants/listenMetadata';
import { formatDate } from '~/utils/dateUtils';

const { dateOfListen } = defineProps<{ dateOfListen: Date }>();
const emit = defineEmits<{ close: [] }>();

const { selectedAlbum, listenMethod, listenTime, saving, logAlbumListen } =
  useLogAlbum({
    date: dateOfListen,
    onSuccess: () => emit('close'),
  });

const listenMethodOptions = toRadioOptions(LISTEN_METHOD_CONFIG);
const listenTimeOptions = toRadioOptions(LISTEN_TIME_CONFIG);

const subheadingText = computed(() => {
  return formatDate(dateOfListen || new Date());
});
</script>