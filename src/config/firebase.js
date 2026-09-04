import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

// TODO: ganti dengan config project Firebase kamu sendiri
// (Firebase Console > Project Settings > General > Your apps)
const firebaseConfig = {
  apiKey: 'GANTI_DENGAN_API_KEY',
  authDomain: 'GANTI.firebaseapp.com',
  projectId: 'GANTI_PROJECT_ID',
  storageBucket: 'GANTI.appspot.com',
  messagingSenderId: 'GANTI',
  appId: 'GANTI'
}

export const app = initializeApp(firebaseConfig)

// Offline persistence WAJIB aktif dan multi-tab, sesuai strategi offline-first.
// Ini yang membuat query DPT & write presensi tetap instan walau device offline.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
})

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

/**
 * Anonymous Auth: dipilih (bukan Firebase Auth penuh) karena app ini dipakai
 * sendiri di satu TPS, bukan multi-tenant publik. Tujuannya HANYA supaya
 * Firestore Security Rules bisa mensyaratkan `request.auth != null` --
 * mencegah akses baca/tulis publik ke data pemilih & hasil tally dari
 * siapa pun di internet yang tahu firebaseConfig ini.
 *
 * PIN Ketua KPPS (lihat useTpsConfig.js) tetap jadi gate terpisah untuk
 * aksi sensitif (lock presensi, submit tally) -- anonymous auth ini
 * bukan pengganti PIN, hanya lapisan keamanan Firestore-level.
 */
export function ensureSignedIn() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      if (user) {
        resolve(user)
      } else {
        signInAnonymously(auth).then((cred) => resolve(cred.user)).catch(reject)
      }
    })
  })
}
