<template><span v-for="(part, index) in parts" :key="index">
  <mark
    v-if="part.highlight"
    class="bg-primary-500/30 text-primary-200 px-0.5 rounded"
  >
    {{ part.text }}
  </mark>
  <template v-else>{{ part.text }}</template>
</span></template>

<script setup lang="ts">
interface TextPart {
  text: string;
  highlight: boolean;
}

const props = defineProps<{
  text: string;
  searchTerm?: string;
}>();

const parts = computed((): TextPart[] => {
  if (!props.searchTerm || props.searchTerm.trim() === '') {
    return [{ text: props.text, highlight: false }];
  }

  const searchLower = props.searchTerm.toLowerCase();
  const textLower = props.text.toLowerCase();

  const parts: TextPart[] = [];
  let lastIndex = 0;
  let index = textLower.indexOf(searchLower);

  while (index !== -1) {
    // Add non-matching text before the match
    if (index > lastIndex) {
      parts.push({
        text: props.text.substring(lastIndex, index),
        highlight: false,
      });
    }

    // Add matching text
    parts.push({
      text: props.text.substring(index, index + searchLower.length),
      highlight: true,
    });

    lastIndex = index + searchLower.length;
    index = textLower.indexOf(searchLower, lastIndex);
  }

  // Add remaining non-matching text
  if (lastIndex < props.text.length) {
    parts.push({
      text: props.text.substring(lastIndex),
      highlight: false,
    });
  }

  return parts;
});
</script>
