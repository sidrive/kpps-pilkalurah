import { ref, onUnmounted } from 'vue'
import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { STATUS_PROSES, MAX_QUEUE_BUFFER } from '../config/constants.js'

/**
 * PENTING: `runTransaction()` Firestore TIDAK BISA dipakai di sini walau
 * terlihat seperti solusi ideal untuk race condition, karena transaction
 * butuh koneksi aktif ke server untuk membaca versi terbaru dokumen --
 * kalau device offline, transaction akan gagal/menggantung, bertentangan
 * total dengan requirement "100% offline instan" di dokumen arsitektur.
 *
 * Jadi guard race condition di sini murni CLIENT-SIDE, dua lapis:
 * 1. `isPending` ref -- disable tombol secara synchronous di UI sebelum
 *    write dikirim, supaya tap ganda yang terjadi dalam hitungan
 *    milidetik yang sama tidak lolos dari 1 device yang sama.
 * 2. Baca status dari CACHE lokal (bukan server) sebelum updateDoc --
 *    cukup untuk mencegah tap ganda pada 1 device, TAPI tidak menjamin
 *    konsistensi race antar 2 device berbeda (misal Petugas Depan &
 *    KPPS 1 memproses no_urut yang sama persis bersamaan). Ini
 *    accepted edge case: kemungkinannya kecil (2 role berbeda jarang
 *    pegang no_urut yang sama di waktu bersamaan), dan kalau terjadi,
 *    `presensi_log` tetap merekam keduanya untuk ditelusuri manual.
 */

const dptCollection = collection(db, 'dpt')
const presensiLogCollection = collection(db, 'presensi_log')

/**
 * FIX #3 (dari review arsitektur): jangan pakai serverTimestamp() untuk field
 * yang dipakai sorting UI real-time, karena resolve jadi null di cache lokal
 * sampai benar-benar sampai ke server -- urutan antrean bisa salah render
 * saat koneksi lemah/delay.
 *
 * `waktu_masuk_antrean` di sini pakai Date.now() (client-generated) khusus
 * untuk sorting UI. Waktu presisi server untuk keperluan audit resmi (BA/C1)
 * disimpan terpisah di presensi_log lewat serverTimestamp().
 */
