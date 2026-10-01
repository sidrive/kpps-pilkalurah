<template>
  <div class="wrap">
    <OperationalHeader title="Pengaturan Admin" :subtitle="config?.nama_tps || 'TPS Pilkalurah'" :name="namaPetugas" @exit="$router.push('/setup')" />

    <section class="form-section">
      <h2>Daftar Calon</h2>
      <p class="section-hint">Nama dan jumlah calon di sini otomatis dipakai oleh papan hitung dan layar hasil.</p>
      <div v-if="totalKeseluruhan > 0" class="warning-banner">Sudah ada {{ totalKeseluruhan }} suara tercatat. Hapus atau ubah calon dengan hati-hati: suara yang sudah tercatat untuk calon yang dihapus tetap ada di audit trail, tetapi tidak akan muncul di papan hitung.</div>
      <div v-for="(calon, i) in calonList" :key="calon.id" class="item-row">
        <input v-model="calon.nama" type="text" :placeholder="`Nama calon ${i + 1}`" />
        <button class="btn-remove" :aria-label="`Hapus ${calon.nama || `calon ${i + 1}`}`" @click="hapusCalon(i)">✕</button>
      </div>
      <button class="btn-add" type="button" @click="tambahCalon">+ Tambah Calon</button>
      <p v-if="calonError" class="error-text">{{ calonError }}</p>
      <button class="btn-save" type="button" @click="simpanCalon">{{ calonSaved ? '✓ Tersimpan' : 'Simpan Daftar Calon' }}</button>
    </section>

    <section class="form-section">
      <h2>Akses Petugas</h2>
      <p class="section-hint">Akun Google dalam daftar ini dapat membuka dan menulis di halaman kerja petugas. Setiap penambahan atau pencabutan akses meminta PIN Ketua.</p>
      <div class="email-add-row">
        <input v-model="newEmail" type="email" inputmode="email" autocomplete="email" placeholder="nama@gmail.com" @keyup.enter="requestAddEmail" />
        <button class="btn-add-email" type="button" @click="requestAddEmail">Tambah</button>
      </div>
      <p v-if="emailError" class="error-text">{{ emailError }}</p>
      <div v-if="emails.length === 0" class="empty-state">Belum ada email terdaftar.</div>
      <div v-for="item in emails" :key="item.email" class="email-row">
        <span>{{ item.email }} <strong v-if="isCurrentUser(item.email)" class="self-label">(kamu)</strong></span>
        <button class="btn-remove-email" type="button" @click="requestRemoveEmail(item.email)">Hapus</button>
      </div>
    </section>

    <section class="form-section">
      <h2>Laporan Kedatangan</h2>
      <p class="section-hint">Urutan pemilih yang sudah divalidasi Petugas Depan berdasarkan nomor kedatangan.</p>
      <div class="report-summary"><span>Total divalidasi</span><strong class="mono">{{ arrivalList.length }}</strong></div>
      <div v-if="arrivalList.length === 0" class="empty-state">Belum ada pemilih yang divalidasi masuk.</div>
      <div v-for="item in arrivalList" :key="item.id" class="arrival-row">
        <span class="arrival-number mono">#{{ item.nomor_kedatangan }}</span>
        <span class="arrival-identity"><strong>{{ item.nama }}</strong><small>No. DPT {{ item.no_urut }} · RT {{ item.rt || '-' }} · {{ item.alamat || '-' }}</small><small>{{ labelStatus(item.status_proses) }} · {{ formatTime(item.waktu_validasi) }}<template v-if="item.waktu_konfirmasi"> → hadir {{ formatTime(item.waktu_konfirmasi) }}</template></small></span>
      </div>
    </section>

    <router-link to="/setup" class="back-link">← Kembali ke Setup Device</router-link>

    <div v-if="showPinPrompt" class="pin-overlay" @click.self="closePinPrompt">
      <div class="pin-card">
        <h3>Konfirmasi PIN Ketua KPPS</h3>
        <p class="pin-context">{{ pinPromptLabel }}</p>
        <p v-if="isRemovingSelf" class="self-warning">Kamu akan mencabut akses akun sendiri. Setelah ini kamu mungkin tidak bisa masuk lagi.</p>
        <input v-model="pinInput" type="password" inputmode="numeric" placeholder="PIN" @keyup.enter="submitPin" />
        <p v-if="pinError" class="pin-error">PIN salah, coba lagi.</p>
        <div class="pin-actions"><button class="btn-secondary" type="button" @click="closePinPrompt">Batal</button><button class="btn-primary" type="button" :disabled="submitting" @click="submitPin">{{ submitting ? 'Memproses...' : 'Konfirmasi' }}</button></div>
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
import { useDevice } from '../composables/useDevice.js'
import { useDpt } from '../composables/useDpt.js'
import OperationalHeader from '../components/OperationalHeader.vue'

