<template>
  <div class="app-shell" :class="{ 'has-floating-sponsor': showSupportLogo }">
    <router-view />
  </div>

  <FloatingSponsor
    v-if="showSupportLogo"
    :logo="zknetLogo"
    sponsor-label="Supported by"
    promo-text="Pasang internet Murah, klik disini"
    href="https://zknet.my.id/"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FloatingSponsor from './components/ui/FloatingSponsor.vue'
import zknetLogo from './assets/zknet-logo.webp'

const route = useRoute()
const showSupportLogo = computed(() => route.name !== 'admin')
</script>

<style scoped>
@media (max-width: 640px) {
  .has-floating-sponsor { padding-bottom: 5rem; }
}
</style>
