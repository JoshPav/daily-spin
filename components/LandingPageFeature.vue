<template>
  <div class="border-b-8 border-gray-800">
    <UContainer class="py-16 sm:py-24">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div
          class="space-y-4"
          :class="{ 'md:order-2': reversed }"
        >
          <h2 class="text-3xl sm:text-5xl font-bold">
            {{ heading }}
          </h2>
          <p class="text-lg sm:text-xl text-gray-400">
            {{ description }}
          </p>
        </div>
        <div
          ref="imageContainer"
          class="relative perspective-container"
          :class="{ 'md:order-1': reversed }"
        >
          <div
            class="bg-linear-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden border border-gray-700 showcase-feature-transform"
            :class="{ 'reversed': reversed, 'visible': isVisible }"
          >
            <img
              :src="imageSrc"
              :alt="heading"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    imageSrc: string;
    heading: string;
    description: string;
    reversed?: boolean;
  }>(),
  { reversed: false },
);

const imageContainer = ref<HTMLElement | null>(null);
const isVisible = ref(false);

onMounted(() => {
  if (!imageContainer.value) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true;
          // Unobserve after animation triggers (no need to re-trigger)
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.2, // Trigger when 20% of element is visible
      rootMargin: '0px 0px -100px 0px', // Start slightly before it comes into view
    },
  );

  observer.observe(imageContainer.value);

  onUnmounted(() => {
    if (imageContainer.value) {
      observer.unobserve(imageContainer.value);
    }
  });
});
</script>

<style scoped>
.perspective-container {
  perspective: 1500px;
  transform-style: preserve-3d;
}

.showcase-feature-transform {
  opacity: 0;
  transform: rotateY(-8deg) rotateX(3deg) scale(1.05) translateX(50px);
  transform-origin: center center;
  transition: none;
}

.showcase-feature-transform.reversed {
  opacity: 0;
  transform: rotateY(8deg) rotateX(3deg) scale(1.05) translateX(-50px);
}

/* Animate when visible */
.showcase-feature-transform.visible {
  animation: slideInLeft 0.8s ease-out forwards;
}

.showcase-feature-transform.reversed.visible {
  animation: slideInRight 0.8s ease-out forwards;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: rotateY(-8deg) rotateX(3deg) scale(1.05) translateX(50px);
  }
  to {
    opacity: 1;
    transform: rotateY(-8deg) rotateX(3deg) scale(1.05) translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: rotateY(8deg) rotateX(3deg) scale(1.05) translateX(-50px);
  }
  to {
    opacity: 1;
    transform: rotateY(8deg) rotateX(3deg) scale(1.05) translateX(0);
  }
}
</style>
