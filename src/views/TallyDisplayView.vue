<template>
  <div class="display-wrap">
    <h1>Penghitungan Suara</h1>

    <div class="bars">
      <div v-for="item in sortedResults" :key="item.id" class="bar-row">
        <div class="bar-label">
          <span class="bar-nama">{{ item.nama }}</span>
          <span class="bar-count mono">{{ item.count }}</span>
        </div>
        <div class="bar-track">
          <div
            class="bar-fill"
            :class="{ 'bar-tidak-sah': item.id === TIDAK_SAH_ID }"
            :style="{ width: barWidth(item.count) + '%' }"
          />
        </div>
      </div>
    </div>

    <div class="progress-section">
      <div class="progress-label">
        <span>Suara Terhitung</span>
        <span class="mono">{{ totalKeseluruhan }} / {{ jumlahHadir }}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
      </div>
    </div>

    <p class="footnote">Update otomatis secara real-time</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { useTally } from '../composables/useTally.js'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { STATUS_PROSES, TIDAK_SAH_ID } from '../config/constants.js'

const { countsByCalonId, totalKeseluruhan } = useTally()
const { daftarCalon } = useTpsConfig()

const jumlahHadir = ref(0)
onSnapshot(
  query(collection(db, 'dpt'), where('status_proses', '==', STATUS_PROSES.HADIR_SAH)),
  (snap) => (jumlahHadir.value = snap.docs.length)
)

// Diurutkan dari suara terbanyak ke tersedikit -- gaya "quick count" TV,
// supaya publik/saksi langsung lihat perbandingan tanpa perlu menghitung
// sendiri dari angka mentah.
const sortedResults = computed(() => {
  const items = daftarCalon.value.map((c) => ({
    id: c.id,
    nama: c.nama,
    count: countsByCalonId.value[c.id] || 0
  }))
  items.push({
    id: TIDAK_SAH_ID,
    nama: 'Tidak Sah',
    count: countsByCalonId.value[TIDAK_SAH_ID] || 0
  })
  return items.sort((a, b) => b.count - a.count)
})

const maxCount = computed(() => Math.max(1, ...sortedResults.value.map((i) => i.count)))
function barWidth(count) {
  return Math.round((count / maxCount.value) * 100)
}

const progressPercent = computed(() =>
  jumlahHadir.value === 0 ? 0 : Math.min(100, Math.round((totalKeseluruhan.value / jumlahHadir.value) * 100))
)
</script>

<style scoped>
.display-wrap {
  min-height: 100vh;
  padding: 2.5rem clamp(1rem, 5vw, 4rem);
  background: var(--color-paper);
}

h1 {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2.5rem;
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 720px;
  margin: 0 auto 2.5rem;
}

.bar-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.bar-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.bar-nama {
  font-weight: 700;
  font-size: 1.15rem;
}
.bar-count {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-navy);
}

.bar-track {
  background: #e8e4d8;
  border-radius: 8px;
  height: 32px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--color-navy);
  border-radius: 8px;
  transition: width 0.6s ease;
}
.bar-fill.bar-tidak-sah {
  background: var(--color-red);
}

.progress-section {
  max-width: 720px;
  margin: 0 auto;
  border-top: 1px solid var(--color-line);
  padding-top: 1.5rem;
}
.progress-label {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.progress-track {
  background: #e8e4d8;
  border-radius: 8px;
  height: 20px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--color-amber);
  transition: width 0.6s ease;
}

.footnote {
  text-align: center;
  margin-top: 2.5rem;
  color: #a09a8a;
  font-size: 0.85rem;
}
</style>
