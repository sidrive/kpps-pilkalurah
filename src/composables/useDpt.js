import { ref, computed, onUnmounted } from 'vue'
import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { STATUS_PROSES, MAX_QUEUE_BUFFER } from '../config/constants.js'
import { useVoterMaster } from './useVoterMaster.js'

/**
 * DPT master sekarang dibaca dari JSON lokal (`src/data/dpt-tps-004.json`).
 * Firestore hanya menyimpan state presensi yang berubah saat hari-H di
 * `presensi_status/{no_urut}`. Dokumen yang belum ada berarti BELUM_HADIR.
 *
 * Nomor kedatangan sengaja dibuat client-side (`max + 1` dari snapshot lokal),
 * mengikuti filosofi offline-first proyek ini. Sama seperti guard lama, ini
 * aman untuk 1 device Petugas Depan dan tap ganda di device yang sama, tapi
 * tidak menjamin nomor unik kalau 2 device memvalidasi bersamaan/offline.
 * `presensi_log` tetap menjadi audit trail untuk rekonsiliasi manual.
 */

const presensiStatusCollection = collection(db, 'presensi_status')
const presensiLogCollection = collection(db, 'presensi_log')

function defaultStatus(noUrut) {
  return {
    id: String(noUrut),
    no_urut: Number(noUrut),
    status_proses: STATUS_PROSES.BELUM_HADIR,
    nomor_kedatangan: null,
    waktu_validasi: null,
    waktu_masuk_antrean: null,
    waktu_konfirmasi: null,
    status_centang_manual: false,
    updated_by_device: '',
    updated_by_nama: ''
  }
}

function sortByArrival(a, b) {
  return (a.nomor_kedatangan ?? Number.MAX_SAFE_INTEGER) - (b.nomor_kedatangan ?? Number.MAX_SAFE_INTEGER)
    || (a.waktu_validasi ?? a.waktu_masuk_antrean ?? 0) - (b.waktu_validasi ?? b.waktu_masuk_antrean ?? 0)
    || String(a.updated_by_device || '').localeCompare(String(b.updated_by_device || ''))
    || Number(a.no_urut) - Number(b.no_urut)
}

