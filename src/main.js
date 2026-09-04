import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import { auth, ensureSignedIn } from './config/firebase.js'
import { getRedirectResult } from 'firebase/auth'
import './style.css'

async function boot() {
  try {
    // Selesaikan alur Google Sign-In kalau device baru kembali dari
    // halaman redirect OAuth Google. Kalau tidak ada redirect pending,
    // ini langsung resolve tanpa efek apa pun.
    await getRedirectResult(auth)
  } catch (err) {
    console.error('Gagal memproses hasil login Google:', err)
  }

  try {
    // Fallback anonymous SIGN-IN -- hanya jalan kalau belum ada sesi sama
    // sekali (anonim maupun Google). Kalau device sebelumnya sudah login
    // Google, sesi itu tetap dipertahankan (tidak ditimpa jadi anonim).
    await ensureSignedIn()
  } catch (err) {
    console.error('Gagal sign-in anonim:', err)
  }

  createApp(App).use(router).mount('#app')
}

boot()
