import { ref, computed } from 'vue'
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
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

  // Normalisasi ke lowercase -- dokumen authorized_emails dibuat lewat
  // scripts/bootstrap-firestore.mjs yang selalu men-lowercase email, jadi
  // lookup di sini harus konsisten atau akun yang seharusnya authorized
  // bisa gagal match hanya karena beda kapitalisasi.
  const email = user.email.toLowerCase()

  const cached = localStorage.getItem(AUTHORIZED_CACHE_KEY)
  if (cached === email) return true

  try {
    const snap = await getDoc(doc(db, 'authorized_emails', email))
    if (snap.exists()) {
      localStorage.setItem(AUTHORIZED_CACHE_KEY, email)
      return true
    }
    return false
  } catch (err) {
    // Offline & belum pernah tervalidasi sebelumnya di device ini --
    // tidak bisa dipastikan, jadi fail closed (anggap belum authorized),
    // bukan fail open. Petugas yang device-nya sudah pernah online sekali
    // untuk login tidak akan kena ini karena sudah ke-cache di atas.
    // Tetap dicetak ke console (bukan disembunyikan total) supaya error
    // permission-denied/network beneran kelihatan saat troubleshooting,
    // bukan cuma keliatan sebagai "belum terdaftar".
    console.error('checkAuthorized gagal membaca authorized_emails:', err)
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

  async function loginWithGoogle() {
    // App Android (Capacitor): popup/redirect OAuth tidak jalan di WebView,
    // jadi pakai Google Sign-In native lalu teruskan credential-nya ke
    // Firebase JS SDK (skipNativeAuth: true di capacitor.config.json) supaya
    // seluruh app tetap memakai satu sesi auth yang sama.
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle()
      const credential = GoogleAuthProvider.credential(result.credential?.idToken)
      return signInWithCredential(auth, credential)
    }

    // Browser biasa memakai popup agar hasil OAuth tidak bergantung pada
    // penyimpanan lintas-domain saat kembali dari redirect. PWA standalone
    // tetap memakai redirect karena popup sering diblokir di WebView/mobile.
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true

    if (isStandalone) {
      return signInWithRedirect(auth, googleProvider)
    }
    return signInWithPopup(auth, googleProvider)
  }

  async function logout() {
    localStorage.removeItem(AUTHORIZED_CACHE_KEY)
    await signOut(auth)
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut().catch(() => {})
    }
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
