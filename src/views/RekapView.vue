<template>
  <div class="wrap">
    <header>
      <h1>Rekapitulasi & Berita Acara</h1>
      <p class="mono petugas-info">{{ namaPetugas }} · {{ role }}</p>
    </header>

    <div v-if="config?.status_tps !== STATUS_TPS.TALLY_DONE" class="warning-banner">
      Hasil tally belum dikunci (status: {{ config?.status_tps || '...' }}). Data
      di bawah tetap ditampilkan, tapi sebaiknya tunggu tally selesai dikunci
      sebelum export BA final.
    </div>

    <section class="form-section">
      <h2>Waktu Pelaksanaan</h2>
      <div class="field-row">
        <label>
          Tanggal Pemilihan
          <input v-model="form.tanggal_pemilihan" type="text" placeholder="cth: 22 Agustus 2026" />
        </label>
      </div>
      <div class="field-row two-col">
        <label>
          Mulai Pemungutan
          <input v-model="form.waktu_mulai_pemungutan" type="time" />
        </label>
        <label>
          Selesai Pemungutan
          <input v-model="form.waktu_selesai_pemungutan" type="time" />
        </label>
      </div>
      <div class="field-row two-col">
        <label>
          Mulai Penghitungan
          <input v-model="form.waktu_mulai_hitung" type="time" />
        </label>
        <label>
          Selesai Penghitungan
          <input v-model="form.waktu_selesai_hitung" type="time" />
        </label>
      </div>
    </section>

    <section class="form-section">
      <h2>Catatan Kejadian Khusus</h2>
      <textarea
        v-model="form.catatan_khusus"
        rows="3"
        placeholder="Kosongkan jika tidak ada kejadian khusus"
      />
    </section>

    <section class="form-section">
      <h2>Saksi yang Hadir</h2>
      <div v-for="(_, i) in form.daftar_saksi" :key="i" class="saksi-row">
        <input v-model="form.daftar_saksi[i]" type="text" placeholder="Nama saksi" />
        <button class="btn-remove" @click="hapusSaksi(i)">✕</button>
      </div>
      <button class="btn-add" @click="tambahSaksi">+ Tambah Saksi</button>
    </section>

    <button class="btn-save" @click="simpan">
      {{ saved ? '✓ Tersimpan' : 'Simpan Perubahan' }}
    </button>

    <!-- Preview ringkas sebelum export, biar Ketua bisa cek angka dulu -->
    <section class="preview">
      <h2>Ringkasan (akan masuk ke PDF)</h2>
      <div class="preview-row"><span>Total DPT</span><span class="mono">{{ totalDpt }}</span></div>
      <div class="preview-row"><span>Hadir</span><span class="mono">{{ jumlahHadir }} ({{ persenHadir }}%)</span></div>
      <div class="preview-row"><span>Tidak Hadir</span><span class="mono">{{ jumlahBelumHadir }}</span></div>
      <div class="preview-divider" />
      <div v-for="item in hasilSuara" :key="item.nama" class="preview-row">
        <span>{{ item.nama }}</span><span class="mono">{{ item.count }}</span>
      </div>
      <div class="preview-row preview-total">
        <span>Total Suara</span><span class="mono">{{ totalKeseluruhan }}</span>
      </div>
    </section>

    <button class="btn-export" @click="exportPdf">
      📄 Export PDF Berita Acara
    </button>

    <router-link to="/display/hasil-akhir" class="link-hasil" target="_blank">
      🖥️ Buka Layar Hasil Akhir (untuk saksi/publik) →
    </router-link>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { useTally } from '../composables/useTally.js'
import { useDevice } from '../composables/useDevice.js'
import { STATUS_TPS, STATUS_PROSES, TIDAK_SAH_ID } from '../config/constants.js'
import { generateBeritaAcaraPdf } from '../utils/generateBeritaAcaraPdf.js'

const { config, daftarCalon, updateRekapInfo } = useTpsConfig()
const { countsByCalonId, totalKeseluruhan } = useTally()
const { namaPetugas, role } = useDevice()

const form = reactive({
  tanggal_pemilihan: '',
  waktu_mulai_pemungutan: '',
  waktu_selesai_pemungutan: '',
  waktu_mulai_hitung: '',
  waktu_selesai_hitung: '',
  catatan_khusus: '',
  daftar_saksi: ['']
})

const saved = ref(false)
let initialized = false

