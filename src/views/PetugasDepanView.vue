<template>
  <div class="wrap">
    <OperationalHeader title="Petugas Depan" subtitle="Validasi pemilih & beri nomor kedatangan" :name="namaPetugas" @exit="$router.push('/setup')" />

    <div class="input-card">
      <div class="card-topline"><span>MASUKKAN NOMOR URUT DPT</span><strong class="buffer-badge" :class="{ full: bufferPenuh }">ANTREAN <span class="mono">{{ bufferCount }}/{{ MAX_QUEUE_BUFFER }}</span></strong></div>
      <p>Masukkan nomor urut pemilih dari surat undangan, lalu cocokkan data yang muncul sebelum masuk antrean.</p>
      <div class="display mono">{{ inputBuffer || '—' }}</div>
      <span v-if="staleDetik > 15" class="stale-warning">Terakhir sinkron {{ staleDetik }} detik lalu</span>
    </div>

    <div v-if="feedback" class="feedback" :class="feedback.type">{{ feedback.message }}</div>

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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDpt } from '../composables/useDpt.js'
import OperationalHeader from '../components/OperationalHeader.vue'
import { useDevice } from '../composables/useDevice.js'
import { MAX_QUEUE_BUFFER, STATUS_PROSES } from '../config/constants.js'

const { bufferCount, lastSyncAt, isPending, isBufferPenuh, tambahKeAntrean, cariByNoUrut } = useDpt()
const { deviceId, namaPetugas } = useDevice()

const inputBuffer = ref('')
const selectedVoter = ref(null)
const feedback = ref(null)
const now = ref(Date.now())
let tickInterval
onMounted(() => { tickInterval = setInterval(() => (now.value = Date.now()), 1000) })
onUnmounted(() => clearInterval(tickInterval))
const staleDetik = computed(() => lastSyncAt.value ? Math.floor((now.value - lastSyncAt.value) / 1000) : 0)
const bufferPenuh = computed(() => isBufferPenuh())
function tambahDigit(n) { if (inputBuffer.value.length >= 3) return; inputBuffer.value += String(n) }
function hapusDigit() { inputBuffer.value = inputBuffer.value.slice(0, -1) }
function tampilkanFeedback(type, message) { feedback.value = { type, message }; setTimeout(() => { if (feedback.value?.message === message) feedback.value = null }, 3000) }
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
  if (result.success) tampilkanFeedback('success', `${result.data.nama} masuk antrean. Nomor kedatangan: ${result.data.nomor_kedatangan}`)
  else tampilkanFeedback('error', `Gagal: ${result.reason}`)
  resetValidasi()
}
</script>

<style scoped>
.wrap { max-width: 520px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
.input-card,.validation-card { background: #fff; border-radius: var(--radius); padding: 1rem; box-shadow: var(--shadow-card); margin-bottom: .9rem; }
.card-topline { display:flex; justify-content:space-between; align-items:center; gap:.75rem; color:var(--color-amber-dark); font-size:.62rem; font-weight:850; letter-spacing:.1em; }
.input-card > p { margin:.5rem 0 .9rem; color:var(--color-muted); font-size:.78rem; }
.buffer-badge { padding:.35rem .6rem; color:#fff; background:var(--color-navy); border-radius:99px; font-size:.62rem; }
.buffer-badge.full { background:var(--color-red); }
.display { display:grid; place-items:center; min-height:62px; padding:.5rem; text-align:center; font-size:2.15rem; background:var(--color-bg); border:1px solid var(--color-line); border-radius:10px; }
.stale-warning { display:block; margin-top:.45rem; color:var(--color-faint); font-size:.68rem; }
.feedback { padding:.75rem 1rem; border-radius:10px; margin-bottom:.9rem; text-align:center; font-weight:700; font-size:.82rem; }
.feedback.success { background:#e4f3ed; color:var(--color-green); }
.feedback.error { background:#f9e7e8; color:var(--color-red); }
.eyebrow { margin:0 0 .4rem; color:var(--color-amber-dark); font-size:.62rem; font-weight:900; letter-spacing:.13em; }
.validation-card h2 { margin:0 0 .75rem; color:var(--color-navy-dark); font-size:1.15rem; }
.detail-grid { display:grid; grid-template-columns:auto 1fr; gap:.45rem .8rem; align-items:baseline; padding:.75rem; background:var(--color-bg); border-radius:10px; }
.detail-grid span { color:var(--color-muted); font-size:.72rem; }
.detail-grid strong { color:var(--color-ink); font-size:.82rem; }
.validation-actions { display:grid; grid-template-columns:1fr 1.4fr; gap:.6rem; margin-top:.85rem; }
.numpad { display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem; }
.numpad.muted { opacity:.45; }
.numpad-btn { background:#fff; border:1px solid var(--color-line); border-radius:12px; box-shadow:0 2px 0 rgba(6,45,61,.06); font-size:1.55rem; font-weight:700; min-height:66px; }
.numpad-btn.ghost { color:var(--color-muted); }
.numpad-btn.submit { color:#fff; background:var(--color-amber); border-color:var(--color-amber-dark); font-size:1rem; }
.full-notice { margin-top:1rem; color:var(--color-red); text-align:center; font-size:.78rem; font-weight:700; }
</style>
