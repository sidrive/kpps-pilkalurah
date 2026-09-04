<template>
  <div class="wrap">
    <header>
      <h1>Petugas Depan</h1>
      <p class="mono petugas-info">{{ namaPetugas }}</p>
    </header>

    <div class="buffer-badge" :class="{ full: bufferPenuh }">
      Antrean: <span class="mono">{{ bufferCount }}/{{ MAX_QUEUE_BUFFER }}</span>
      <span v-if="staleDetik > 15" class="stale-warning">
        &nbsp;· sync {{ staleDetik }}s lalu
      </span>
    </div>

    <div class="display mono">{{ inputBuffer || '—' }}</div>

    <div v-if="feedback" class="feedback" :class="feedback.type">
      {{ feedback.message }}
    </div>

    <div class="numpad">
      <button
        v-for="n in [1,2,3,4,5,6,7,8,9]"
        :key="n"
        class="numpad-btn"
        :disabled="bufferPenuh"
        @click="tambahDigit(n)"
      >{{ n }}</button>
      <button class="numpad-btn" :disabled="bufferPenuh" @click="hapusDigit">⌫</button>
      <button class="numpad-btn" :disabled="bufferPenuh" @click="tambahDigit(0)">0</button>
      <button
        class="numpad-btn submit"
        :disabled="!inputBuffer || bufferPenuh || isPending"
        @click="submit"
      >✓</button>
    </div>

    <p v-if="bufferPenuh" class="full-notice">
      Antrean penuh ({{ MAX_QUEUE_BUFFER }}/{{ MAX_QUEUE_BUFFER }}). Tunggu KPPS memproses pemilih.
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDpt } from '../composables/useDpt.js'
import { useDevice } from '../composables/useDevice.js'
import { MAX_QUEUE_BUFFER, STATUS_PROSES } from '../config/constants.js'

const { bufferCount, lastSyncAt, isPending, isBufferPenuh, tambahKeAntrean, cariByNoUrut } = useDpt()
const { deviceId, namaPetugas } = useDevice()

const inputBuffer = ref('')
const feedback = ref(null)
const now = ref(Date.now())

let tickInterval
onMounted(() => {
  tickInterval = setInterval(() => (now.value = Date.now()), 1000)
})
onUnmounted(() => clearInterval(tickInterval))

const staleDetik = computed(() =>
  lastSyncAt.value ? Math.floor((now.value - lastSyncAt.value) / 1000) : 0
)
const bufferPenuh = computed(() => isBufferPenuh())

function tambahDigit(n) {
  if (inputBuffer.value.length >= 3) return // max 3 digit no. urut
  inputBuffer.value += String(n)
}

function hapusDigit() {
  inputBuffer.value = inputBuffer.value.slice(0, -1)
}

function tampilkanFeedback(type, message) {
  feedback.value = { type, message }
  setTimeout(() => {
    if (feedback.value?.message === message) feedback.value = null
  }, 2500)
}

async function submit() {
  // FIX #2: disable tombol synchronous SEBELUM await apa pun -- ini kunci
  // dari guard double-tap, karena isPending di-set true di sini, sebelum
  // baris async pertama sempat jalan. Vue re-render disabled state secepat
  // microtask berikutnya, jauh lebih cepat dari jeda antar 2 tap manusia.
  if (isPending.value || bufferPenuh.value || !inputBuffer.value) return

  const noUrut = Number(inputBuffer.value)

  // Cek existensi dulu biar pesan error lebih jelas ke petugas (bukan cuma
  // "SUDAH_DIPROSES" yang generic)
  const existing = await cariByNoUrut(noUrut)
  if (!existing) {
    tampilkanFeedback('error', `No. ${noUrut} tidak ditemukan di DPT`)
    inputBuffer.value = ''
    return
  }
  if (existing.status_proses !== STATUS_PROSES.BELUM_HADIR) {
    tampilkanFeedback('error', `No. ${noUrut} sudah diproses sebelumnya`)
    inputBuffer.value = ''
    return
  }

  const result = await tambahKeAntrean(noUrut, deviceId, namaPetugas.value)

  if (result.success) {
    tampilkanFeedback('success', `${result.data.nama} masuk antrean`)
  } else {
    tampilkanFeedback('error', `Gagal: ${result.reason}`)
  }
  inputBuffer.value = ''
}
</script>

<style scoped>
.wrap {
  max-width: 420px;
  margin: 0 auto;
  padding: 1.5rem 1rem 2.5rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1rem;
}

.petugas-info {
  color: #6b6b66;
  font-size: 0.85rem;
}

.buffer-badge {
  background: var(--color-navy);
  color: white;
  padding: 0.6rem 1rem;
  border-radius: var(--radius);
  font-weight: 600;
  margin-bottom: 1rem;
}
.buffer-badge.full {
  background: var(--color-red);
}
.stale-warning {
  font-weight: 400;
  opacity: 0.85;
}

.display {
  background: white;
  border: 2px solid var(--color-line);
  border-radius: var(--radius);
  text-align: center;
  font-size: 2.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  min-height: 4rem;
}

.feedback {
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  margin-bottom: 1rem;
  font-weight: 600;
  text-align: center;
}
.feedback.success { background: #e2f1e8; color: var(--color-green); }
.feedback.error { background: #f6e4e1; color: var(--color-red); }

.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
}

.numpad-btn {
  background: white;
  border: 2px solid var(--color-line);
  font-size: 1.6rem;
  font-weight: 600;
  min-height: 68px;
}

.numpad-btn.submit {
  background: var(--color-amber);
  color: white;
  border-color: var(--color-amber-dark);
}

.full-notice {
  text-align: center;
  color: var(--color-red);
  font-weight: 600;
  margin-top: 1rem;
}
</style>
