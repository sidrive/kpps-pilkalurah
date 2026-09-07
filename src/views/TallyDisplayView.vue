<template>
  <div class="display-page">
    <PublicDisplayHeader />
    <main class="content">
      <div class="heading"><p class="eyebrow">PANTAUAN LANGSUNG</p><h1>Penghitungan Suara</h1><p>Suara diurutkan dari terbanyak — update otomatis secara real-time.</p></div>

      <section class="chart-card" aria-label="Perolehan suara per calon">
        <div v-if="sortedResults.length >= 2" class="legend" role="list">
          <span v-for="item in sortedResults" :key="item.id" class="legend-item" role="listitem"><i class="legend-dot" :style="{ background: colorFor(item) }" aria-hidden="true"></i>{{ item.nama }}</span>
        </div>

        <div class="bars" role="img" :aria-label="ariaSummary">
          <div v-for="item in sortedResults" :key="item.id" class="bar-row" :title="`${item.nama}: ${item.count} suara (${persen(item.count)}%)`">
            <div class="bar-label">
              <span class="bar-nama"><i class="bar-dot" :style="{ background: colorFor(item) }" aria-hidden="true"></i>{{ item.nama }}</span>
              <span class="bar-count mono">{{ item.count }}<small> · {{ persen(item.count) }}%</small></span>
            </div>
            <div class="bar-track"><div class="bar-fill" :style="{ width: barWidth(item.count) + '%', background: colorFor(item) }" /></div>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <caption class="sr-only">Perolehan suara per calon</caption>
            <thead><tr><th scope="col">Calon</th><th scope="col" class="num">Suara</th><th scope="col" class="num">Persen</th></tr></thead>
            <tbody><tr v-for="item in sortedResults" :key="item.id"><th scope="row"><i class="legend-dot sm" :style="{ background: colorFor(item) }" aria-hidden="true"></i>{{ item.nama }}</th><td class="num mono">{{ item.count }}</td><td class="num mono">{{ persen(item.count) }}%</td></tr></tbody>
          </table>
        </div>
      </section>

      <section class="progress-card" aria-label="Progres penghitungan">
        <div class="progress-head"><span>Suara Terhitung</span><span class="mono">{{ totalKeseluruhan }} / {{ jumlahHadir }}</span></div>
        <div class="progress-track" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" :style="{ width: progressPercent + '%' }" /></div>
        <span class="progress-meta mono">{{ progressPercent }}% dari pemilih hadir</span>
      </section>

      <p class="footnote"><span>●</span> Data tersinkron secara real-time</p>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { useTally } from '../composables/useTally.js'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { STATUS_PROSES, TIDAK_SAH_ID } from '../config/constants.js'
import PublicDisplayHeader from '../components/PublicDisplayHeader.vue'

const { countsByCalonId, totalKeseluruhan } = useTally()
const { daftarCalon } = useTpsConfig()
const jumlahHadir = ref(0)
const unsubHadir = onSnapshot(query(collection(db, 'dpt'), where('status_proses', '==', STATUS_PROSES.HADIR_SAH)), (snap) => (jumlahHadir.value = snap.docs.length))
onUnmounted(() => unsubHadir())

const SERIES = ['var(--series-1)','var(--series-2)','var(--series-3)','var(--series-4)','var(--series-5)','var(--series-6)','var(--series-7)']
function colorFor(item){
  if(item.id === TIDAK_SAH_ID) return 'var(--color-red)'
  const idx = daftarCalon.value.findIndex((c)=>c.id===item.id)
  if(idx < 0) return 'var(--color-faint)'
  if(idx < SERIES.length) return SERIES[idx]
  return 'var(--color-faint)'
}

