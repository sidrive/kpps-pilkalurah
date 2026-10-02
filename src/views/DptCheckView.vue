<template>
  <main class="dpt-page">
    <PublicDisplayHeader />

    <section class="dpt-wrap">
      <router-link to="/" class="back-link">← Kembali ke beranda</router-link>

      <div class="search-card">
        <div class="search-head">
          <span class="search-mark">⌕</span>
          <div>
            <p class="eyebrow">CEK DATA PEMILIH</p>
            <h1>Cek Daftar DPT</h1>
            <p>Cari nama atau nomor DPT untuk memastikan data pemilih terdaftar di TPS.</p>
          </div>
        </div>

        <div class="filters">
          <label class="search-field">
            <span>Nama atau nomor DPT</span>
            <input v-model.trim="query" class="input-control" type="search" inputmode="search" placeholder="Contoh: TEKAD atau 123" autocomplete="off">
          </label>
          <label class="rt-field">
            <span>Filter RT</span>
            <select v-model="selectedRt" class="input-control">
              <option value="">Semua RT</option>
              <option v-for="rt in rtOptions" :key="rt" :value="rt">{{ formatRt(rt) }}</option>
            </select>
          </label>
        </div>
      </div>

      <section class="result-section" aria-label="Hasil pencarian DPT">
        <div class="result-head">
          <h2>Hasil pencarian</h2>
          <p aria-live="polite">{{ resultSummary }}</p>
        </div>

        <div v-if="hasSearch && filteredVoters.length" class="result-grid">
          <article v-for="voter in filteredVoters" :key="voter.no_urut" class="result-card">
            <div class="dpt-number mono">No. DPT {{ voter.no_urut }}</div>
            <strong>{{ voter.nama }}</strong>
            <span>{{ formatRt(voter.rt) }} · TPS {{ voter.tps }}</span>
          </article>
        </div>

        <div v-else class="empty-state">
          <strong>{{ hasSearch ? 'Data tidak ditemukan' : 'Mulai cari data DPT' }}</strong>
          <span>{{ hasSearch ? 'Periksa kembali ejaan nama, nomor DPT, atau filter RT yang dipilih.' : 'Masukkan nama atau nomor DPT, atau pilih RT untuk mulai mencari.' }}</span>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import PublicDisplayHeader from '../components/PublicDisplayHeader.vue'
import { useVoterMaster } from '../composables/useVoterMaster.js'

const { voters, totalDpt } = useVoterMaster()
const query = ref('')
const selectedRt = ref('')

const normalizedQuery = computed(() => query.value.trim().toLowerCase().replace(/\s+/g, ' '))
const hasSearch = computed(() => Boolean(normalizedQuery.value || selectedRt.value))
const rtOptions = computed(() => [...new Set(voters.map((voter) => voter.rt).filter(Boolean))].sort((a, b) => Number(a) - Number(b)))

const filteredVoters = computed(() => {
  if (!hasSearch.value) return []

  const queryText = normalizedQuery.value
  const isNumericQuery = /^\d+$/.test(queryText)

  return voters
    .filter((voter) => !selectedRt.value || voter.rt === selectedRt.value)
    .filter((voter) => {
      if (!queryText) return true
      if (isNumericQuery) return Number(voter.no_urut) === Number(queryText)
      return voter.nama.toLowerCase().includes(queryText)
    })
    .sort((a, b) => Number(a.no_urut) - Number(b.no_urut))
})

const resultSummary = computed(() => {
  if (!hasSearch.value) return `${totalDpt} data DPT tersedia`
  if (filteredVoters.value.length === 0) return 'Tidak ada data yang cocok'
  return `${filteredVoters.value.length} data ditemukan`
})

function formatRt(rt) {
  const normalized = String(rt || '').replace(/^0+/, '')
  return normalized ? `RT ${normalized.padStart(2, '0')}` : 'RT --'
}
</script>

<style scoped>
.dpt-page { min-height:100vh; background:linear-gradient(180deg,#eef4f7 0%,#f7fafb 100%); }
.dpt-wrap { width:min(100% - 2rem,960px); margin:0 auto; padding:1.5rem 0 3rem; }
.back-link { display:inline-flex; align-items:center; min-height:40px; margin-bottom:.9rem; color:var(--color-navy); text-decoration:none; font-size:.78rem; font-weight:800; }
.search-card { padding:1.3rem; border:1px solid rgba(6,45,61,.07); border-radius:22px; background:#fff; box-shadow:var(--shadow-card); }
.search-head { display:grid; grid-template-columns:auto 1fr; gap:1rem; align-items:start; margin-bottom:1.15rem; }
.search-mark { display:grid; place-items:center; width:52px; height:52px; border-radius:16px; color:var(--color-navy); background:var(--color-navy-soft); font-size:1.35rem; font-weight:900; }
.eyebrow { margin:0 0 .25rem; color:var(--color-amber-dark); font-size:.66rem; font-weight:900; letter-spacing:.14em; }
h1 { margin:0 0 .35rem; color:var(--color-navy-dark); font-size:clamp(1.7rem,4vw,2.8rem); letter-spacing:-.045em; line-height:1; }
.search-head p:last-child { max-width:620px; margin:0; color:var(--color-muted); font-size:.9rem; line-height:1.55; }
.filters { display:grid; grid-template-columns:minmax(0,1fr) minmax(180px,240px); gap:.85rem; align-items:end; }
.filters label { display:flex; flex-direction:column; gap:.35rem; color:var(--color-navy-dark); font-size:.75rem; font-weight:800; }
select.input-control { appearance:none; background:#fff; }
.result-section { margin-top:1rem; }
.result-head { display:flex; justify-content:space-between; align-items:end; gap:1rem; margin-bottom:.8rem; }
.result-head h2 { margin:0; color:var(--color-navy-dark); font-size:1.05rem; }
.result-head p { margin:0; color:var(--color-muted); font-size:.78rem; font-weight:700; }
.result-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.8rem; }
.result-card { padding:1rem; border:1px solid rgba(6,45,61,.07); border-radius:18px; background:#fff; box-shadow:0 10px 22px rgba(6,45,61,.06); }
.dpt-number { display:inline-flex; margin-bottom:.65rem; padding:.34rem .55rem; border-radius:999px; color:var(--color-navy); background:var(--color-navy-soft); font-size:.7rem; font-weight:850; }
.result-card strong { display:block; color:var(--color-navy-dark); font-size:1rem; line-height:1.25; text-transform:uppercase; }
.result-card span { display:block; margin-top:.38rem; color:var(--color-muted); font-size:.82rem; font-weight:700; }
.empty-state { display:grid; place-items:center; min-height:220px; padding:1.3rem; border:1px dashed rgba(6,45,61,.18); border-radius:20px; color:var(--color-muted); background:rgba(255,255,255,.72); text-align:center; }
.empty-state strong { display:block; margin-bottom:.35rem; color:var(--color-navy-dark); font-size:1rem; }
.empty-state span { max-width:420px; font-size:.85rem; line-height:1.55; }
@media (max-width:720px) {
  .dpt-wrap { width:min(100% - 1.1rem,960px); padding:1rem 0 2rem; }
  .search-card { padding:1rem; border-radius:19px; }
  .search-head { grid-template-columns:1fr; gap:.75rem; }
  .search-mark { width:46px; height:46px; border-radius:14px; }
  .filters, .result-grid { grid-template-columns:1fr; }
  .result-head { align-items:flex-start; flex-direction:column; gap:.25rem; }
  .result-card { padding:.9rem; }
}
</style>