// Sinkronkan form dari Firestore SEKALI saat data pertama datang, supaya
// tidak menimpa ketikan Ketua yang sedang berlangsung tiap kali ada
// snapshot baru dari device lain.
watch(config, (val) => {
  if (!val || initialized) return
  form.tanggal_pemilihan = val.tanggal_pemilihan || ''
  form.waktu_mulai_pemungutan = val.waktu_mulai_pemungutan || ''
  form.waktu_selesai_pemungutan = val.waktu_selesai_pemungutan || ''
  form.waktu_mulai_hitung = val.waktu_mulai_hitung || ''
  form.waktu_selesai_hitung = val.waktu_selesai_hitung || ''
  form.catatan_khusus = val.catatan_khusus || ''
  form.daftar_saksi = val.daftar_saksi?.length ? [...val.daftar_saksi] : ['']
  initialized = true
})

function tambahSaksi() {
  form.daftar_saksi.push('')
}
function hapusSaksi(i) {
  form.daftar_saksi.splice(i, 1)
  if (form.daftar_saksi.length === 0) form.daftar_saksi.push('')
}

async function simpan() {
  await updateRekapInfo({ ...form })
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}

// --- Data rekap kehadiran (pola sama dengan PresensiDisplayView) ---
const allDpt = ref([])
onSnapshot(collection(db, 'dpt'), (snap) => {
  allDpt.value = snap.docs.map((d) => d.data())
})
const totalDpt = computed(() => allDpt.value.length)
const jumlahHadir = computed(
  () => allDpt.value.filter((d) => d.status_proses === STATUS_PROSES.HADIR_SAH).length
)
const jumlahBelumHadir = computed(() => totalDpt.value - jumlahHadir.value)
const persenHadir = computed(() =>
  totalDpt.value === 0 ? 0 : Math.round((jumlahHadir.value / totalDpt.value) * 100)
)

// --- Hasil suara (pola sama dengan TallyDisplayView) ---
const hasilSuara = computed(() => {
  const items = daftarCalon.value.map((c) => ({
    nama: c.nama,
    count: countsByCalonId.value[c.id] || 0
  }))
  items.push({ nama: 'Tidak Sah', count: countsByCalonId.value[TIDAK_SAH_ID] || 0 })
  return items
})

async function exportPdf() {
  await generateBeritaAcaraPdf({
    namaTps: config.value?.nama_tps,
    tanggalPemilihan: form.tanggal_pemilihan,
    waktuMulaiPemungutan: form.waktu_mulai_pemungutan,
    waktuSelesaiPemungutan: form.waktu_selesai_pemungutan,
    waktuMulaiHitung: form.waktu_mulai_hitung,
    waktuSelesaiHitung: form.waktu_selesai_hitung,
    totalDpt: totalDpt.value,
    jumlahHadir: jumlahHadir.value,
    jumlahBelumHadir: jumlahBelumHadir.value,
    persenHadir: persenHadir.value,
    hasilSuara: hasilSuara.value,
    totalSuara: totalKeseluruhan.value,
    catatanKhusus: form.catatan_khusus,
    daftarSaksi: form.daftar_saksi.filter((s) => s.trim()),
    namaKetua: namaPetugas.value
  })
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
  margin-bottom: 1.25rem;
}

.form-section {
  background: white;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1rem;
}
.form-section h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.field-row {
  margin-bottom: 0.75rem;
}
.field-row.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  font-weight: 600;
}
input, textarea {
  border: 1px solid var(--color-line);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  font-family: inherit;
}
textarea {
  resize: vertical;
}

.saksi-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.saksi-row input {
  flex: 1;
}
.btn-remove {
  background: white;
  border: 2px solid var(--color-red);
  color: var(--color-red);
  min-width: 44px;
  min-height: 44px;
}
.btn-add {
  width: 100%;
  background: white;
  border: 2px dashed var(--color-line);
  font-weight: 600;
}

.btn-save {
  width: 100%;
  background: var(--color-green);
  color: white;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.preview {
  background: var(--color-paper);
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1.25rem;
}
.preview h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}
.preview-row {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
  font-size: 0.9rem;
}
.preview-divider {
  border-top: 1px solid var(--color-line);
  margin: 0.5rem 0;
}
.preview-total {
  font-weight: 700;
  border-top: 1px solid var(--color-line);
  margin-top: 0.4rem;
  padding-top: 0.6rem;
}

.btn-export {
  width: 100%;
  background: var(--color-navy);
  color: white;
  font-weight: 700;
  font-size: 1.05rem;
}

.link-hasil {
  display: block;
  text-align: center;
  margin-top: 1rem;
  color: var(--color-navy);
  font-weight: 600;
  text-decoration: none;
}
</style>
