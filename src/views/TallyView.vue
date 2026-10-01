<template>
  <div class="wrap">
    <OperationalHeader title="Papan Hitung Suara" :subtitle="config?.nama_tps || 'TPS Pilkalurah'" :name="namaPetugas" @exit="$router.push('/setup')" />

    <div v-if="isPresensiOpen" class="gate-banner">
      <strong>Presensi Belum Dikunci</strong>
      <p>Penghitungan suara baru bisa dimulai setelah data pemilih hadir dikunci. Ini mencegah perubahan di tengah proses hitung.</p>
      <button class="btn-primary full" @click="openPinPrompt('lock_presensi')">Kunci Presensi Sekarang</button>
    </div>
    <div v-if="config?.status_tps === STATUS_TPS.TALLY_DONE" class="locked-banner">Hasil tally sudah dikunci — papan hitung dalam mode baca-saja.</div>

    <section class="validation" :class="{ mismatch: !validasiCocok }" aria-live="polite">
      <div class="validation-row"><span>Pemilih Hadir</span><span class="mono">{{ jumlahHadir }}</span></div>
      <div class="validation-row"><span>Total Suara Sah + Tidak Sah</span><span class="mono">{{ totalKeseluruhan }}</span></div>
      <strong class="validation-status" :class="{ ok: validasiCocok, warn: !validasiCocok }">{{ validasiCocok ? '✓ Cocok' : '⚠ Tidak cocok — cek ulang' }}</strong>
    </section>

    <section class="calon-stack" aria-label="Tombol calon">
      <button v-for="(calon, idx) in daftarCalon" :key="calon.id" class="calon-card" :disabled="isTapDisabled" @click="tap(calon.id)">
        <span class="calon-index mono" :style="{ background: candidateColor(idx) }">{{ idx + 1 }}</span>
        <span class="calon-copy"><strong>{{ calon.nama }}</strong><small>Calon {{ idx + 1 }}</small></span>
        <span class="calon-count mono">{{ countsByCalonId[calon.id] || 0 }}</span>
      </button>
      <button class="calon-card invalid" :disabled="isTapDisabled" @click="tap(TIDAK_SAH_ID)">
        <span class="calon-index mono">!</span>
        <span class="calon-copy"><strong>Tidak Sah</strong><small>Suara tidak sah</small></span>
        <span class="calon-count mono">{{ totalTidakSah }}</span>
      </button>
    </section>

    <button class="btn-secondary full undo" :disabled="isTapDisabled || votes.length === 0" @click="undo">↩ Batalkan Suara Terakhir</button>
    <p v-if="lastUndo" class="undo-feedback">Suara terakhir untuk "{{ namaCalonById(lastUndo) }}" dibatalkan.</p>

    <section class="lock-section">
      <button class="btn-primary full" :disabled="isPresensiOpen || isLocked" @click="openPinPrompt('lock_tally')">Kunci &amp; Submit Hasil Tally</button>
      <p v-if="isPresensiOpen" class="lock-hint">Kunci presensi dulu di atas sebelum bisa submit hasil tally.</p>
      <router-link v-if="isLocked" to="/rekap" class="link-rekap">Lanjut ke Rekapitulasi &amp; Berita Acara →</router-link>
    </section>

    <div v-if="showPinPrompt" class="pin-overlay" @click.self="closePinPrompt">
      <div class="pin-card">
        <h3>Konfirmasi PIN Ketua KPPS</h3>
        <p class="pin-context">{{ pinPromptLabel }}</p>
        <input v-model="pinInput" type="password" inputmode="numeric" placeholder="PIN" @keyup.enter="submitPin">
        <p v-if="pinError" class="pin-error">PIN salah, coba lagi.</p>
        <div class="pin-actions"><button class="btn-secondary" @click="closePinPrompt">Batal</button><button class="btn-primary" @click="submitPin">Kunci</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTally } from '../composables/useTally.js'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { useDevice } from '../composables/useDevice.js'
import { useDpt } from '../composables/useDpt.js'
import { STATUS_TPS, TIDAK_SAH_ID } from '../config/constants.js'
import OperationalHeader from '../components/OperationalHeader.vue'

