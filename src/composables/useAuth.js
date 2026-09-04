import { ref, computed } from 'vue'
import { signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../config/firebase.js'

const AUTHORIZED_CACHE_KEY = 'kpps_authorized_email'

const currentUser = ref(null)
const authChecked = ref(false)

onAuthStateChanged(auth, (user) => {
  currentUser.value = user
  authChecked.value = true
})

/**
 * Cek apakah email user saat ini ada di collection `authorized_emails`
 * (dokumen dengan ID = email persis, dibuat manual lewat Firestore console
 * oleh admin -- konsisten dengan pola PIN Ketua: tidak butuh Cloud
 * Functions/Admin SDK untuk kelola akses).
 *
 * Hasil positif di-cache ke localStorage supaya device yang sudah pernah
 * login & terverifikasi tetap bisa masuk walau offline di kunjungan
 * berikutnya. PENTING: cache ini CUMA gate UX (biar tidak nge-block
 * petugas yang sudah sah saat offline), BUKAN gate keamanan sesungguhnya.
 * Keamanan yang sebenarnya tetap di firestore.rules (exists() check
 * dievaluasi di server Firestore, bukan bisa dipalsukan dari client) --
 * jadi walau localStorage ini di-edit manual dari DevTools, Firestore
 * tetap menolak write kalau email yang login tidak benar-benar terdaftar.
 */
async function checkAuthorized(user) {
  if (!user || user.isAnonymous || !user.email) return false

  const cached = localStorage.getItem(AUTHORIZED_CACHE_KEY)
  if (cached === user.email) return true

  try {
    const snap = await getDoc(doc(db, 'authorized_emails', user.email))
    if (snap.exists()) {
      localStorage.setItem(AUTHORIZED_CACHE_KEY, user.email)
      return true
    }
    return false
  } catch {
    // Offline & belum pernah tervalidasi sebelumnya di device ini --
    // tidak bisa dipastikan, jadi fail closed (anggap belum authorized),
    // bukan fail open. Petugas yang device-nya sudah pernah online sekali
    // untuk login tidak akan kena ini karena sudah ke-cache di atas.
    return false
  }
}

/** Dipakai di router guard (di luar komponen Vue, jadi bukan lewat useAuth()). */
export function isAuthorizedPetugas() {
  return new Promise((resolve) => {
    async function resolveCheck() {
      resolve(await checkAuthorized(currentUser.value))
    }
    if (authChecked.value) {
      resolveCheck()
    } else {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe()
        resolveCheck()
      })
    }
  })
}

export function useAuth() {
  const isGoogleUser = computed(
    () => Boolean(currentUser.value && !currentUser.value.isAnonymous)
  )

  function loginWithGoogle() {
    // signInWithRedirect (bukan signInWithPopup) dipilih karena lebih
    // reliable di PWA yang di-install ke homescreen / WebView Android --
    // popup sering diblokir atau gagal render di konteks itu.
    return signInWithRedirect(auth, googleProvider)
  }

  async function logout() {
    localStorage.removeItem(AUTHORIZED_CACHE_KEY)
    await signOut(auth)
  }

  return {
    currentUser,
    authChecked,
    isGoogleUser,
    loginWithGoogle,
    logout,
    checkAuthorized: () => checkAuthorized(currentUser.value)
  }
}
