<template>
  <div class="wrap">
    <OperationalHeader title="Konfirmasi Kehadiran" subtitle="Verifikasi pemilih di meja registrasi" :name="namaPetugas" @exit="$router.push('/setup')" />

    <section class="stats-grid" aria-label="Ringkasan kehadiran">
      <article><span class="stat-icon blue">♟</span><strong>{{ totalDpt }}</strong><small>Total DPT</small></article>
      <article><span class="stat-icon green">✓</span><strong class="green-text">{{ jumlahHadir }}</strong><small>Hadir Sah</small></article>
      <article><span class="stat-icon amber">⌛</span><strong class="amber-text">{{ antreanList.length }}</strong><small>Menunggu</small></article>
    </section>

    <div class="tabs">
      <button :class="{ active: tab === 'antrean' }" @click="tab = 'antrean'">Menunggu ({{ antreanList.length }})</button>
      <button :class="{ active: tab === 'manual' }" @click="tab = 'manual'">Belum Dicentang</button>
    </div>

    <section v-if="tab === 'antrean'" class="list">
      <h2>MENUNGGU KONFIRMASI</h2>
      <p v-if="antreanList.length === 0" class="empty">Belum ada pemilih di antrean.</p>
      <article v-for="item in antreanList" :key="item.id" class="voter-row">
        <span class="no-urut mono">{{ item.no_urut }}</span>
        <span class="identity"><strong>{{ item.nama }}</strong><small>RT {{ item.rt || '-' }}/RW {{ item.rw || '-' }}</small></span>
        <span class="actions"><button class="btn-cancel" :disabled="isPending" @click="batalkan(item.no_urut)">Batal</button><button class="btn-confirm" :disabled="isPending" @click="konfirmasi(item.no_urut)">Hadir</button></span>
      </article>
    </section>

    <section v-else class="list">
      <h2>BELUM DICENTANG MANUAL</h2>
      <p class="hint">Pemilih berstatus hadir sah yang belum dicentang pada lembar DPT fisik.</p>
      <p v-if="belumCentangManual.length === 0" class="empty">Semua sudah dicentang manual.</p>
      <article v-for="item in belumCentangManual" :key="item.id" class="voter-row">
        <span class="no-urut mono">{{ item.no_urut }}</span>
        <span class="identity"><strong>{{ item.nama }}</strong><small>RT {{ item.rt || '-' }}/RW {{ item.rw || '-' }}</small></span>
        <button class="btn-confirm" @click="tandaiCentangManual(item.no_urut)">Dicentang</button>
      </article>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { useDpt } from '../composables/useDpt.js'
import { useDevice } from '../composables/useDevice.js'
import { STATUS_PROSES } from '../config/constants.js'
import OperationalHeader from '../components/OperationalHeader.vue'

const { antreanList, isPending, konfirmasiHadir, batalkanAntrean } = useDpt()
const { deviceId, namaPetugas } = useDevice()
const tab = ref('antrean')
const belumCentangManual = ref([])
const allDpt = ref([])
const totalDpt = computed(() => allDpt.value.length)
const jumlahHadir = computed(() => allDpt.value.filter((d) => d.status_proses === STATUS_PROSES.HADIR_SAH).length)
let unsubscribeManual
let unsubscribeAll
onMounted(() => {
  unsubscribeManual = onSnapshot(query(collection(db, 'dpt'), where('status_proses', '==', STATUS_PROSES.HADIR_SAH), where('status_centang_manual', '==', false)), (snap) => { belumCentangManual.value = snap.docs.map((d) => ({ id:d.id, ...d.data() })) })
  unsubscribeAll = onSnapshot(collection(db, 'dpt'), (snap) => { allDpt.value = snap.docs.map((d) => d.data()) })
})
onUnmounted(() => { unsubscribeManual?.(); unsubscribeAll?.() })
async function konfirmasi(noUrut) { const result = await konfirmasiHadir(noUrut, deviceId, namaPetugas.value); if (!result.success) alert(`Gagal konfirmasi: ${result.reason}`) }
async function batalkan(noUrut) { const result = await batalkanAntrean(noUrut, deviceId, namaPetugas.value); if (!result.success) alert(`Gagal batal: ${result.reason}`) }
async function tandaiCentangManual(noUrut) { await updateDoc(doc(db, 'dpt', String(noUrut)), { status_centang_manual:true }) }
</script>

<style scoped>
.wrap { max-width:520px; margin:0 auto; padding:1.5rem 1rem 3rem; }
.stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:.65rem; margin-bottom:1rem; }
.stats-grid article { display:flex; flex-direction:column; align-items:center; padding:.8rem .4rem; background:#fff; border-radius:12px; box-shadow:var(--shadow-card); }
.stat-icon { display:grid; place-items:center; width:30px; height:30px; margin-bottom:.25rem; border-radius:50%; font-size:.8rem; }
.stat-icon.blue{color:var(--color-blue);background:#e9f0fb}.stat-icon.green{color:var(--color-green);background:#e4f3ed}.stat-icon.amber{color:var(--color-amber-dark);background:#fff2df}
.stats-grid strong { font-size:1.5rem; color:var(--color-navy-dark); }.stats-grid small{color:var(--color-muted);font-size:.65rem}.green-text{color:var(--color-green)!important}.amber-text{color:var(--color-amber-dark)!important}
.tabs { display:flex; gap:.4rem; padding:.25rem; margin-bottom:1rem; background:#dde7ec; border-radius:10px; }
.tabs button { flex:1; min-height:42px; color:var(--color-muted); background:transparent; font-size:.72rem; font-weight:750; }
.tabs button.active { color:#fff; background:var(--color-navy); }
.list h2 { color:var(--color-navy-dark); font-size:.65rem; letter-spacing:.12em; }
.hint,.empty { padding:1rem; color:var(--color-muted); background:#fff; border-radius:10px; text-align:center; font-size:.75rem; }
.voter-row { display:grid; grid-template-columns:38px 1fr auto; align-items:center; gap:.6rem; min-height:64px; padding:.65rem .75rem; margin-bottom:.45rem; background:#fff; border:1px solid rgba(6,45,61,.06); border-radius:11px; box-shadow:0 4px 14px rgba(6,45,61,.05); }
.no-urut { color:var(--color-navy); font-size:1rem; font-weight:850; }
.identity { display:flex; flex-direction:column; min-width:0; }.identity strong{font-size:.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.identity small{margin-top:.15rem;color:var(--color-muted);font-size:.62rem}
.actions{display:flex;gap:.4rem}.actions button,.voter-row>button{min-height:38px;padding:0 .72rem;font-size:.68rem;font-weight:750}.btn-cancel{color:var(--color-red);background:#fff;border:1px solid #e7b9bd}.btn-confirm{color:#fff;background:var(--color-green)}
@media(max-width:420px){.voter-row{grid-template-columns:34px 1fr}.actions,.voter-row>button{grid-column:2;justify-self:stretch}.actions button,.voter-row>button{flex:1}}
</style>
