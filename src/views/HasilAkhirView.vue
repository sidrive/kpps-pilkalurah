<template>
  <div class="display-page">
    <PublicDisplayHeader />
    <main class="content">
      <div v-if="!isFinal" class="pending">
        <h1>Hasil Belum Final</h1>
        <p>Status saat ini: <span class="mono">{{ config?.status_tps || '...' }}</span>. Layar ini akan menampilkan hasil resmi setelah Ketua KPPS mengunci hasil penghitungan suara.</p>
      </div>

      <template v-else>
        <div class="final-head"><span class="badge">✓ HASIL RESMI TPS INI — DATA TERKUNCI</span><h1>{{ config?.nama_tps || 'TPS' }}</h1><p class="tanggal">{{ config?.tanggal_pemilihan }}</p></div>

        <section class="chart-card" aria-label="Hasil penghitungan suara">
          <div v-if="sortedResults.length >= 2" class="legend" role="list"><span v-for="item in sortedResults" :key="item.id" class="legend-item" role="listitem"><i class="legend-dot" :style="{ background: colorFor(item) }" aria-hidden="true"></i>{{ item.nama }}</span></div>
          <div class="bars" role="img" :aria-label="ariaSummary">
            <div v-for="(item, i) in sortedResults" :key="item.id" class="bar-row" :class="{ breakthrough: i===0 && item.count>0 }" :title="`${item.nama}: ${item.count} suara (${persenSuara(item.count)}%)`">
              <div class="bar-label"><span class="bar-nama"><i class="bar-dot" :style="{ background: colorFor(item) }" aria-hidden="true"></i>{{ item.nama }}</span><span class="bar-count mono">{{ item.count }}<small> · {{ persenSuara(item.count) }}%</small></span></div>
              <div class="bar-track"><div class="bar-fill" :style="{ width: barWidth(item.count) + '%', background: colorFor(item) }" /></div>
            </div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <caption class="sr-only">Perolehan suara per calon</caption>
              <thead><tr><th scope="col">Calon</th><th scope="col" class="num">Suara</th><th scope="col" class="num">Persen</th></tr></thead>
              <tbody><tr v-for="item in sortedResults" :key="item.id"><th scope="row"><i class="legend-dot sm" :style="{ background: colorFor(item) }" aria-hidden="true"></i>{{ item.nama }}</th><td class="num mono">{{ item.count }}</td><td class="num mono">{{ persenSuara(item.count) }}%</td></tr></tbody>
            </table>
          </div>
          <p v-if="sortedResults[0]?.count > 0" class="disclaimer">Suara terbanyak di TPS ini. Bukan pengumuman pemenang final — hasil akhir Pemilihan Lurah ditentukan lewat rekapitulasi seluruh TPS oleh Panitia.</p>
        </section>

        <section class="summary-card">
          <h2>Rekap Kehadiran</h2>
          <div class="stats-row"><article><strong>{{ totalDpt }}</strong><small>Total DPT</small></article><article><strong>{{ jumlahHadir }}</strong><small>Hadir ({{ persenHadir }}%)</small></article><article><strong>{{ jumlahBelumHadir }}</strong><small>Tidak Hadir</small></article></div>
        </section>

        <section class="summary-card">
          <h2>Waktu Pelaksanaan</h2>
          <div class="waktu-row"><span>Pemungutan Suara</span><span class="mono">{{ config?.waktu_mulai_pemungutan || '-' }} – {{ config?.waktu_selesai_pemungutan || '-' }}</span></div>
          <div class="waktu-row"><span>Penghitungan Suara</span><span class="mono">{{ config?.waktu_mulai_hitung || '-' }} – {{ config?.waktu_selesai_hitung || '-' }}</span></div>
        </section>

        <p v-if="config?.daftar_saksi?.length" class="saksi"><strong>Disaksikan oleh:</strong> {{ config.daftar_saksi.filter(s => s.trim()).join(', ') }}</p>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTally } from '../composables/useTally.js'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { useDpt } from '../composables/useDpt.js'
import { STATUS_TPS, TIDAK_SAH_ID } from '../config/constants.js'
import PublicDisplayHeader from '../components/PublicDisplayHeader.vue'

const { countsByCalonId, totalKeseluruhan } = useTally()
const { config, daftarCalon } = useTpsConfig()
const { totalDpt, jumlahHadir, jumlahBelumHadir } = useDpt()
const isFinal = computed(()=> config.value?.status_tps === STATUS_TPS.TALLY_DONE)
const persenHadir = computed(()=> totalDpt.value===0?0:Math.round((jumlahHadir.value/totalDpt.value)*100))

