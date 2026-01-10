<template>
   <Modal :isOpen="isOpen" @close="close" title="Record listen">

 
  </Modal>
</template>

<script lang="ts" setup>
const { isOpen, close } = useAddAlbumListenModal();
</script>

<style>

</style>