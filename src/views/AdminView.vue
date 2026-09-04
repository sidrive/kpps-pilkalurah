<template>
  <div class="wrap">
    <header>
      <h1>Pengaturan Admin</h1>
      <p>Kelola daftar calon dan akses petugas untuk TPS ini.</p>
    </header>

    <section class="form-section">
      <h2>Daftar Calon</h2>
      <p class="section-hint">
        Nama dan jumlah calon di sini otomatis dipakai oleh papan hitung dan layar hasil.
      </p>

      <div v-if="totalKeseluruhan > 0" class="warning-banner">
        Sudah ada {{ totalKeseluruhan }} suara tercatat. Hapus atau ubah calon dengan hati-hati:
        suara yang sudah tercatat untuk calon yang dihapus tetap ada di audit trail,
        tetapi tidak akan muncul di papan hitung.
      </div>

      <div v-for="(calon, i) in calonList" :key="calon.id" class="item-row">
        <input v-model="calon.nama" type="text" :placeholder="`Nama calon ${i + 1}`" />
        <button class="btn-remove" :aria-label="`Hapus ${calon.nama || `calon ${i + 1}`}`" @click="hapusCalon(i)">
          ✕
        </button>
      </div>

      <button class="btn-add" @click="tambahCalon">+ Tambah Calon</button>
      <p v-if="calonError" class="error-text">{{ calonError }}</p>
      <button class="btn-save" @click="simpanCalon">
        {{ calonSaved ? '✓ Tersimpan' : 'Simpan Daftar Calon' }}
      </button>
    </section>

    <section class="form-section">
      <h2>Akses Petugas</h2>
      <p class="section-hint">
        Akun Google dalam daftar ini dapat membuka dan menulis di halaman kerja petugas.
        Setiap penambahan atau pencabutan akses meminta PIN Ketua.
      </p>

      <div class="email-add-row">
        <input
          v-model="newEmail"
          type="email"
          inputmode="email"
          autocomplete="email"
          placeholder="nama@gmail.com"
          @keyup.enter="requestAddEmail"
        />
        <button class="btn-add-email" @click="requestAddEmail">Tambah</button>
      </div>
      <p v-if="emailError" class="error-text">{{ emailError }}</p>

      <div v-if="emails.length === 0" class="empty-state">Belum ada email terdaftar.</div>
      <div v-for="item in emails" :key="item.email" class="email-row">
        <span>
          {{ item.email }}
          <strong v-if="isCurrentUser(item.email)" class="self-label">(kamu)</strong>
        </span>
        <button class="btn-remove-email" @click="requestRemoveEmail(item.email)">Hapus</button>
      </div>
    </section>

    <router-link to="/setup" class="back-link">← Kembali ke Setup Device</router-link>

    <div v-if="showPinPrompt" class="pin-overlay">
      <div class="pin-card">
        <h3>Konfirmasi PIN Ketua KPPS</h3>
        <p class="pin-context">{{ pinPromptLabel }}</p>
        <p v-if="isRemovingSelf" class="self-warning">
          Kamu akan mencabut akses akun sendiri. Setelah ini kamu mungkin tidak bisa masuk lagi.
        </p>
        <input v-model="pinInput" type="password" inputmode="numeric" placeholder="PIN" @keyup.enter="submitPin" />
        <p v-if="pinError" class="pin-error">PIN salah, coba lagi.</p>
        <div class="pin-actions">
          <button class="btn-secondary" @click="closePinPrompt">Batal</button>
          <button class="btn-primary" :disabled="submitting" @click="submitPin">
            {{ submitting ? 'Memproses...' : 'Konfirmasi' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { useAuthorizedEmails } from '../composables/useAuthorizedEmails.js'
import { useAuth } from '../composables/useAuth.js'
import { useTally } from '../composables/useTally.js'

const { daftarCalon, validasiPin, updateRekapInfo } = useTpsConfig()
const { emails, addEmail, removeEmail } = useAuthorizedEmails()
const { currentUser } = useAuth()
const { totalKeseluruhan } = useTally()

const calonList = ref([])
const calonSaved = ref(false)
const calonError = ref('')
let calonInitialized = false

// Sama seperti form Rekap: ambil snapshot awal sekali saja, supaya update
// realtime dari device lain tidak menimpa nama calon yang sedang diketik.
watch(daftarCalon, (value) => {
  if (calonInitialized) return
  calonList.value = value.map((calon) => ({ ...calon }))
  calonInitialized = true
}, { immediate: true })

function tambahCalon() {
  calonList.value.push({ id: `calon-${Date.now()}`, nama: '' })
}

function hapusCalon(index) {
  calonList.value.splice(index, 1)
}

async function simpanCalon() {
  const cleaned = calonList.value
    .map((calon) => ({ ...calon, nama: calon.nama.trim() }))
    .filter((calon) => calon.nama)

  if (cleaned.length === 0) {
    calonError.value = 'Daftar calon tidak boleh kosong.'
    return
  }

  calonError.value = ''
  calonList.value = cleaned
  await updateRekapInfo({ daftar_calon: cleaned })
  calonSaved.value = true
  setTimeout(() => (calonSaved.value = false), 2000)
}

const newEmail = ref('')
const emailError = ref('')
const showPinPrompt = ref(false)
const pinInput = ref('')
const pinError = ref(false)
const pinAction = ref(null) // { type: 'add' | 'remove', email }
const submitting = ref(false)

const pinPromptLabel = computed(() => {
  if (!pinAction.value) return ''
  return pinAction.value.type === 'add'
    ? `Tambahkan akses petugas untuk ${pinAction.value.email}?`
    : `Cabut akses petugas untuk ${pinAction.value.email}?`
})

const isRemovingSelf = computed(() =>
  pinAction.value?.type === 'remove' && isCurrentUser(pinAction.value.email)
)

function isCurrentUser(email) {
  return email === currentUser.value?.email?.toLowerCase()
}

function requestAddEmail() {
  const email = newEmail.value.trim().toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(email)) {
    emailError.value = 'Masukkan alamat email yang valid.'
    return
  }
  if (emails.value.some((item) => item.email === email)) {
    emailError.value = 'Email tersebut sudah terdaftar.'
    return
  }

  emailError.value = ''
  openPinPrompt({ type: 'add', email })
}

function requestRemoveEmail(email) {
  emailError.value = ''
  openPinPrompt({ type: 'remove', email })
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
  if (!pinAction.value || submitting.value) return

  const valid = await validasiPin(pinInput.value)
  if (!valid) {
    pinError.value = true
    return
  }

  submitting.value = true
  try {
    if (pinAction.value.type === 'add') {
      await addEmail(pinAction.value.email)
      newEmail.value = ''
    } else {
      await removeEmail(pinAction.value.email)
    }
    closePinPrompt()
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.wrap {
  max-width: 520px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}
header {
  margin-bottom: 1.25rem;
}
header p, .section-hint {
  color: #6b6b66;
  font-size: 0.9rem;
}
.section-hint {
  margin-bottom: 1rem;
}

.form-section {
  background: white;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1rem;
}
.form-section h2 {
  font-size: 1.1rem;
  margin-bottom: 0.4rem;
}

.warning-banner {
  background: #fbeee0;
  color: var(--color-amber-dark);
  border: 1px solid var(--color-amber);
  padding: 0.75rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.item-row, .email-add-row, .email-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
}
.item-row input, .email-add-row input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  font-size: 1rem;
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
  margin-bottom: 0.75rem;
}
.btn-save {
  width: 100%;
  background: var(--color-green);
  color: white;
  font-weight: 700;
}

.btn-add-email {
  background: var(--color-navy);
  color: white;
  font-weight: 600;
  min-height: 44px;
  padding: 0 0.75rem;
}
.email-row {
  justify-content: space-between;
  border-top: 1px solid var(--color-line);
  padding-top: 0.5rem;
  font-size: 0.9rem;
}
.email-row span {
  overflow-wrap: anywhere;
}
.btn-remove-email {
  background: white;
  border: 1px solid var(--color-red);
  color: var(--color-red);
  min-height: 40px;
  padding: 0 0.75rem;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.self-label {
  color: var(--color-green);
  font-size: 0.8rem;
}
.empty-state {
  color: #6b6b66;
  text-align: center;
  padding: 1rem;
}
.error-text, .pin-error {
  color: var(--color-red);
  font-size: 0.85rem;
  margin: 0.25rem 0 0.75rem;
}
.back-link {
  display: block;
  text-align: center;
  color: var(--color-navy);
  font-weight: 600;
  text-decoration: none;
  margin-top: 1.25rem;
}

.pin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 10;
}
.pin-card {
  background: white;
  border-radius: var(--radius);
  padding: 1.5rem;
  width: 100%;
  max-width: 340px;
}
.pin-context {
  font-size: 0.85rem;
  color: #6b6b66;
  text-align: center;
}
.self-warning {
  background: #fbeee0;
  color: var(--color-amber-dark);
  border-radius: 8px;
  padding: 0.6rem;
  font-size: 0.85rem;
  margin-top: 0.75rem;
}
.pin-card > input {
  width: 100%;
  min-height: var(--touch-min);
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 0 1rem;
  font-size: 1.3rem;
  margin: 1rem 0;
  text-align: center;
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