const SERIES = ['var(--series-1)','var(--series-2)','var(--series-3)','var(--series-4)','var(--series-5)','var(--series-6)','var(--series-7)']
function colorFor(item){
  if(item.id === TIDAK_SAH_ID) return 'var(--color-red)'
  const idx = daftarCalon.value.findIndex((c)=>c.id===item.id)
  if(idx < 0) return 'var(--color-faint)'
  if(idx < SERIES.length) return SERIES[idx]
  return 'var(--color-faint)'
}
const sortedResults = computed(()=>{
  const items = daftarCalon.value.map((c)=>({ id:c.id, nama:c.nama, count: countsByCalonId.value[c.id]||0 }))
  items.push({ id:TIDAK_SAH_ID, nama:'Tidak Sah', count: countsByCalonId.value[TIDAK_SAH_ID]||0 })
  const overflow = items.length - SERIES.length - 1
  if(overflow>0){
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
function barWidth(count){ return Math.round((count/maxCount.value)*100) }
function persenSuara(count){ return totalKeseluruhan.value===0?0:Math.round((count/totalKeseluruhan.value)*100) }
const ariaSummary = computed(()=> sortedResults.value.map((i)=>`${i.nama} ${i.count} suara`).join(', '))
</script>

<style scoped>
.display-page{min-height:100vh;background:var(--color-bg)}
.content{width:min(100% - 2rem,900px);margin:0 auto;padding:clamp(1.25rem,4vw,3.5rem) 0}
.pending{max-width:520px;margin:20vh auto;color:var(--color-muted);text-align:center}.pending h1{color:var(--color-ink)}
.final-head{text-align:center;margin-bottom:1rem}.badge{display:inline-block;padding:.5rem 1rem;color:#fff;background:var(--color-green);border-radius:99px;font-size:.78rem;font-weight:900}.final-head h1{margin-top:.75rem;color:var(--color-navy-dark);font-size:1.9rem}.tanggal{color:var(--color-muted);font-size:.82rem}
.chart-card,.summary-card{padding:1.15rem;margin-bottom:1rem;background:#fff;border:1px solid rgba(6,45,61,.06);border-radius:14px;box-shadow:var(--shadow-card)}
.legend{display:flex;flex-wrap:wrap;gap:.4rem .9rem;margin-bottom:1rem;padding-bottom:.9rem;border-bottom:1px solid var(--color-line)}.legend-item{display:inline-flex;align-items:center;gap:.38rem;color:var(--color-muted);font-size:.72rem;font-weight:700}.legend-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.bars{display:flex;flex-direction:column;gap:.85rem}.bar-label{display:flex;justify-content:space-between;align-items:baseline;gap:.75rem;margin-bottom:.35rem}.bar-nama{display:inline-flex;align-items:center;gap:.4rem;color:var(--color-navy-dark);font-size:.88rem;font-weight:750}.bar-dot{width:9px;height:9px;border-radius:50%}.bar-count{color:var(--color-ink);font-size:.88rem;font-weight:800;white-space:nowrap}.bar-count small{color:var(--color-muted);font-weight:600}.bar-track{height:18px;background:var(--color-track);border-radius:4px;overflow:hidden}.bar-fill{height:100%;border-radius:0 4px 4px 0;box-shadow:inset 0 0 0 2px var(--color-surface)}.table-wrap{margin-top:1rem;overflow-x:auto}.data-table{width:100%;border-collapse:collapse;font-size:.78rem}.data-table th,.data-table td{padding:.4rem .5rem;text-align:left;border-bottom:1px solid var(--color-line)}.data-table .num{text-align:right}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.breakthrough .bar-nama{color:var(--color-green)}
.disclaimer{margin-top:1rem;color:var(--color-muted);border-top:1px dashed var(--color-line);padding-top:.75rem;font-size:.75rem}
.summary-card h2{margin-bottom:.75rem;color:var(--color-navy-dark);font-size:.95rem}.stats-row{display:flex;justify-content:space-around}.stats-row article{display:flex;flex-direction:column;align-items:center}.stats-row strong{color:var(--color-navy-dark);font-size:1.6rem}.stats-row small{color:var(--color-muted);font-size:.72rem}
.waktu-row{display:flex;justify-content:space-between;padding:.3rem 0;color:var(--color-muted);font-size:.78rem}.waktu-row span:last-child{color:var(--color-ink);font-weight:700}
.saksi{margin-top:1rem;color:var(--color-muted);text-align:center;font-size:.78rem}.saksi strong{color:var(--color-ink)}
</style>
