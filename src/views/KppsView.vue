<template>
  <div class="wrap">
    <header>
      <h1>Meja Registrasi</h1>
      <p class="mono petugas-info">{{ namaPetugas }} · {{ role }}</p>
    </header>

    <div class="tabs">
      <button :class="{ active: tab === 'antrean' }" @click="tab = 'antrean'">
        Antrean ({{ antreanList.length }})
      </button>
      <button :class="{ active: tab === 'manual' }" @click="tab = 'manual'">
        Belum Dicentang Manual
      </button>
    </div>

    <div v-if="tab === 'antrean'" class="list">
      <p v-if="antreanList.length === 0" class="empty">Belum ada pemilih di antrean.</p>

      <div v-for="item in antreanList" :key="item.id" class="card">
        <div class="card-main">
          <span class="no-urut mono">#{{ item.no_urut }}</span>
          <span class="nama">{{ item.nama }}</span>
        </div>
        <div class="card-actions">
          <button class="btn-confirm" :disabled="isPending" @click="konfirmasi(item.no_urut)">
            Konfirmasi Hadir
          </button>
          <button class="btn-cancel" :disabled="isPending" @click="batalkan(item.no_urut)">
            Batal
          </button>
        </div>
      </div>
    </div>

    <div v-else class="list">
      <p class="hint">
        Daftar pemilih yang sudah HADIR_SAH di sistem tapi belum dicentang
        secara fisik di lembar DPT kertas. Centang berurutan saat waktu senggang.
      </p>
      <p v-if="belumCentangManual.length === 0" class="empty">Semua sudah dicentang manual.</p>
      <div v-for="item in belumCentangManual" :key="item.id" class="card">
        <div class="card-main">
          <span class="no-urut mono">#{{ item.no_urut }}</span>
          <span class="nama">{{ item.nama }}</span>
        </div>
        <div class="card-actions">
          <button class="btn-confirm" @click="tandaiCentangManual(item.no_urut)">
            Sudah Dicentang
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { useDpt } from '../composables/useDpt.js'
import { useDevice } from '../composables/useDevice.js'
import { STATUS_PROSES } from '../config/constants.js'

const { antreanList, isPending, konfirmasiHadir, batalkanAntrean } = useDpt()
const { deviceId, namaPetugas, role } = useDevice()

const tab = ref('antrean')
const belumCentangManual = ref([])

let unsubscribeManual
onMounted(() => {
  const q = query(
    collection(db, 'dpt'),
    where('status_proses', '==', STATUS_PROSES.HADIR_SAH),
    where('status_centang_manual', '==', false)
  )
  unsubscribeManual = onSnapshot(q, (snap) => {
    belumCentangManual.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  })
})
onUnmounted(() => unsubscribeManual?.())

async function konfirmasi(noUrut) {
  const result = await konfirmasiHadir(noUrut, deviceId, namaPetugas.value)
  if (!result.success) {
    alert(`Gagal konfirmasi: ${result.reason}`)
  }
}

async function batalkan(noUrut) {
  const result = await batalkanAntrean(noUrut, deviceId, namaPetugas.value)
  if (!result.success) {
    alert(`Gagal batal: ${result.reason}`)
  }
}

async function tandaiCentangManual(noUrut) {
  await updateDoc(doc(db, 'dpt', String(noUrut)), {
    status_centang_manual: true
  })
}
</script>

<style scoped>
.wrap {
  max-width: 480px;
  margin: 0 auto;
  padding: 1.5rem 1rem 2.5rem;
}

header {
  margin-bottom: 1rem;
}

.petugas-info {
  color: #6b6b66;
  font-size: 0.85rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.tabs button {
  flex: 1;
  background: white;
  border: 2px solid var(--color-line);
  font-weight: 600;
  font-size: 0.9rem;
}
.tabs button.active {
  background: var(--color-navy);
  color: white;
  border-color: var(--color-navy-dark);
}

.empty, .hint {
  color: #6b6b66;
  text-align: center;
  padding: 1rem;
}

.card {
  background: white;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  margin-bottom: 0.6rem;
}

.card-main {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}
.no-urut {
  font-weight: 700;
  color: var(--color-navy);
}
.nama {
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}
.card-actions button {
  flex: 1;
  font-size: 0.95rem;
}
.btn-confirm {
  background: var(--color-green);
  color: white;
}
.btn-cancel {
  background: white;
  border: 2px solid var(--color-red);
  color: var(--color-red);
}
</style>