const { config, daftarCalon, validasiPin, updateRekapInfo } = useTpsConfig()
const { emails, addEmail, removeEmail } = useAuthorizedEmails()
const { currentUser } = useAuth()
const { totalKeseluruhan } = useTally()
const { namaPetugas } = useDevice()
const { arrivalList } = useDpt()

const calonList = ref([])
const calonSaved = ref(false)
const calonError = ref('')
let calonInitialized = false
watch(daftarCalon, (value) => {
  if (calonInitialized) return
  calonList.value = value.map((calon) => ({ ...calon }))
  calonInitialized = true
}, { immediate: true })
function tambahCalon() { calonList.value.push({ id: `calon-${Date.now()}`, nama: '' }) }
function hapusCalon(index) { calonList.value.splice(index, 1) }
async function simpanCalon() {
  const cleaned = calonList.value.map((calon) => ({ ...calon, nama: calon.nama.trim() })).filter((calon) => calon.nama)
  if (cleaned.length === 0) { calonError.value = 'Daftar calon tidak boleh kosong.'; return }
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
const pinAction = ref(null)
const submitting = ref(false)
const pinPromptLabel = computed(() => {
  if (!pinAction.value) return ''
  return pinAction.value.type === 'add' ? `Tambahkan akses petugas untuk ${pinAction.value.email}?` : `Cabut akses petugas untuk ${pinAction.value.email}?`
})
const isRemovingSelf = computed(() => pinAction.value?.type === 'remove' && isCurrentUser(pinAction.value.email))
function isCurrentUser(email) { return email === currentUser.value?.email?.toLowerCase() }
function labelStatus(status) {
  if (status === 'DI_ANTREAN') return 'Menunggu KPPS'
  if (status === 'HADIR_SAH') return 'Hadir sah'
  return 'Belum hadir'
}
function formatTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function requestAddEmail() {
  const email = newEmail.value.trim().toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(email)) { emailError.value = 'Masukkan alamat email yang valid.'; return }
  if (emails.value.some((item) => item.email === email)) { emailError.value = 'Email tersebut sudah terdaftar.'; return }
  emailError.value = ''
  openPinPrompt({ type: 'add', email })
}
function requestRemoveEmail(email) { emailError.value = ''; openPinPrompt({ type: 'remove', email }) }
function openPinPrompt(action) { pinAction.value = action; showPinPrompt.value = true }
function closePinPrompt() { showPinPrompt.value = false; pinInput.value = ''; pinError.value = false; pinAction.value = null }
async function submitPin() {
  if (!pinAction.value || submitting.value) return
  const valid = await validasiPin(pinInput.value)
  if (!valid) { pinError.value = true; return }
  submitting.value = true
  try {
    if (pinAction.value.type === 'add') { await addEmail(pinAction.value.email); newEmail.value = '' }
    else { await removeEmail(pinAction.value.email) }
    closePinPrompt()
  } finally { submitting.value = false }
}
</script>

