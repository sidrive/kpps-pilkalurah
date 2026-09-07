<template>
  <div class="display-page">
    <PublicDisplayHeader />
    <main class="content">
      <div class="heading"><p class="eyebrow">PANTAUAN LANGSUNG</p><h1>Status Kehadiran Pemilih</h1><p>Perkembangan kehadiran pemilih diperbarui otomatis.</p></div>
      <section class="attendance-card">
        <div class="donut-section" tabindex="0" :aria-label="`${hadir} dari ${total} pemilih sudah hadir, ${persenHadir} persen`" :title="`${hadir} hadir dari ${total} DPT`">
          <svg viewBox="0 0 200 200" class="donut" role="img" aria-hidden="true">
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--color-track)" stroke-width="20" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--color-green)" stroke-width="20" stroke-linecap="round" :stroke-dasharray="circumference" :stroke-dashoffset="dashOffset" transform="rotate(-90 100 100)" />
          </svg>
          <div class="donut-center"><strong>{{ persenHadir }}%</strong><span>SUDAH HADIR</span></div>
        </div>
        <div class="stats-row" aria-label="Data kehadiran">
          <article><span class="dot total-dot"/><strong>{{ total }}</strong><small>Total DPT</small></article>
          <article><span class="dot hadir-dot"/><strong>{{ hadir }}</strong><small>Sudah Hadir</small></article>
          <article><span class="dot belum-dot"/><strong>{{ belumHadir }}</strong><small>Belum Hadir</small></article>
        </div>
      </section>
      <p class="footnote"><span>●</span> Data tersinkron secara real-time</p>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { STATUS_PROSES } from '../config/constants.js'
import PublicDisplayHeader from '../components/PublicDisplayHeader.vue'

const allDpt = ref([])
const unsubscribe = onSnapshot(collection(db, 'dpt'), (snap) => { allDpt.value = snap.docs.map((d) => d.data()) })
onUnmounted(() => unsubscribe())
const total = computed(() => allDpt.value.length)
const hadir = computed(() => allDpt.value.filter((d) => d.status_proses === STATUS_PROSES.HADIR_SAH).length)
const belumHadir = computed(() => total.value - hadir.value)
const persenHadir = computed(() => total.value === 0 ? 0 : Math.round((hadir.value / total.value) * 100))
const radius = 80
const circumference = 2 * Math.PI * radius
const dashOffset = computed(() => circumference * (1 - persenHadir.value / 100))
</script>

<style scoped>
.display-page{min-height:100vh;background:var(--color-bg)}
.content{width:min(100% - 2rem,900px);margin:0 auto;padding:clamp(2rem,5vw,4rem) 0;text-align:center}
.heading{margin-bottom:1.7rem}.eyebrow{margin-bottom:.45rem;color:var(--color-amber-dark);font-size:.68rem;font-weight:900;letter-spacing:.16em}.heading h1{margin-bottom:.45rem;color:var(--color-navy-dark);font-size:clamp(1.7rem,4vw,2.5rem)}.heading>p:last-child{color:var(--color-muted);font-size:.88rem}
.attendance-card{display:grid;grid-template-columns:minmax(240px,340px) 1fr;align-items:center;gap:clamp(1.5rem,5vw,4rem);padding:clamp(1.5rem,4vw,3rem);background:#fff;border:1px solid rgba(6,45,61,.06);border-radius:18px;box-shadow:var(--shadow-card)}
.donut-section{position:relative;width:100%;max-width:320px;margin:auto;border-radius:50%}.donut{display:block;width:100%;height:auto}.donut circle{transition:stroke-dashoffset .6s ease}.donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}.donut-center strong{color:var(--color-navy-dark);font-size:clamp(2.3rem,6vw,4rem)}.donut-center span{color:var(--color-muted);font-size:.65rem;font-weight:850;letter-spacing:.12em}
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem}.stats-row article{position:relative;display:flex;flex-direction:column;padding:1.2rem .6rem;background:var(--color-bg);border-radius:12px}.stats-row strong{color:var(--color-navy-dark);font-size:clamp(1.6rem,4vw,2.5rem)}.stats-row small{color:var(--color-muted);font-size:.7rem}.dot{width:9px;height:9px;margin:0 auto .5rem;border-radius:50%}.total-dot{background:var(--color-navy)}.hadir-dot{background:var(--color-green)}.belum-dot{background:#9aa9b0}
.footnote{margin-top:1.2rem;color:var(--color-muted);font-size:.72rem}.footnote span{color:var(--color-green)}
@media(max-width:700px){.attendance-card{grid-template-columns:1fr}.stats-row{gap:.4rem}.stats-row article{padding:.85rem .35rem}}
</style>
