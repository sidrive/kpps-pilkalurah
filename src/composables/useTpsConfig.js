import { ref, computed, onUnmounted } from 'vue'
import { doc, getDocFromCache, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { TPS_ID, STATUS_TPS } from '../config/constants.js'

const tpsRef = doc(db, 'tps_config', TPS_ID)

/**
 * PIN Ketua KPPS disimpan sebagai plain string di Firestore (bukan hash,
 * bukan Firebase Auth) -- keputusan sadar karena app ini dipakai sendiri
 * di 1 TPS, bukan multi-tenant publik. Validasi dilakukan client-side
 * dari data yang sudah di-cache offline, supaya PIN gate tetap bisa
 * dipakai walau device offline total. Kalau mau ganti PIN, edit langsung
 * di Firestore console -- tidak perlu redeploy app.
 *
 * `daftar_calon` juga disimpan di sini sebagai array, BUKAN hardcode di
 * kode -- karena jumlah/nama calon belum pasti (defaultnya 4, tapi bisa
 * bertambah/berkurang). Edit langsung di Firestore console kapan saja
 * sebelum hari-H, UI di TallyView akan otomatis menyesuaikan jumlah
 * tombol tanpa perlu redeploy.
 */
export function useTpsConfig() {
  const config = ref(null)

  const unsubscribe = onSnapshot(tpsRef, (snap) => {
    config.value = snap.exists() ? snap.data() : null
  })

  onUnmounted(() => unsubscribe())

  const daftarCalon = computed(() => config.value?.daftar_calon || [])

  async function validasiPin(inputPin) {
    let snap
    try {
      snap = await getDocFromCache(tpsRef)
    } catch {
      snap = await getDoc(tpsRef)
    }
    if (!snap.exists()) return false
    return String(snap.data().pin_ketua) === String(inputPin)
  }

  async function ubahStatusTps(statusBaru) {
    await updateDoc(tpsRef, { status_tps: statusBaru })
  }

  async function lockPresensi(inputPin) {
    const valid = await validasiPin(inputPin)
    if (!valid) return { success: false, reason: 'PIN_SALAH' }
    await ubahStatusTps(STATUS_TPS.PRESENSI_LOCKED)
    return { success: true }
  }

  async function lockTally(inputPin) {
    const valid = await validasiPin(inputPin)
    if (!valid) return { success: false, reason: 'PIN_SALAH' }
    await ubahStatusTps(STATUS_TPS.TALLY_DONE)
    return { success: true }
  }

  /**
   * Field-field Modul 3 (waktu, catatan, daftar saksi) disimpan di dokumen
   * `tps_config` yang sama -- bukan collection terpisah -- karena semuanya
   * cuma dibutuhkan sekali per TPS dan sering diedit bareng saat menyusun
   * BA. Tidak ada PIN gate di sini (beda dengan lockPresensi/lockTally)
   * karena ini cuma data pendukung dokumen, bukan aksi yang mengunci state.
   */
  async function updateRekapInfo(data) {
    await updateDoc(tpsRef, data)
  }

  return {
    config,
    daftarCalon,
    validasiPin,
    ubahStatusTps,
    lockPresensi,
    lockTally,
    updateRekapInfo
  }
}
