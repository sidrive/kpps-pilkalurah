<template>
  <div class="wrap">
    <header>
      <h1>Papan Hitung Suara</h1>
      <p class="mono petugas-info">{{ namaPetugas }} · {{ role }}</p>
    </header>

    <div v-if="isPresensiOpen" class="gate-banner">
      <h3>Presensi Belum Dikunci</h3>
      <p>
        Penghitungan suara baru bisa dimulai setelah data pemilih hadir
        dikunci final oleh Ketua KPPS. Ini mencegah data presensi berubah
        di tengah proses hitung.
      </p>
      <button class="btn-lock" @click="openPinPrompt('lock_presensi')">
        Kunci Presensi Sekarang
      </button>
    </div>

    <div v-if="config?.status_tps === STATUS_TPS.TALLY_DONE" class="locked-banner">
      Hasil tally sudah dikunci. Papan hitung dalam mode baca-saja.
    </div>

    <!-- Validasi matematis: Total Suara (Sah + Tidak Sah) vs Pemilih Hadir -->
    <div class="validation" :class="{ mismatch: !validasiCocok }">
      <div class="validation-row">
        <span>Pemilih Hadir (Modul 1)</span>
        <span class="mono">{{ jumlahHadir }}</span>
      </div>
      <div class="validation-row">
        <span>Total Suara Sah + Tidak Sah</span>
        <span class="mono">{{ totalKeseluruhan }}</span>
      </div>
      <div class="validation-status">
        {{ validasiCocok ? '✓ Cocok' : '⚠ Tidak cocok — cek ulang' }}
      </div>
    </div>

    <div class="calon-grid">
      <button
        v-for="calon in daftarCalon"
        :key="calon.id"
        class="calon-btn"
        :disabled="isTapDisabled"
        @click="tap(calon.id)"
      >
        <span class="calon-nama">{{ calon.nama }}</span>
        <span class="calon-count mono">{{ countsByCalonId[calon.id] || 0 }}</span>
      </button>

      <button class="calon-btn tidak-sah" :disabled="isTapDisabled" @click="tap(TIDAK_SAH_ID)">
        <span class="calon-nama">Tidak Sah</span>
        <span class="calon-count mono">{{ totalTidakSah }}</span>
      </button>
    </div>

    <button class="btn-undo" :disabled="isTapDisabled || votes.length === 0" @click="undo">
      ⌫ Batalkan Suara Terakhir
    </button>

    <div v-if="lastUndo" class="undo-feedback">
      Suara terakhir untuk "{{ namaCalonById(lastUndo) }}" dibatalkan.
    </div>

    <div class="lock-section">
      <button
        class="btn-lock"
        :disabled="isPresensiOpen || isLocked"
        @click="openPinPrompt('lock_tally')"
      >
        Kunci & Submit Hasil Tally
      </button>
      <p v-if="isPresensiOpen" class="lock-hint">
        Kunci presensi dulu di atas sebelum bisa submit hasil tally.
      </p>
      <router-link v-if="isLocked" to="/rekap" class="link-rekap">
        Lanjut ke Rekapitulasi & Berita Acara →
      </router-link>
    </div>

    <div v-if="showPinPrompt" class="pin-overlay">
      <div class="pin-card">
        <h3>Konfirmasi PIN Ketua KPPS</h3>
        <p class="pin-context">{{ pinPromptLabel }}</p>
        <input v-model="pinInput" type="password" inputmode="numeric" placeholder="PIN" />
        <p v-if="pinError" class="pin-error">PIN salah, coba lagi.</p>
        <div class="pin-actions">
          <button class="btn-secondary" @click="closePinPrompt">
            Batal
          </button>
          <button class="btn-primary" @click="submitPin">Kunci</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTally } from '../composables/useTally.js'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { useDevice } from '../composables/useDevice.js'
import { STATUS_TPS, TIDAK_SAH_ID, STATUS_PROSES } from '../config/constants.js'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase.js'

const { votes, countsByCalonId, totalTidakSah, totalKeseluruhan, catatSuara, batalkanSuaraTerakhir } = useTally()
const { config, daftarCalon, lockPresensi, lockTally } = useTpsConfig()
const { deviceId, namaPetugas, role } = useDevice()

// Jumlah pemilih hadir dari Modul 1 -- query terpisah (bukan re-pakai
// antreanList dari useDpt karena itu khusus status DI_ANTREAN).
const jumlahHadir = ref(0)
const hadirQuery = query(collection(db, 'dpt'), where('status_proses', '==', STATUS_PROSES.HADIR_SAH))
onSnapshot(hadirQuery, (snap) => {
  jumlahHadir.value = snap.docs.length
})

const validasiCocok = computed(() => jumlahHadir.value === totalKeseluruhan.value)

// FIX gap: hard gate, bukan cuma banner peringatan. Tap suara & tombol
// kunci tally benar-benar disabled selama status_tps masih PRESENSI_OPEN --
// mencegah data presensi berubah di tengah proses hitung (poin "Important
// #5" dari review arsitektur sebelumnya).
const isPresensiOpen = computed(() => config.value?.status_tps === STATUS_TPS.PRESENSI_OPEN)
const isLocked = computed(() => config.value?.status_tps === STATUS_TPS.TALLY_DONE)
const isTapDisabled = computed(() => isPresensiOpen.value || isLocked.value)

