<template>
  <div class="min-h-screen bg-black text-white">
    <!-- Hero Section with Parallax Background -->
    <div class="relative border-b-8 border-gray-800 overflow-hidden">
      <!-- Parallax Background Image -->
      <div
        class="absolute inset-0 z-0"
        :style="{ transform: `translateY(${scrollY * 0.5}px)` }"
      >
        <img
          :src="showcaseImage"
          alt="Album calendar showcase"
          class="w-full h-full object-cover opacity-40"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black"></div>
      </div>

      <!-- Hero Content -->
      <UContainer class="relative z-10 py-32 sm:py-40">
        <div class="text-center space-y-6 max-w-3xl mx-auto">
          <h1 class="text-4xl sm:text-6xl font-black tracking-tight">
            Track every album you listen to
          </h1>
          <p class="text-xl sm:text-2xl text-gray-300">
            Automatically capture your Spotify listening history and visualize your musical journey
          </p>
          <div class="pt-6">
            <div class="inline-block scale-125">
              <LoginWithSpotifyButton />
            </div>
          </div>
        </div>
      </UContainer>
    </div>

    <!-- Feature 1: Automatic Tracking -->
    <div class="border-b-8 border-gray-800">
      <UContainer class="py-16 sm:py-24">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div class="space-y-4">
            <h2 class="text-3xl sm:text-5xl font-bold">
              Your listening history, automatically tracked
            </h2>
            <p class="text-lg sm:text-xl text-gray-400">
              Connect your Spotify account and every album you listen to is automatically logged. No manual entry, no hassle.
            </p>
          </div>
          <div class="relative">
            <div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden border border-gray-700">
              <img
                :src="showcaseImage"
                alt="Automatic tracking showcase"
                class="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </UContainer>
    </div>

    <!-- Feature 2: Calendar View -->
    <div class="border-b-8 border-gray-800">
      <UContainer class="py-16 sm:py-24">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div class="relative order-2 md:order-1">
            <div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden border border-gray-700">
              <img
                :src="showcaseImage"
                alt="Calendar view showcase"
                class="w-full h-auto"
              />
            </div>
          </div>
          <div class="space-y-4 order-1 md:order-2">
            <h2 class="text-3xl sm:text-5xl font-bold">
              See your musical journey unfold
            </h2>
            <p class="text-lg sm:text-xl text-gray-400">
              Beautiful calendar layout shows your listening history at a glance. Discover patterns in your music taste over time.
            </p>
          </div>
        </div>
      </UContainer>
    </div>

    <!-- Feature 3: Rich Insights -->
    <div class="border-b-8 border-gray-800">
      <UContainer class="py-16 sm:py-24">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div class="space-y-4">
            <h2 class="text-3xl sm:text-5xl font-bold">
              Track listening habits and metadata
            </h2>
            <p class="text-lg sm:text-xl text-gray-400">
              See if you listened in order, what time of day, and more. Manually log vinyl records and other sources too.
            </p>
          </div>
          <div class="relative">
            <div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-8 border border-gray-700">
              <div class="space-y-6">
                <div class="flex items-center gap-4">
                  <UIcon name="i-heroicons-clock" class="w-8 h-8 text-green-400 flex-shrink-0" />
                  <div>
                    <div class="font-semibold text-lg">Listen time tracking</div>
                    <div class="text-gray-400">Morning, noon, evening, or night</div>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <UIcon name="i-heroicons-list-bullet" class="w-8 h-8 text-green-400 flex-shrink-0" />
                  <div>
                    <div class="font-semibold text-lg">In-order detection</div>
                    <div class="text-gray-400">Did you listen to the full album in sequence?</div>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <UIcon name="i-heroicons-musical-note" class="w-8 h-8 text-green-400 flex-shrink-0" />
                  <div>
                    <div class="font-semibold text-lg">Multiple sources</div>
                    <div class="text-gray-400">Spotify, vinyl, or other streaming services</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </div>

    <!-- Final CTA -->
    <div class="py-20">
      <UContainer>
        <div class="text-center space-y-6">
          <h2 class="text-3xl sm:text-5xl font-bold">
            Ready to start tracking?
          </h2>
          <p class="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
            Connect your Spotify account and begin documenting your album listening journey today.
          </p>
          <div class="pt-4">
            <div class="inline-block scale-125">
              <LoginWithSpotifyButton />
            </div>
          </div>
        </div>
      </UContainer>
    </div>
  </div>
</template>

<script lang="ts" setup>
import showcaseImage from '~/assets/img/showcase.png';

// Page meta
definePageMeta({
  layout: false,
});

// Parallax scroll effect
const scrollY = ref(0);

const handleScroll = () => {
  scrollY.value = window.scrollY;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>