<style scoped>
.wrap{max-width:520px;margin:0 auto;padding:1.5rem 1rem 3rem}
.form-section{padding:1rem;margin-bottom:1rem;background:#fff;border:1px solid rgba(6,45,61,.06);border-radius:var(--radius);box-shadow:var(--shadow-card)}
.form-section h2{margin-bottom:.35rem;color:var(--color-navy-dark);font-size:1rem}
.section-hint{margin-bottom:1rem;color:var(--color-muted);font-size:.78rem;line-height:1.5}
.warning-banner{padding:.75rem;margin-bottom:1rem;color:var(--color-amber-dark);background:#fff6e8;border:1px solid #f0c98a;border-radius:10px;font-size:.78rem}
.item-row,.email-add-row,.email-row{display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem}
.item-row input,.email-add-row input{flex:1;min-width:0;padding:.6rem .75rem;color:var(--color-ink);background:#fff;border:1px solid var(--color-line);border-radius:9px;font-size:.9rem}
.btn-remove{min-width:44px;color:var(--color-red);background:#fff;border:1px solid #e7b9bd}
.btn-add{width:100%;margin-bottom:.75rem;color:var(--color-navy);background:#fff;border:1px dashed var(--color-line);font-weight:700}
.btn-save{width:100%;color:#fff;background:var(--color-green);font-weight:800}
.btn-add-email{min-height:44px;padding:0 .9rem;color:#fff;background:var(--color-navy);font-weight:700}
.email-row{justify-content:space-between;padding-top:.5rem;border-top:1px solid var(--color-line);font-size:.85rem}
.email-row span{overflow-wrap:anywhere}
.report-summary{display:flex;justify-content:space-between;align-items:center;padding:.65rem .75rem;margin-bottom:.65rem;color:var(--color-muted);background:var(--color-bg);border-radius:10px;font-size:.78rem}.report-summary strong{color:var(--color-navy-dark);font-size:1.1rem}
.arrival-row{display:grid;grid-template-columns:48px 1fr;gap:.65rem;align-items:start;padding:.65rem 0;border-top:1px solid var(--color-line)}
.arrival-number{display:grid;place-items:center;min-height:34px;color:#fff;background:var(--color-navy);border-radius:9px;font-size:.78rem;font-weight:900}.arrival-identity{display:flex;flex-direction:column;min-width:0}.arrival-identity strong{font-size:.84rem;color:var(--color-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.arrival-identity small{margin-top:.18rem;color:var(--color-muted);font-size:.68rem;line-height:1.35}
.btn-remove-email{min-height:40px;padding:0 .75rem;color:var(--color-red);background:#fff;border:1px solid #e7b9bd;font-size:.8rem;flex-shrink:0}
.self-label{color:var(--color-green);font-size:.78rem}
.empty-state{padding:1rem;color:var(--color-muted);text-align:center;font-size:.78rem}
.error-text,.pin-error{margin:.25rem 0 .75rem;color:var(--color-red);font-size:.78rem}
.back-link{display:block;margin-top:1.25rem;color:var(--color-navy);text-align:center;text-decoration:none;font-size:.8rem;font-weight:750}
.pin-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:rgba(6,45,61,.45);z-index:10}
.pin-card{width:min(100%,340px);padding:1.5rem;background:#fff;border-radius:14px}
.pin-card h3{margin:0 0 .35rem;color:var(--color-navy-dark);text-align:center;font-size:1rem}
.pin-context{color:var(--color-muted);text-align:center;font-size:.78rem}
.self-warning{padding:.6rem;margin-top:.75rem;color:var(--color-amber-dark);background:#fff6e8;border-radius:8px;font-size:.78rem}
.pin-card>input{width:100%;min-height:var(--touch-min);margin:1rem 0;padding:0 1rem;border:1px solid var(--color-line);border-radius:10px;text-align:center;font-size:1.2rem}
.pin-actions{display:flex;gap:.6rem}.pin-actions button{flex:1}
</style>
