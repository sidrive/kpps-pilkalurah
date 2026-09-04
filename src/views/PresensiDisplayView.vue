<template>
  <div class="display-wrap">
    <h1>Status Kehadiran Pemilih</h1>

    <div class="donut-section">
      <svg viewBox="0 0 200 200" class="donut">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#e8e4d8" stroke-width="28" />
        <circle
          cx="100" cy="100" r="80" fill="none"
          stroke="#1f7a4d" stroke-width="28"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          transform="rotate(-90 100 100)"
        />
      </svg>
      <div class="donut-center">
        <span class="donut-percent mono">{{ persenHadir }}%</span>
        <span class="donut-label">Hadir</span>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat">
        <span class="stat-number mono">{{ total }}</span>
        <span class="stat-label">Total DPT</span>
      </div>
      <div class="stat stat-hadir">
        <span class="stat-number mono">{{ hadir }}</span>
        <span class="stat-label">Sudah Hadir</span>
      </div>
      <div class="stat stat-belum">
        <span class="stat-number mono">{{ belumHadir }}</span>
        <span class="stat-label">Belum Hadir</span>
      </div>
    </div>

    <p class="footnote">Update otomatis secara real-time</p>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { STATUS_PROSES } from '../config/constants.js'

const allDpt = ref([])

const unsubscribe = onSnapshot(collection(db, 'dpt'), (snap) => {
  allDpt.value = snap.docs.map((d) => d.data())
})
onUnmounted(() => unsubscribe())

const total = computed(() => allDpt.value.length)
const hadir = computed(
  () => allDpt.value.filter((d) => d.status_proses === STATUS_PROSES.HADIR_SAH).length
)
const belumHadir = computed(() => total.value - hadir.value)
const persenHadir = computed(() =>
  total.value === 0 ? 0 : Math.round((hadir.value / total.value) * 100)
)

const radius = 80
const circumference = 2 * Math.PI * radius
const dashOffset = computed(() => circumference * (1 - persenHadir.value / 100))
</script>

<style scoped>
.display-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--color-paper);
  text-align: center;
}

h1 {
  font-size: 2rem;
  margin-bottom: 2rem;
}

.donut-section {
  position: relative;
  width: min(60vw, 420px);
  margin-bottom: 2.5rem;
}
.donut {
  width: 100%;
  height: auto;
  transition: stroke-dashoffset 0.6s ease;
}
.donut circle {
  transition: stroke-dashoffset 0.6s ease;
}
.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.donut-percent {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 700;
  color: var(--color-green);
}
.donut-label {
  font-size: 1.2rem;
  color: #6b6b66;
}

.stats-row {
  display: flex;
  gap: clamp(1rem, 4vw, 3rem);
}
.stat {
  display: flex;
  flex-direction: column;
}
.stat-number {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 700;
}
.stat-label {
  font-size: 1rem;
  color: #6b6b66;
}
.stat-hadir .stat-number { color: var(--color-green); }
.stat-belum .stat-number { color: var(--color-red); }

.footnote {
  margin-top: 2.5rem;
  color: #a09a8a;
  font-size: 0.85rem;
}
</style>
