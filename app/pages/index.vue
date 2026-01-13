<template>
  <div class="min-h-screen bg-black text-white">
    <div class="relative border-b-8 border-gray-800 overflow-hidden min-h-screen sm:min-h-[120vh] flex items-center">
      <div
        class="absolute inset-0 z-0 perspective-hero"
        :style="{ transform: `translateY(${scrollY * 0.5}px)` }"
      >
        <img
          :src="showcaseImage"
          alt="Album calendar showcase"
          class="w-full h-full object-cover opacity-40 showcase-hero-transform"
        />
        <div class="absolute inset-0 bg-linear-to-b from-black/60 via-black/40 to-black"></div>
      </div>

      <!-- Hero Content -->
      <UContainer class="relative z-10 py-32">
        <div class="text-center space-y-6 max-w-3xl mx-auto">
          <h1 class="text-4xl sm:text-6xl font-black tracking-tight">
            Your complete album history
          </h1>
          <p class="text-xl sm:text-2xl text-gray-300">
            Build a complete archive of your album plays and watch your musical taste evolve over time.
          </p>
          <div class="pt-6">
            <div class="inline-block scale-125">
              <LoginWithSpotifyButton />
            </div>
          </div>
        </div>
      </UContainer>
    </div>

    <LandingPageFeature 
      heading="Set it and Forget it" 
      description="Once connected, the app quietly tracks every album you finish on Spotify. Your daily listens are neatly compiled with playback details — no effort required."  
      :image-src="featureTodaysListens" 
    />

    <LandingPageFeature 
      heading="Set the vibe for the days ahead" 
      description="Plan out your listening mood in advance and let the app queue up the perfect album each morning."  
      :image-src="featureTodaysAlbum"
      :reversed="true"
    />

    <LandingPageFeature 
      heading="Collect the gems from your year" 
      description="Select the song that hit hardest each day and turn your year of listening into a curated mixtape." 
      :image-src="featureSongOfTheDay" 
    />

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
import featureSongOfTheDay from '~/assets/img/feature-song-of-the-day.png';
import featureTodaysAlbum from '~/assets/img/feature-todays-album.png';
import featureTodaysListens from '~/assets/img/feature-todays-listens.png';
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

<style scoped>
.perspective-hero {
  perspective: 2000px;
  transform-style: preserve-3d;
}

.showcase-hero-transform {
  transform: rotateY(-20deg) rotateX(20deg) scale(1.5);
  transform-origin: center center;
}

@media (min-width: 768px) {
  .showcase-hero-transform {
    transform: rotateY(-20deg) rotateX(20deg) scale(1.5) translateX(-15%);
  }
}
</style>

<style>
html {
  scroll-behavior: smooth;
  overflow-x: hidden;
}

body {
  overflow-x: hidden;
}
</style>