const lastUndo = ref(null)
const showPinPrompt = ref(false)
const pinInput = ref('')
const pinError = ref(false)
const pinAction = ref(null) // 'lock_presensi' | 'lock_tally'

const pinPromptLabel = computed(() =>
  pinAction.value === 'lock_presensi'
    ? 'Mengunci data presensi (tidak bisa diubah lagi setelah ini).'
    : 'Submit hasil akhir tally (tidak bisa diubah lagi setelah ini).'
)

async function tap(calonId) {
  if (isTapDisabled.value) return
  await catatSuara(calonId, deviceId, namaPetugas.value)
}

async function undo() {
  if (isTapDisabled.value) return
  const result = await batalkanSuaraTerakhir()
  if (result.success) {
    lastUndo.value = result.calonId
    setTimeout(() => {
      if (lastUndo.value === result.calonId) lastUndo.value = null
    }, 2500)
  }
}

function namaCalonById(id) {
  if (id === TIDAK_SAH_ID) return 'Tidak Sah'
  return daftarCalon.value.find((c) => c.id === id)?.nama || id
}

function openPinPrompt(action) {
  pinAction.value = action
  showPinPrompt.value = true
}

function closePinPrompt() {
  showPinPrompt.value = false
  pinInput.value = ''
  pinError.value = false
  pinAction.value = null
}

async function submitPin() {
  const result =
    pinAction.value === 'lock_presensi'
      ? await lockPresensi(pinInput.value)
      : await lockTally(pinInput.value)

  if (result.success) {
    closePinPrompt()
  } else {
    pinError.value = true
  }
}
</script>

<style scoped>
.wrap {
  max-width: 480px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

header {
  margin-bottom: 1rem;
}
.petugas-info {
  color: #6b6b66;
  font-size: 0.85rem;
}

.warning-banner {
  background: #fbeee0;
  color: var(--color-amber-dark);
  border: 1px solid var(--color-amber);
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.gate-banner {
  background: #fbeee0;
  border: 2px solid var(--color-amber);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-bottom: 1.25rem;
}
.gate-banner h3 {
  color: var(--color-amber-dark);
  margin-bottom: 0.5rem;
}
.gate-banner p {
  font-size: 0.9rem;
  margin-bottom: 1rem;
}
.gate-banner .btn-lock {
  width: 100%;
}

.locked-banner {
  background: #e2f1e8;
  color: var(--color-green);
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  font-weight: 600;
  margin-bottom: 1rem;
}

.validation {
  background: white;
  border: 2px solid var(--color-line);
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1.25rem;
}
.validation.mismatch {
  border-color: var(--color-red);
}
.validation-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}
.validation-status {
  text-align: center;
  font-weight: 700;
  margin-top: 0.4rem;
}
.validation.mismatch .validation-status {
  color: var(--color-red);
}
.validation:not(.mismatch) .validation-status {
  color: var(--color-green);
}

.calon-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.calon-btn {
  background: white;
  border: 2px solid var(--color-navy);
  border-radius: var(--radius);
  padding: 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  min-height: 90px;
}
.calon-nama {
  font-weight: 700;
  text-align: center;
  font-size: 0.95rem;
}
.calon-count {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-navy);
}
.calon-btn.tidak-sah {
  border-color: var(--color-red);
  grid-column: span 2;
}
.calon-btn.tidak-sah .calon-count {
  color: var(--color-red);
}

.btn-undo {
  width: 100%;
  background: white;
  border: 2px solid var(--color-line);
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.undo-feedback {
  text-align: center;
  color: var(--color-amber-dark);
  margin-top: -1rem;
  margin-bottom: 1rem;
}

.lock-section {
  border-top: 1px solid var(--color-line);
  padding-top: 1.25rem;
}
.lock-hint {
  text-align: center;
  font-size: 0.85rem;
  color: #6b6b66;
  margin-top: 0.5rem;
}
.link-rekap {
  display: block;
  text-align: center;
  margin-top: 0.75rem;
  color: var(--color-navy);
  font-weight: 600;
  text-decoration: none;
}
.btn-lock {
  width: 100%;
  background: var(--color-navy);
  color: white;
  font-weight: 700;
}

.pin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.pin-card {
  background: white;
  border-radius: var(--radius);
  padding: 1.5rem;
  width: 100%;
  max-width: 320px;
}
.pin-context {
  font-size: 0.85rem;
  color: #6b6b66;
  text-align: center;
}
.pin-card input {
  width: 100%;
  min-height: var(--touch-min);
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 0 1rem;
  font-size: 1.3rem;
  margin: 1rem 0;
  text-align: center;
}
.pin-error {
  color: var(--color-red);
  text-align: center;
  margin-top: -0.5rem;
}
.pin-actions {
  display: flex;
  gap: 0.6rem;
}
.pin-actions button {
  flex: 1;
}
.btn-secondary {
  background: white;
  border: 2px solid var(--color-line);
}
.btn-primary {
  background: var(--color-navy);
  color: white;
  font-weight: 600;
}
</style>
