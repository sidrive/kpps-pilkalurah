import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import LoginView from '../views/LoginView.vue'
import SetupView from '../views/SetupView.vue'
import KppsView from '../views/KppsView.vue'
import TallyView from '../views/TallyView.vue'
import RekapView from '../views/RekapView.vue'
import AdminView from '../views/AdminView.vue'
import DptCheckView from '../views/DptCheckView.vue'
import PresensiDisplayView from '../views/PresensiDisplayView.vue'
import TallyDisplayView from '../views/TallyDisplayView.vue'
import HasilAkhirView from '../views/HasilAkhirView.vue'
import { isAuthorizedPetugas } from '../composables/useAuth.js'

const routes = [
  // Publik -- tanpa login sama sekali, dashboard untuk warga
  { path: '/', name: 'landing', component: LandingView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/cek-dpt', name: 'cek-dpt', component: DptCheckView },

  // Fitur petugas -- wajib Google Sign-In + email ada di authorized_emails
  { path: '/setup', name: 'setup', component: SetupView, meta: { requiresAuth: true } },
  { path: '/petugas-depan', name: 'petugas-depan', component: KppsView, meta: { requiresAuth: true } },
  { path: '/kpps', name: 'kpps', component: KppsView, meta: { requiresAuth: true } },
  { path: '/tally', name: 'tally', component: TallyView, meta: { requiresAuth: true } },
  { path: '/rekap', name: 'rekap', component: RekapView, meta: { requiresAuth: true } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { requiresAuth: true } },

  // Layar publik read-only, dibuka di device/laptop terpisah menghadap saksi/publik.
  // Tidak ada gate auth karena hanya menampilkan data, tidak ada aksi tulis.
  { path: '/display/presensi', name: 'display-presensi', component: PresensiDisplayView },
  { path: '/display/tally', name: 'display-tally', component: TallyDisplayView },
  { path: '/display/hasil-akhir', name: 'display-hasil-akhir', component: HasilAkhirView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * Guard ini adalah lapisan UX saja (supaya petugas yang belum login tidak
 * nyasar ke halaman kerja lalu semua tombolnya gagal). Keamanan
 * SESUNGGUHNYA tetap di firestore.rules -- jadi walau guard ini berhasil
 * di-bypass (misal lewat DevTools), Firestore tetap menolak write dari
 * akun yang tidak ada di authorized_emails.
 */
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const authorized = await isAuthorizedPetugas()
  if (!authorized) return { name: 'login' }
  return true
})

export default router
