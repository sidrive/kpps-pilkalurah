<template>
  <div class="wrap">
    <OperationalHeader title="Presensi &amp; Antrean" subtitle="Input pemilih, kelola antrean, dan konfirmasi hadir" :name="namaPetugas" @exit="$router.push('/setup')" />

    <section class="stats-grid" aria-label="Ringkasan kehadiran">
      <article><span class="stat-icon blue">♟</span><strong>{{ totalDpt }}</strong><small>Total DPT</small></article>
      <article><span class="stat-icon green">✓</span><strong class="green-text">{{ jumlahHadir }}</strong><small>Hadir Sah</small></article>
      <article><span class="stat-icon amber">⌛</span><strong class="amber-text">{{ antreanList.length }}</strong><small>Menunggu</small></article>
    </section>

    <div class="ops-layout">
      <section class="input-pane" aria-label="Input dan validasi DPT">
        <div class="input-card">
          <div class="card-topline"><span>MASUKKAN NOMOR URUT DPT</span><strong class="buffer-badge" :class="{ full: bufferPenuh }">ANTREAN <span class="mono">{{ bufferCount }}/{{ MAX_QUEUE_BUFFER }}</span></strong></div>
          <p>Masukkan nomor urut pemilih, cocokkan data yang muncul, lalu validasi masuk.</p>
          <div class="display mono">{{ inputBuffer || '—' }}</div>
          <span v-if="staleDetik > 15" class="stale-warning">Terakhir sinkron {{ staleDetik }} detik lalu</span>
        </div>

        <div v-if="feedback" class="feedback" :class="feedback.type">
          <template v-if="feedback.type === 'success' && feedback.arrivalNo">
            <span class="arrival-label">NOMOR KEDATANGAN</span>
            <strong class="arrival-big mono">#{{ feedback.arrivalNo }}</strong>
            <span class="arrival-message">{{ feedback.message }}</span>
          </template>
          <template v-else>{{ feedback.message }}</template>
        </div>

        <section v-if="selectedVoter" class="validation-card">
          <p class="eyebrow">VALIDASI DATA PEMILIH</p>
          <h2>{{ selectedVoter.nama }}</h2>
          <div class="detail-grid">
            <span>No. DPT</span><strong class="mono">{{ selectedVoter.no_urut }}</strong>
            <span>JK / Status</span><strong>{{ selectedVoter.jenis_kelamin || '-' }} / {{ selectedVoter.status_pemilih || '-' }}</strong>
            <span>Alamat</span><strong>{{ selectedVoter.alamat || '-' }}</strong>
            <span>RT</span><strong class="mono">{{ selectedVoter.rt || '-' }}</strong>
          </div>
          <div class="validation-actions">
            <button class="btn-secondary" type="button" :disabled="isPending" @click="resetValidasi">Batal</button>
            <button class="btn-primary" type="button" :disabled="isPending || bufferPenuh" @click="validasiMasuk">Validasi Masuk</button>
          </div>
        </section>

        <div class="numpad" :class="{ muted: selectedVoter }">
          <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" class="numpad-btn" :disabled="bufferPenuh || !!selectedVoter" @click="tambahDigit(n)">{{ n }}</button>
          <button class="numpad-btn ghost" :disabled="bufferPenuh || !!selectedVoter" @click="hapusDigit">⌫</button>
          <button class="numpad-btn" :disabled="bufferPenuh || !!selectedVoter" @click="tambahDigit(0)">0</button>
          <button class="numpad-btn submit" :disabled="!inputBuffer || bufferPenuh || isPending || !!selectedVoter" @click="submit">Cari</button>
        </div>

        <p v-if="bufferPenuh" class="full-notice">Antrean penuh ({{ MAX_QUEUE_BUFFER }}/{{ MAX_QUEUE_BUFFER }}). Tunggu KPPS memproses pemilih.</p>
      </section>

      <section class="queue-pane" aria-label="Daftar antrean dan absensi">
        <div class="tabs">
          <button :class="{ active: tab === 'antrean' }" @click="tab = 'antrean'">Menunggu ({{ antreanList.length }})</button>
          <button :class="{ active: tab === 'manual' }" @click="tab = 'manual'">Belum Dicentang</button>
        </div>

        <section v-if="tab === 'antrean'" class="list">
          <h2>MENUNGGU KONFIRMASI</h2>
          <p v-if="antreanList.length === 0" class="empty">Belum ada pemilih di antrean.</p>
          <article v-for="item in antreanList" :key="item.id" class="voter-row">
            <span class="arrival-no mono">#{{ item.nomor_kedatangan || '-' }}</span>
            <span class="identity"><strong>{{ item.nama }}</strong><small>No. DPT {{ item.no_urut }} · RT {{ item.rt || '-' }} · {{ item.alamat || '-' }}</small></span>
            <span class="actions"><button class="btn-cancel" :disabled="isPending" @click="batalkan(item.no_urut)">Batal</button><button class="btn-confirm" :disabled="isPending" @click="konfirmasi(item.no_urut)">Hadir</button></span>
          </article>
        </section>

        <section v-else class="list">
          <h2>BELUM DICENTANG MANUAL</h2>
          <p class="hint">Pemilih berstatus hadir sah yang belum dicentang pada lembar DPT fisik.</p>
          <p v-if="belumCentangManual.length === 0" class="empty">Semua sudah dicentang manual.</p>
          <article v-for="item in belumCentangManual" :key="item.id" class="voter-row">
            <span class="arrival-no mono">#{{ item.nomor_kedatangan || '-' }}</span>
            <span class="identity"><strong>{{ item.nama }}</strong><small>No. DPT {{ item.no_urut }} · RT {{ item.rt || '-' }} · {{ item.alamat || '-' }}</small></span>
            <button class="btn-confirm" @click="tandaiCentangManual(item.no_urut)">Dicentang</button>
          </article>
        </section>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDpt } from '../composables/useDpt.js'