const sortedResults = computed(() => {
  const items = daftarCalon.value.map((c)=>({ id:c.id, nama:c.nama, count: countsByCalonId.value[c.id]||0 }))
  items.push({ id:TIDAK_SAH_ID, nama:'Tidak Sah', count: countsByCalonId.value[TIDAK_SAH_ID]||0 })
  const overflow = items.length - SERIES.length - 1
  if(overflow > 0){
    const head = items.slice(0, SERIES.length)
    const tail = items.slice(SERIES.length, -1)
    const lainCount = tail.reduce((s,x)=>s+x.count,0)
    head.push({ id:'__lainnya', nama:`Lainnya (${tail.length})`, count: lainCount })
    head.push(items[items.length-1])
    return head.sort((a,b)=>b.count-a.count)
  }
  return items.sort((a,b)=>b.count-a.count)
})

const maxCount = computed(()=> Math.max(1, ...sortedResults.value.map((i)=>i.count)))
function barWidth(count){ return Math.round((count / maxCount.value)*100) }
function persen(count){ return totalKeseluruhan.value===0?0:Math.round((count/totalKeseluruhan.value)*100) }
const progressPercent = computed(()=> jumlahHadir.value===0?0:Math.min(100, Math.round((totalKeseluruhan.value/jumlahHadir.value)*100)))
const ariaSummary = computed(()=> sortedResults.value.map((i)=>`${i.nama} ${i.count} suara`).join(', '))
</script>

<style scoped>
.display-page{min-height:100vh;background:var(--color-bg)}
.content{width:min(100% - 2rem, 900px);margin:0 auto;padding:clamp(2rem,5vw,4rem) 0}
.heading{text-align:center;margin-bottom:1.25rem}.eyebrow{margin-bottom:.4rem;color:var(--color-amber-dark);font-size:.68rem;font-weight:900;letter-spacing:.16em}.heading h1{margin-bottom:.4rem;color:var(--color-navy-dark);font-size:clamp(1.7rem,4vw,2.5rem)}.heading>p:last-child{color:var(--color-muted);font-size:.85rem}
.chart-card{padding:1.25rem;background:#fff;border:1px solid rgba(6,45,61,.06);border-radius:18px;box-shadow:var(--shadow-card)}
.legend{display:flex;flex-wrap:wrap;gap:.4rem .9rem;margin-bottom:1rem;padding-bottom:.9rem;border-bottom:1px solid var(--color-line)}.legend-item{display:inline-flex;align-items:center;gap:.38rem;color:var(--color-muted);font-size:.72rem;font-weight:700}.legend-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.bars{display:flex;flex-direction:column;gap:.85rem}
.bar-label{display:flex;justify-content:space-between;align-items:baseline;gap:.75rem;margin-bottom:.35rem}.bar-nama{display:inline-flex;align-items:center;gap:.4rem;color:var(--color-navy-dark);font-size:.88rem;font-weight:750}.bar-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}.bar-count{color:var(--color-ink);font-size:.88rem;font-weight:800;white-space:nowrap}.bar-count small{color:var(--color-muted);font-weight:600}
.bar-track{height:18px;background:var(--color-track);border-radius:4px;overflow:hidden}.bar-fill{height:100%;border-radius:0 4px 4px 0;transition:width .6s ease;box-shadow:inset 0 0 0 2px var(--color-surface)}
.table-wrap{margin-top:1rem;overflow-x:auto}.data-table{width:100%;border-collapse:collapse;font-size:.78rem}.data-table th,.data-table td{padding:.4rem .5rem;text-align:left;border-bottom:1px solid var(--color-line)}.data-table .num{text-align:right}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.progress-card{margin-top:1rem;padding:1rem;background:#fff;border:1px solid rgba(6,45,61,.06);border-radius:14px;box-shadow:var(--shadow-card)}
.progress-head{display:flex;justify-content:space-between;color:var(--color-navy-dark);font-size:.78rem;font-weight:750;margin-bottom:.5rem}
.progress-track{height:14px;background:var(--color-track);border-radius:999px;overflow:hidden}.progress-fill{height:100%;background:var(--color-amber);border-radius:999px;transition:width .6s ease}
.progress-meta{display:block;margin-top:.4rem;color:var(--color-muted);font-size:.7rem}
.footnote{margin-top:1rem;color:var(--color-muted);text-align:center;font-size:.72rem}.footnote span{color:var(--color-green)}
</style>
