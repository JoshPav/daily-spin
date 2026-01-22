<script setup lang="ts">
const model = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  added: [];
}>();

const {
  selectedAlbums,
  saving,
  isSelected,
  toggleSelection,
  clearSelection,
  addToBacklog,
} = useAddToBacklog({
  onSuccess: () => {
    model.value = false;
    emit('added');
  },
});

const handleAdd = async () => {
  await addToBacklog();
};
</script>

<template>
  <UModal v-model:open="model" title="Add to Backlog">
    <template #body>
      <div class="flex h-[60vh] flex-col">
        <AlbumSearchSelect
          compact
          :is-selected="isSelected"
          class="min-h-0 flex-1"
          @select="toggleSelection"
        />
        <SelectedAlbumsFooter
          :selected-albums="selectedAlbums"
          :saving="saving"
          compact
          @add="handleAdd"
          @clear="clearSelection"
        />
      </div>
    </template>
  </UModal>
</template>