import { useDevice } from '../composables/useDevice.js'
import { MAX_QUEUE_BUFFER, STATUS_PROSES } from '../config/constants.js'
import OperationalHeader from '../components/OperationalHeader.vue'

const {
  antreanList,
  belumCentangManual,
  totalDpt,
  jumlahHadir,
  bufferCount,
  lastSyncAt,
  isPending,
  isBufferPenuh,
  tambahKeAntrean,
  cariByNoUrut,
  konfirmasiHadir,
  batalkanAntrean,
  tandaiCentangManual
} = useDpt()
const { deviceId, namaPetugas } = useDevice()
const tab = ref('antrean')
const inputBuffer = ref('')
const selectedVoter = ref(null)
const feedback = ref(null)
const now = ref(Date.now())
let tickInterval
let feedbackId = 0
onMounted(() => { tickInterval = setInterval(() => (now.value = Date.now()), 1000) })
onUnmounted(() => clearInterval(tickInterval))
const staleDetik = computed(() => lastSyncAt.value ? Math.floor((now.value - lastSyncAt.value) / 1000) : 0)
const bufferPenuh = computed(() => isBufferPenuh())
function tambahDigit(n) { if (inputBuffer.value.length >= 3) return; inputBuffer.value += String(n) }
function hapusDigit() { inputBuffer.value = inputBuffer.value.slice(0, -1) }
function tampilkanFeedback(type, message, extra = {}) {
  const id = ++feedbackId
  feedback.value = { id, type, message, ...extra }
  const duration = type === 'success' ? 8000 : 5000
  setTimeout(() => { if (feedback.value?.id === id) feedback.value = null }, duration)
}
function resetValidasi() { selectedVoter.value = null; inputBuffer.value = '' }
async function submit() {
  if (isPending.value || bufferPenuh.value || !inputBuffer.value) return
  const noUrut = Number(inputBuffer.value)
  const existing = await cariByNoUrut(noUrut)
  if (!existing) { tampilkanFeedback('error', `No. ${noUrut} tidak ditemukan di DPT`); inputBuffer.value = ''; return }
  if (existing.status_proses !== STATUS_PROSES.BELUM_HADIR) { tampilkanFeedback('error', `No. ${noUrut} sudah diproses sebelumnya`); inputBuffer.value = ''; return }
  selectedVoter.value = existing
}
async function validasiMasuk() {
  if (!selectedVoter.value || isPending.value || bufferPenuh.value) return
  const result = await tambahKeAntrean(selectedVoter.value.no_urut, deviceId, namaPetugas.value)
  if (result.success) {
    tampilkanFeedback('success', `${result.data.nama} masuk antrean`, { arrivalNo: result.data.nomor_kedatangan })
    tab.value = 'antrean'
  } else {
    tampilkanFeedback('error', `Gagal: ${result.reason}`)
  }
  resetValidasi()
}
async function konfirmasi(noUrut) {
  const result = await konfirmasiHadir(noUrut, deviceId, namaPetugas.value)
  if (!result.success) tampilkanFeedback('error', `Gagal konfirmasi: ${result.reason}`)
}
async function batalkan(noUrut) {
  const result = await batalkanAntrean(noUrut, deviceId, namaPetugas.value)
  if (!result.success) tampilkanFeedback('error', `Gagal batal: ${result.reason}`)
}
</script>

