<template>
  <header class="operational-header">
    <div class="avatar mono">{{ initials }}</div>
    <div class="heading">
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
    </div>
    <button v-if="showExit" class="exit-button" type="button" @click="$emit('exit')">Keluar</button>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  name: { type: String, default: '' },
  showExit: { type: Boolean, default: true }
})

defineEmits(['exit'])

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'KP'
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
})
</script>

<style scoped>
.operational-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  min-height: 74px;
  padding: 0.8rem 1rem;
  margin-bottom: 1rem;
  color: white;
  background: var(--color-navy-dark);
  border-radius: var(--radius);
  box-shadow: var(--shadow-header);
}
.avatar {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: var(--color-amber);
  border: 2px solid var(--color-amber);
  border-radius: 50%;
  font-size: 0.8rem;
  font-weight: 800;
}
.heading { min-width: 0; }
h1 { margin: 0; font-size: 1rem; line-height: 1.2; }
p { margin: 0.18rem 0 0; color: #b9cbd3; font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.exit-button {
  min-height: 36px;
  padding: 0 0.8rem;
  color: #c5d3d9;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  font-size: 0.75rem;
}
@media (max-width: 380px) {
  .operational-header { grid-template-columns: auto 1fr; }
  .exit-button { grid-column: 1 / -1; width: 100%; }
}
</style>
