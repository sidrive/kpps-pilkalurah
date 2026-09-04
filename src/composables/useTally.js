import { ref, computed, onUnmounted } from 'vue'
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config/firebase.js'
import { TIDAK_SAH_ID } from '../config/constants.js'

const tallyVotesCollection = collection(db, 'tally_votes')

/**
 * Kenapa TIDAK pakai counter field (misal tally_counts/{calon_id}.jumlah)
 * yang di-increment tiap tap: sama seperti masalah buffer antrean di
 * Modul 1, counter yang ditulis dari device yang sama berkali-kali dalam
 * waktu singkat (tap cepat berturut-turut saat menghitung banyak surat
 * suara) rawan terlewat/dobel kalau ditulis lewat increment() yang perlu
 * di-resolve ke server. Solusi: setiap tap = 1 dokumen baru di
 * `tally_votes` (append-only, mirip presensi_log), jumlah per calon
 * dihitung dari COUNT dokumen real-time -- konsisten dengan pola yang
 * sudah dipakai di useDpt.js.
 *
 * Undo: bukan hapus dokumen, tapi tandai `dibatalkan: true` -- supaya
 * tetap ada jejak audit kalau ada dispute saksi ("kenapa total surat
 * suara yang dibuka tidak sama dengan total suara yang tercatat").
 * Target undo adalah suara TERAKHIR yang dicatat secara keseluruhan
 * (lintas calon), bukan per-calon -- karena proses fisik menghitung
 * surat suara berurutan satu per satu, jadi kalau petugas salah tap,
 * yang perlu dibatalkan adalah tap yang barusan terjadi, apa pun
 * calonnya.
 */
export function useTally() {
  const votes = ref([])

  const unsubscribe = onSnapshot(
    query(tallyVotesCollection, where('dibatalkan', '==', false)),
    (snapshot) => {
      votes.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    }
  )
  onUnmounted(() => unsubscribe())

  // Hitungan per calon_id, dihitung on-the-fly dari votes (sudah realtime
  // dari cache lokal via onSnapshot) -- bukan dari counter terpisah.
  const countsByCalonId = computed(() => {
    const map = {}
    for (const v of votes.value) {
      map[v.calon_id] = (map[v.calon_id] || 0) + 1
    }
    return map
  })

  const totalSuaraSah = computed(() =>
    votes.value.filter((v) => v.calon_id !== TIDAK_SAH_ID).length
  )
  const totalTidakSah = computed(
    () => countsByCalonId.value[TIDAK_SAH_ID] || 0
  )
  const totalKeseluruhan = computed(() => totalSuaraSah.value + totalTidakSah.value)

  async function catatSuara(calonId, deviceId, namaPetugas) {
    await addDoc(tallyVotesCollection, {
      calon_id: calonId,
      dibatalkan: false,
      waktu: Date.now(), // client-generated, konsisten dengan pola di useDpt.js
      device_id: deviceId,
      nama_petugas: namaPetugas,
      waktu_server: serverTimestamp()
    })
  }

  /**
   * Undo suara terakhir (lintas calon, urut berdasarkan waktu client).
   * Accepted edge case: kalau 2 device menghitung bersamaan (tidak
   * disarankan -- idealnya hanya 1 device aktif mencatat saat penghitungan
   * resmi), "terakhir" bisa ambigu antar device karena urutan ditentukan
   * dari cache lokal masing-masing, bukan clock global. Untuk penghitungan
   * resmi di depan saksi, sebaiknya hanya 1 device yang input.
   */
  async function batalkanSuaraTerakhir() {
    if (votes.value.length === 0) return { success: false, reason: 'TIDAK_ADA_SUARA' }

    const terakhir = [...votes.value].sort((a, b) => b.waktu - a.waktu)[0]
    await updateDoc(doc(db, 'tally_votes', terakhir.id), { dibatalkan: true })
    return { success: true, calonId: terakhir.calon_id }
  }

  return {
    votes,
    countsByCalonId,
    totalSuaraSah,
    totalTidakSah,
    totalKeseluruhan,
    catatSuara,
    batalkanSuaraTerakhir
  }
}