<style scoped>
.wrap { max-width:520px; margin:0 auto; padding:1.5rem 1rem 3rem; }
.ops-layout { display:grid; gap:1rem; }
.input-pane,.queue-pane { min-width:0; }
.stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:.65rem; margin-bottom:1rem; }
.stats-grid article { display:flex; flex-direction:column; align-items:center; padding:.8rem .4rem; background:#fff; border-radius:12px; box-shadow:var(--shadow-card); }
.stat-icon { display:grid; place-items:center; width:30px; height:30px; margin-bottom:.25rem; border-radius:50%; font-size:.8rem; }
.stat-icon.blue{color:var(--color-blue);background:#e9f0fb}.stat-icon.green{color:var(--color-green);background:#e4f3ed}.stat-icon.amber{color:var(--color-amber-dark);background:#fff2df}
.stats-grid strong { font-size:1.5rem; color:var(--color-navy-dark); }.stats-grid small{color:var(--color-muted);font-size:.65rem}.green-text{color:var(--color-green)!important}.amber-text{color:var(--color-amber-dark)!important}
.input-card,.validation-card { background:#fff; border-radius:var(--radius); padding:1rem; box-shadow:var(--shadow-card); margin-bottom:.9rem; }
.card-topline { display:flex; justify-content:space-between; align-items:center; gap:.75rem; color:var(--color-amber-dark); font-size:.62rem; font-weight:850; letter-spacing:.1em; }
.input-card > p { margin:.5rem 0 .9rem; color:var(--color-muted); font-size:.78rem; }
.buffer-badge { padding:.35rem .6rem; color:#fff; background:var(--color-navy); border-radius:99px; font-size:.62rem; }
.buffer-badge.full { background:var(--color-red); }
.display { display:grid; place-items:center; min-height:62px; padding:.5rem; text-align:center; font-size:2.15rem; background:var(--color-bg); border:1px solid var(--color-line); border-radius:10px; }
.stale-warning { display:block; margin-top:.45rem; color:var(--color-faint); font-size:.68rem; }
.feedback { padding:.75rem 1rem; border-radius:12px; margin-bottom:.9rem; text-align:center; font-weight:700; font-size:.82rem; }
.feedback.success { display:flex; flex-direction:column; align-items:center; gap:.18rem; padding:1rem; background:#e4f3ed; color:var(--color-green); border:2px solid rgba(38,128,93,.2); }
.feedback.error { background:#f9e7e8; color:var(--color-red); }
.arrival-label { color:var(--color-green); font-size:.65rem; font-weight:950; letter-spacing:.15em; }
.arrival-big { color:var(--color-navy-dark); font-size:3.2rem; line-height:1; font-weight:950; }
.arrival-message { color:var(--color-ink); font-size:.86rem; }
.eyebrow { margin:0 0 .4rem; color:var(--color-amber-dark); font-size:.62rem; font-weight:900; letter-spacing:.13em; }
.validation-card h2 { margin:0 0 .75rem; color:var(--color-navy-dark); font-size:1.15rem; }
.detail-grid { display:grid; grid-template-columns:auto 1fr; gap:.45rem .8rem; align-items:baseline; padding:.75rem; background:var(--color-bg); border-radius:10px; }
.detail-grid span { color:var(--color-muted); font-size:.72rem; }
.detail-grid strong { color:var(--color-ink); font-size:.82rem; }
.validation-actions { display:grid; grid-template-columns:1fr 1.4fr; gap:.6rem; margin-top:.85rem; }
.numpad { display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem; margin-bottom:1rem; }
.numpad.muted { opacity:.45; }
.numpad-btn { background:#fff; border:1px solid var(--color-line); border-radius:12px; box-shadow:0 2px 0 rgba(6,45,61,.06); font-size:1.55rem; font-weight:700; min-height:66px; }
.numpad-btn.ghost { color:var(--color-muted); }
.numpad-btn.submit { color:#fff; background:var(--color-amber); border-color:var(--color-amber-dark); font-size:1rem; }
.full-notice { margin-top:1rem; color:var(--color-red); text-align:center; font-size:.78rem; font-weight:700; }
.tabs { display:flex; gap:.4rem; padding:.25rem; margin-bottom:1rem; background:#dde7ec; border-radius:10px; }
.tabs button { flex:1; min-height:42px; color:var(--color-muted); background:transparent; font-size:.72rem; font-weight:750; }
.tabs button.active { color:#fff; background:var(--color-navy); }
.list h2 { color:var(--color-navy-dark); font-size:.65rem; letter-spacing:.12em; }
.hint,.empty { padding:1rem; color:var(--color-muted); background:#fff; border-radius:10px; text-align:center; font-size:.75rem; }
.voter-row { display:grid; grid-template-columns:48px 1fr auto; align-items:center; gap:.6rem; min-height:64px; padding:.65rem .75rem; margin-bottom:.45rem; background:#fff; border:1px solid rgba(6,45,61,.06); border-radius:11px; box-shadow:0 4px 14px rgba(6,45,61,.05); }
.arrival-no { display:grid; place-items:center; min-height:36px; color:#fff; background:var(--color-navy); border-radius:10px; font-size:.86rem; font-weight:900; }
.identity { display:flex; flex-direction:column; min-width:0; }.identity strong{font-size:.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.identity small{margin-top:.15rem;color:var(--color-muted);font-size:.62rem;line-height:1.35}
.actions{display:flex;gap:.4rem}.actions button,.voter-row>button{min-height:38px;padding:0 .72rem;font-size:.68rem;font-weight:750}.btn-cancel{color:var(--color-red);background:#fff;border:1px solid #e7b9bd}.btn-confirm{color:#fff;background:var(--color-green)}
@media (min-width:768px) and (orientation:landscape){
  .wrap{max-width:1120px;padding:1.25rem clamp(1rem,2vw,2rem) 2rem;}
  .stats-grid{max-width:720px;margin-left:auto;}
  .ops-layout{grid-template-columns:minmax(0,1fr) minmax(340px,420px);align-items:start;}
  .queue-pane{grid-column:1;grid-row:1;display:flex;flex-direction:column;max-height:calc(100vh - 10rem);}
  .input-pane{grid-column:2;position:sticky;top:1rem;}
  .tabs{flex-shrink:0;}
  .list{min-height:0;overflow:auto;padding-right:.25rem;}
  .voter-row{grid-template-columns:56px minmax(0,1fr) auto;min-height:72px;gap:.75rem;}
  .arrival-no{min-height:42px;font-size:.95rem;}
  .identity strong{font-size:.95rem;}
  .identity small{font-size:.72rem;}
  .actions button,.voter-row>button{min-height:44px;padding:0 .9rem;font-size:.76rem;}
  .display{min-height:76px;font-size:2.6rem;}
  .numpad{gap:.7rem;}
  .numpad-btn{min-height:72px;font-size:1.75rem;}
  .numpad-btn.submit{font-size:1.05rem;}
  .arrival-big{font-size:3.6rem;}
}
@media(max-width:420px){.voter-row{grid-template-columns:42px 1fr}.actions,.voter-row>button{grid-column:2;justify-self:stretch}.actions button,.voter-row>button{flex:1}}
</style>