const { votes, countsByCalonId, totalTidakSah, totalKeseluruhan, catatSuara, batalkanSuaraTerakhir } = useTally()
const { config, daftarCalon, lockPresensi, lockTally } = useTpsConfig()
const { deviceId, namaPetugas } = useDevice()
const { jumlahHadir } = useDpt()
const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)']
const validasiCocok = computed(() => jumlahHadir.value === totalKeseluruhan.value)
const isPresensiOpen = computed(() => config.value?.status_tps === STATUS_TPS.PRESENSI_OPEN)
const isLocked = computed(() => config.value?.status_tps === STATUS_TPS.TALLY_DONE)
const isTapDisabled = computed(() => isPresensiOpen.value || isLocked.value)
const lastUndo = ref(null)
const showPinPrompt = ref(false)
const pinInput = ref('')
const pinError = ref(false)
const pinAction = ref(null)
const pinPromptLabel = computed(() => pinAction.value === 'lock_presensi' ? 'Mengunci data presensi (tidak bisa diubah lagi).' : 'Submit hasil akhir tally (tidak bisa diubah lagi).')
async function tap(calonId) { if (isTapDisabled.value) return; await catatSuara(calonId, deviceId, namaPetugas.value) }
async function undo() { if (isTapDisabled.value) return; const result = await batalkanSuaraTerakhir(); if (result.success) { lastUndo.value = result.calonId; setTimeout(() => { if (lastUndo.value === result.calonId) lastUndo.value = null }, 2500) } }
function candidateColor(index) { return SERIES[index] || 'var(--color-faint)' }
function namaCalonById(id) { if (id === TIDAK_SAH_ID) return 'Tidak Sah'; return daftarCalon.value.find((c) => c.id === id)?.nama || id }
function openPinPrompt(action) { pinAction.value = action; showPinPrompt.value = true }
function closePinPrompt() { showPinPrompt.value = false; pinInput.value = ''; pinError.value = false; pinAction.value = null }
async function submitPin() { const result = pinAction.value === 'lock_presensi' ? await lockPresensi(pinInput.value) : await lockTally(pinInput.value); if (result.success) closePinPrompt(); else pinError.value = true }
</script>

<style scoped>
.wrap { max-width:520px; margin:0 auto; padding:1.5rem 1rem 3rem; }
.gate-banner { padding:1rem; margin-bottom:1rem; background:#fff6e8; border:1px solid #f0c98a; border-radius:var(--radius); }
.gate-banner strong{color:var(--color-amber-dark)} .gate-banner p{color:var(--color-muted); font-size:.78rem; margin:.4rem 0 .8rem}
.locked-banner{padding:.75rem 1rem; margin-bottom:1rem; color:var(--color-green); background:#e4f3ed; border-radius:10px; font-weight:700; font-size:.8rem}
.validation{padding:1rem; margin-bottom:1rem; background:#fff; border:1px solid var(--color-line); border-radius:var(--radius); box-shadow:var(--shadow-card)}
.validation.mismatch{border-color:#e7b9bd}
.validation-row{display:flex;justify-content:space-between;color:var(--color-muted);font-size:.78rem;margin-bottom:.3rem}
.validation-row .mono{color:var(--color-ink);font-weight:800}
.validation-status{display:block; text-align:center; margin-top:.45rem; font-size:.78rem}
.validation-status.ok{color:var(--color-green)} .validation-status.warn{color:var(--color-red)}
.calon-stack{display:flex;flex-direction:column;gap:.55rem;margin-bottom:.75rem}
.calon-card{display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:.6rem; min-height:64px; padding:.7rem .75rem; background:#fff; border:1px solid rgba(6,45,61,.06); border-radius:12px; box-shadow:0 4px 14px rgba(6,45,61,.05); text-align:left}
.calon-card.invalid{border-color:#f0c3c6}
.calon-card.invalid .calon-index{color:#fff;background:var(--color-red)}
.calon-index{display:grid;place-items:center;width:30px;height:30px;color:#fff;border-radius:50%;font-size:.72rem;font-weight:900}
.calon-copy{display:flex;flex-direction:column;min-width:0}.calon-copy strong{font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.calon-copy small{color:var(--color-muted);font-size:.63rem}
.calon-count{color:var(--color-navy-dark);font-size:1.55rem;font-weight:900}
.undo.full{margin-bottom:.6rem}
.undo-feedback{color:var(--color-amber-dark);text-align:center;font-size:.76rem;margin-bottom:.8rem}
.lock-section{border-top:1px solid var(--color-line); padding-top:1rem}
.lock-hint{color:var(--color-muted);text-align:center;font-size:.72rem;margin-top:.45rem}
.link-rekap{display:block;margin-top:.7rem;color:var(--color-navy);text-align:center;text-decoration:none;font-size:.8rem;font-weight:750}
.btn-primary.full,.btn-secondary.full{width:100%}
.pin-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:rgba(6,45,61,.45);z-index:10}
.pin-card{width:min(100%,340px);padding:1.5rem;background:#fff;border-radius:14px}
.pin-card h3{margin:0 0 .35rem;color:var(--color-navy-dark);text-align:center;font-size:1rem}
.pin-context{color:var(--color-muted);text-align:center;font-size:.72rem}
.pin-card input{width:100%;min-height:var(--touch-min);margin:1rem 0;padding:0 1rem;border:1px solid var(--color-line);border-radius:10px;text-align:center;font-size:1.2rem}
.pin-error{color:var(--color-red);text-align:center;font-size:.75rem;margin-top:-.5rem}
.pin-actions{display:flex;gap:.6rem}.pin-actions button{flex:1}
</style>
