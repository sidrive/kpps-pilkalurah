import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyC5H_EhFu0lHSXQ2IpUu_Eg8bTM7a27xBE',
  authDomain: 'kpps-pilkalurah.firebaseapp.com',
  projectId: 'kpps-pilkalurah',
  storageBucket: 'kpps-pilkalurah.firebasestorage.app',
  messagingSenderId: '187148279102',
  appId: '1:187148279102:web:87788a8999f7767bf9e06f'
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