export function useDpt() {
  const antreanList = ref([])
  const bufferCount = ref(0)
  const lastSyncAt = ref(null) // FIX terkait staleness: kapan snapshot terakhir diterima
  const isPending = ref(false)

  const antreanQuery = query(
    dptCollection,
    where('status_proses', '==', STATUS_PROSES.DI_ANTREAN),
    orderBy('waktu_masuk_antrean', 'asc')
  )

  const unsubscribe = onSnapshot(antreanQuery, (snapshot) => {
    antreanList.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    bufferCount.value = snapshot.docs.length
    lastSyncAt.value = Date.now()
  })

  onUnmounted(() => unsubscribe())

  /**
   * FIX #2: guard double-tap. Lihat catatan lengkap di atas file ini
   * (kenapa runTransaction tidak dipakai). Ringkasnya: `isPending` +
   * cek status dari cache lokal sebelum updateDoc.
   */
  async function tambahKeAntrean(noUrut, deviceId, namaPetugas) {
    if (isPending.value) return { success: false, reason: 'PENDING' }
    isPending.value = true

    try {
      const dptRef = doc(db, 'dpt', String(noUrut))

      let snap
      try {
        snap = await getDocFromCache(dptRef)
      } catch {
        // Belum ada di cache (jarang terjadi kalau DPT sudah di-preload H-1)
        snap = await getDoc(dptRef)
      }

      if (!snap.exists()) {
        return { success: false, reason: 'NOMOR_TIDAK_DITEMUKAN' }
      }
      const data = snap.data()

      if (data.status_proses !== STATUS_PROSES.BELUM_HADIR) {
        return { success: false, reason: 'SUDAH_DIPROSES' }
      }

      // Buffer check idealnya sudah dilakukan di caller (bufferCount.value)
      // sebelum memanggil fungsi ini -- lihat catatan staleness di bawah.

      await updateDoc(dptRef, {
        status_proses: STATUS_PROSES.DI_ANTREAN,
        waktu_masuk_antrean: Date.now(),
        updated_by_device: deviceId,
        updated_by_nama: namaPetugas
      })

      await addDoc(presensiLogCollection, {
        no_urut: noUrut,
        status_lama: STATUS_PROSES.BELUM_HADIR,
        status_baru: STATUS_PROSES.DI_ANTREAN,
        device_id: deviceId,
        nama_petugas: namaPetugas,
        waktu_server: serverTimestamp()
      })

      return { success: true, data: { noUrut, nama: data.nama } }
    } catch (err) {
      return { success: false, reason: err.message }
    } finally {
      isPending.value = false
    }
  }

  async function konfirmasiHadir(noUrut, deviceId, namaPetugas) {
    if (isPending.value) return { success: false, reason: 'PENDING' }
    isPending.value = true

    try {
      const dptRef = doc(db, 'dpt', String(noUrut))

      let snap
      try {
        snap = await getDocFromCache(dptRef)
      } catch {
        snap = await getDoc(dptRef)
      }
      if (!snap.exists()) return { success: false, reason: 'NOMOR_TIDAK_DITEMUKAN' }
      const data = snap.data()

      // Guard: hanya bisa konfirmasi kalau statusnya masih DI_ANTREAN.
      // Mencegah double-confirm dari tap ganda atau race antar KPPS 1 & 2.
      if (data.status_proses !== STATUS_PROSES.DI_ANTREAN) {
        return { success: false, reason: 'BUKAN_DI_ANTREAN' }
      }

      await updateDoc(dptRef, {
        status_proses: STATUS_PROSES.HADIR_SAH,
        waktu_konfirmasi: Date.now(),
        updated_by_device: deviceId,
        updated_by_nama: namaPetugas
      })

      await addDoc(presensiLogCollection, {
        no_urut: noUrut,
        status_lama: STATUS_PROSES.DI_ANTREAN,
        status_baru: STATUS_PROSES.HADIR_SAH,
        device_id: deviceId,
        nama_petugas: namaPetugas,
        waktu_server: serverTimestamp()
      })

      return { success: true }
    } catch (err) {
      return { success: false, reason: err.message }
    } finally {
      isPending.value = false
    }
  }

  /**
   * Batal/hapus dari antrean. Guard: hanya boleh batal kalau statusnya masih
   * DI_ANTREAN. Accepted edge case: kalau KPPS di device lain barengan
   * mengonfirmasi hadir persis di waktu yang sama (race antar 2 device),
   * kedua write client-side ini bisa saja "menang" tanpa saling tahu --
   * presensi_log tetap merekam keduanya untuk ditelusuri manual saat rekap.
   */
  async function batalkanAntrean(noUrut, deviceId, namaPetugas) {
    if (isPending.value) return { success: false, reason: 'PENDING' }
    isPending.value = true

    try {
      const dptRef = doc(db, 'dpt', String(noUrut))

      let snap
      try {
        snap = await getDocFromCache(dptRef)
      } catch {
        snap = await getDoc(dptRef)
      }
      if (!snap.exists()) return { success: false, reason: 'NOMOR_TIDAK_DITEMUKAN' }
      const data = snap.data()

      if (data.status_proses !== STATUS_PROSES.DI_ANTREAN) {
        return { success: false, reason: 'TIDAK_BISA_DIBATALKAN' }
      }

      await updateDoc(dptRef, {
        status_proses: STATUS_PROSES.BELUM_HADIR,
        waktu_masuk_antrean: null,
        updated_by_device: deviceId,
        updated_by_nama: namaPetugas
      })

      await addDoc(presensiLogCollection, {
        no_urut: noUrut,
        status_lama: STATUS_PROSES.DI_ANTREAN,
        status_baru: STATUS_PROSES.BELUM_HADIR,
        device_id: deviceId,
        nama_petugas: namaPetugas,
        waktu_server: serverTimestamp()
      })

      return { success: true }
    } catch (err) {
      return { success: false, reason: err.message }
    } finally {
      isPending.value = false
    }
  }

  async function cariByNoUrut(noUrut) {
    const snap = await getDoc(doc(db, 'dpt', String(noUrut)))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }

  return {
    antreanList,
    bufferCount,
    lastSyncAt,
    isPending,
    isBufferPenuh: () => bufferCount.value >= MAX_QUEUE_BUFFER,
    tambahKeAntrean,
    konfirmasiHadir,
    batalkanAntrean,
    cariByNoUrut
  }
}