export function useDpt() {
  const { voters, totalDpt: totalDptCount, findVoterByNoUrut } = useVoterMaster()
  const statusDocs = ref([])
  const lastSyncAt = ref(null)
  const isPending = ref(false)

  const unsubscribe = onSnapshot(presensiStatusCollection, (snapshot) => {
    statusDocs.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    lastSyncAt.value = Date.now()
  })

  onUnmounted(() => unsubscribe())

  const statusByNoUrut = computed(() => {
    const map = new Map()
    for (const item of statusDocs.value) map.set(Number(item.no_urut ?? item.id), item)
    return map
  })

  function mergeVoterStatus(voter, status = null) {
    if (!voter) return null
    return {
      ...voter,
      ...defaultStatus(voter.no_urut),
      ...(status || {}),
      id: String(voter.no_urut),
      no_urut: Number(voter.no_urut)
    }
  }

  function getStatus(noUrut) {
    return statusByNoUrut.value.get(Number(noUrut)) || defaultStatus(noUrut)
  }

  const allDpt = computed(() => voters.map((voter) => mergeVoterStatus(voter, statusByNoUrut.value.get(voter.no_urut))))
  const antreanList = computed(() => allDpt.value.filter((d) => d.status_proses === STATUS_PROSES.DI_ANTREAN).sort(sortByArrival))
  const arrivalList = computed(() => allDpt.value.filter((d) => d.nomor_kedatangan && d.status_proses !== STATUS_PROSES.BELUM_HADIR).sort(sortByArrival))
  const hadirList = computed(() => allDpt.value.filter((d) => d.status_proses === STATUS_PROSES.HADIR_SAH).sort(sortByArrival))
  const belumCentangManual = computed(() => hadirList.value.filter((d) => d.status_centang_manual === false))
  const bufferCount = computed(() => antreanList.value.length)
  const totalDpt = computed(() => totalDptCount)
  const jumlahHadir = computed(() => hadirList.value.length)
  const jumlahBelumHadir = computed(() => totalDpt.value - jumlahHadir.value)

  function nextNomorKedatangan() {
    const max = statusDocs.value.reduce((currentMax, item) => {
      if (item.status_proses === STATUS_PROSES.BELUM_HADIR) return currentMax
      return Math.max(currentMax, Number(item.nomor_kedatangan) || 0)
    }, 0)
    return max + 1
  }

  async function getStatusSnapshot(noUrut) {
    const statusRef = doc(db, 'presensi_status', String(noUrut))
    try {
      return await getDocFromCache(statusRef)
    } catch {
      return await getDoc(statusRef)
    }
  }

  async function tambahKeAntrean(noUrut, deviceId, namaPetugas) {
    if (isPending.value) return { success: false, reason: 'PENDING' }
    isPending.value = true

    try {
      const voter = findVoterByNoUrut(noUrut)
      if (!voter) return { success: false, reason: 'NOMOR_TIDAK_DITEMUKAN' }

      const current = getStatus(noUrut)
      if (current.status_proses !== STATUS_PROSES.BELUM_HADIR) return { success: false, reason: 'SUDAH_DIPROSES' }

      const nomorKedatangan = nextNomorKedatangan()
      const now = Date.now()
      const statusRef = doc(db, 'presensi_status', String(noUrut))
      await setDoc(statusRef, {
        no_urut: Number(noUrut),
        status_proses: STATUS_PROSES.DI_ANTREAN,
        nomor_kedatangan: nomorKedatangan,
        waktu_validasi: now,
        waktu_masuk_antrean: now,
        waktu_konfirmasi: null,
        waktu_batal: null,
        status_centang_manual: false,
        updated_by_device: deviceId,
        updated_by_nama: namaPetugas,
        updated_at: now
      })

      await addDoc(presensiLogCollection, {
        no_urut: Number(noUrut),
        nomor_kedatangan: nomorKedatangan,
        status_lama: STATUS_PROSES.BELUM_HADIR,
        status_baru: STATUS_PROSES.DI_ANTREAN,
        device_id: deviceId,
        nama_petugas: namaPetugas,
        waktu_client: now,
        waktu_server: serverTimestamp()
      })

      return { success: true, data: { noUrut: Number(noUrut), nama: voter.nama, nomor_kedatangan: nomorKedatangan } }
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
      const voter = findVoterByNoUrut(noUrut)
      if (!voter) return { success: false, reason: 'NOMOR_TIDAK_DITEMUKAN' }

      const snap = await getStatusSnapshot(noUrut)
      if (!snap.exists()) return { success: false, reason: 'BUKAN_DI_ANTREAN' }
      const data = snap.data()

      if (data.status_proses !== STATUS_PROSES.DI_ANTREAN) return { success: false, reason: 'BUKAN_DI_ANTREAN' }

      const now = Date.now()
      await updateDoc(doc(db, 'presensi_status', String(noUrut)), {
        status_proses: STATUS_PROSES.HADIR_SAH,
        waktu_konfirmasi: now,
        updated_by_device: deviceId,
        updated_by_nama: namaPetugas,
        updated_at: now
      })

      await addDoc(presensiLogCollection, {
        no_urut: Number(noUrut),
        nomor_kedatangan: data.nomor_kedatangan || null,
        status_lama: STATUS_PROSES.DI_ANTREAN,
        status_baru: STATUS_PROSES.HADIR_SAH,
        device_id: deviceId,
        nama_petugas: namaPetugas,
        waktu_client: now,
        waktu_server: serverTimestamp()
      })

      return { success: true }
    } catch (err) {
      return { success: false, reason: err.message }
    } finally {
      isPending.value = false
    }
  }

  async function batalkanAntrean(noUrut, deviceId, namaPetugas) {
    if (isPending.value) return { success: false, reason: 'PENDING' }
    isPending.value = true

    try {
      const snap = await getStatusSnapshot(noUrut)
      if (!snap.exists()) return { success: false, reason: 'NOMOR_TIDAK_DITEMUKAN' }
      const data = snap.data()

      if (data.status_proses !== STATUS_PROSES.DI_ANTREAN) return { success: false, reason: 'TIDAK_BISA_DIBATALKAN' }

      const now = Date.now()
      await updateDoc(doc(db, 'presensi_status', String(noUrut)), {
        status_proses: STATUS_PROSES.BELUM_HADIR,
        nomor_kedatangan: null,
        waktu_masuk_antrean: null,
        waktu_validasi: null,
        waktu_batal: now,
        updated_by_device: deviceId,
        updated_by_nama: namaPetugas,
        updated_at: now
      })

      await addDoc(presensiLogCollection, {
        no_urut: Number(noUrut),
        nomor_kedatangan: data.nomor_kedatangan || null,
        status_lama: STATUS_PROSES.DI_ANTREAN,
        status_baru: STATUS_PROSES.BELUM_HADIR,
        device_id: deviceId,
        nama_petugas: namaPetugas,
        waktu_client: now,
        waktu_server: serverTimestamp()
      })

      return { success: true }
    } catch (err) {
      return { success: false, reason: err.message }
    } finally {
      isPending.value = false
    }
  }

  async function tandaiCentangManual(noUrut) {
    await updateDoc(doc(db, 'presensi_status', String(noUrut)), {
      status_centang_manual: true,
      updated_at: Date.now()
    })
  }

  async function cariByNoUrut(noUrut) {
    const voter = findVoterByNoUrut(noUrut)
    return mergeVoterStatus(voter, getStatus(noUrut))
  }

  return {
    allDpt,
    antreanList,
    arrivalList,
    hadirList,
    belumCentangManual,
    bufferCount,
    totalDpt,
    jumlahHadir,
    jumlahBelumHadir,
    lastSyncAt,
    isPending,
    isBufferPenuh: () => bufferCount.value >= MAX_QUEUE_BUFFER,
    tambahKeAntrean,
    konfirmasiHadir,
    batalkanAntrean,
    tandaiCentangManual,
    cariByNoUrut
  }
}
