<template>
  <div class="display-wrap">
    <div v-if="!isFinal" class="pending">
      <h1>Hasil Belum Final</h1>
      <p>
        Status saat ini: <span class="mono">{{ config?.status_tps || '...' }}</span>.
        Layar ini akan menampilkan hasil resmi setelah Ketua KPPS mengunci
        hasil penghitungan suara.
      </p>
    </div>

    <div v-else class="final">
      <div class="badge">✓ HASIL RESMI TPS INI — DATA TERKUNCI</div>
      <h1>{{ config?.nama_tps || 'TPS' }}</h1>
      <p class="tanggal">{{ config?.tanggal_pemilihan }}</p>

      <section class="block">
        <h2>Hasil Penghitungan Suara</h2>
        <div
          v-for="(item, i) in sortedResults"
          :key="item.id"
          class="hasil-row"
          :class="{ terbanyak: i === 0 && item.count > 0 }"
        >
          <div class="hasil-label">
            <span v-if="i === 0 && item.count > 0" class="crown">★</span>
            <span class="hasil-nama">{{ item.nama }}</span>
          </div>
          <div class="hasil-bar-track">
            <div
              class="hasil-bar-fill"
              :class="{ 'bar-tidak-sah': item.id === TIDAK_SAH_ID }"
              :style="{ width: barWidth(item.count) + '%' }"
            />
          </div>
          <div class="hasil-angka">
            <span class="mono">{{ item.count }}</span>
            <span class="persen mono">({{ persenSuara(item.count) }}%)</span>
          </div>
        </div>
        <p v-if="sortedResults[0]?.count > 0" class="disclaimer">
          Suara terbanyak di TPS ini. Bukan pengumuman pemenang final —
          hasil akhir Pemilihan Lurah ditentukan lewat rekapitulasi seluruh TPS
          oleh Panitia.
        </p>
      </section>

      <section class="block stats-block">
        <h2>Rekap Kehadiran</h2>
        <div class="stats-row">
          <div class="stat">
            <span class="stat-number mono">{{ totalDpt }}</span>
            <span class="stat-label">Total DPT</span>
          </div>
          <div class="stat stat-hadir">
            <span class="stat-number mono">{{ jumlahHadir }}</span>
            <span class="stat-label">Hadir ({{ persenHadir }}%)</span>
          </div>
          <div class="stat stat-belum">
            <span class="stat-number mono">{{ jumlahBelumHadir }}</span>
            <span class="stat-label">Tidak Hadir</span>
          </div>
        </div>
      </section>

      <section class="block">
        <h2>Waktu Pelaksanaan</h2>
        <div class="waktu-row">
          <span>Pemungutan Suara</span>
          <span class="mono">{{ config?.waktu_mulai_pemungutan || '-' }} – {{ config?.waktu_selesai_pemungutan || '-' }}</span>
        </div>
        <div class="waktu-row">
          <span>Penghitungan Suara</span>
          <span class="mono">{{ config?.waktu_mulai_hitung || '-' }} – {{ config?.waktu_selesai_hitung || '-' }}</span>
        </div>
      </section>

      <div v-if="config?.daftar_saksi?.length" class="saksi-list">
        <span class="saksi-title">Disaksikan oleh:</span>
        <span>{{ config.daftar_saksi.filter(s => s.trim()).join(', ') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { useTally } from '../composables/useTally.js'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { STATUS_PROSES, STATUS_TPS, TIDAK_SAH_ID } from '../config/constants.js'

const { countsByCalonId, totalKeseluruhan } = useTally()
const { config, daftarCalon } = useTpsConfig()

const isFinal = computed(() => config.value?.status_tps === STATUS_TPS.TALLY_DONE)

// --- Rekap kehadiran ---
const allDpt = ref([])
onSnapshot(collection(db, 'dpt'), (snap) => {
  allDpt.value = snap.docs.map((d) => d.data())
})
const totalDpt = computed(() => allDpt.value.length)
const jumlahHadir = computed(
  () => allDpt.value.filter((d) => d.status_proses === STATUS_PROSES.HADIR_SAH).length
)
const jumlahBelumHadir = computed(() => totalDpt.value - jumlahHadir.value)
const persenHadir = computed(() =>
  totalDpt.value === 0 ? 0 : Math.round((jumlahHadir.value / totalDpt.value) * 100)
)

// --- Hasil suara, diurutkan dari terbanyak ---
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
function persenSuara(count) {
  return totalKeseluruhan.value === 0 ? 0 : Math.round((count / totalKeseluruhan.value) * 100)
}
</script>

<style scoped>
.display-wrap {
  min-height: 100vh;
  padding: 2.5rem clamp(1rem, 5vw, 4rem);
  background: var(--color-paper);
}

.pending {
  max-width: 480px;
  margin: 20vh auto;
  text-align: center;
  color: #6b6b66;
}
.pending h1 {
  margin-bottom: 1rem;
  color: var(--color-ink);
}

.final {
  max-width: 720px;
  margin: 0 auto;
}

.badge {
  background: var(--color-green);
  color: white;
  text-align: center;
  padding: 0.6rem;
  border-radius: var(--radius);
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  margin-bottom: 1.5rem;
}

h1 {
  text-align: center;
  font-size: 1.9rem;
}
.tanggal {
  text-align: center;
  color: #6b6b66;
  margin-bottom: 2rem;
}

.block {
  background: white;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-bottom: 1.25rem;
}
.block h2 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.hasil-row {
  display: grid;
  grid-template-columns: 140px 1fr 90px;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}
.hasil-row.terbanyak .hasil-nama {
  font-weight: 700;
  color: var(--color-green);
}
.hasil-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.crown {
  color: var(--color-amber);
}
.hasil-bar-track {
  background: #e8e4d8;
  border-radius: 6px;
  height: 22px;
  overflow: hidden;
}
.hasil-bar-fill {
  height: 100%;
  background: var(--color-navy);
  transition: width 0.6s ease;
}
.hasil-bar-fill.bar-tidak-sah {
  background: var(--color-red);
}
.hasil-angka {
  text-align: right;
  font-weight: 700;
}
.persen {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b6b66;
}

.disclaimer {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: #6b6b66;
  border-top: 1px dashed var(--color-line);
  padding-top: 0.75rem;
}

.stats-row {
  display: flex;
  justify-content: space-around;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-number {
  font-size: 1.8rem;
  font-weight: 700;
}
.stat-label {
  font-size: 0.85rem;
  color: #6b6b66;
}
.stat-hadir .stat-number { color: var(--color-green); }
.stat-belum .stat-number { color: var(--color-red); }

.waktu-row {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
}

.saksi-list {
  text-align: center;
  font-size: 0.85rem;
  color: #6b6b66;
  margin-top: 1rem;
}
.saksi-title {
  font-weight: 600;
  margin-right: 0.4rem;
}
</style>
