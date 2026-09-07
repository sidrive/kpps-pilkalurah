<template>
  <main class="auth-page">
    <router-link to="/" class="brand"><span class="seal mono">KP</span><strong>KPPS PILKALURAH</strong></router-link>
    <section class="login-card">
      <div class="crest mono">KP</div>
      <h1>Login Petugas</h1>
      <p class="intro">Masuk dengan akun Google yang telah didaftarkan untuk mengakses ruang kerja KPPS.</p>

      <div v-if="checking" class="status-message">Memeriksa akses akun…</div>
      <template v-else-if="!currentUser || currentUser.isAnonymous">
        <p v-if="loginError" class="status-message denied">{{ loginError }}</p>
        <button class="btn-google" :disabled="loggingIn" @click="handleLogin">
          <span class="google">G</span>{{ loggingIn ? 'Membuka Google…' : 'Lanjutkan dengan Google' }}
        </button>
      </template>
      <div v-else-if="!authorized" class="status-message denied">
        <strong>{{ currentUser.email }}</strong> belum terdaftar sebagai petugas.
        <small>Hubungi admin TPS untuk memperoleh akses.</small>
        <button class="btn-secondary" @click="handleLogout">Coba Akun Lain</button>
      </div>
      <div v-else class="status-message success">✓ Berhasil masuk sebagai {{ currentUser.email }}<small>Mengalihkan ke setup device…</small></div>

      <p class="secure-note">🔒 Akses diamankan dengan Firebase Authentication</p>
    </section>
    <router-link to="/" class="back-link">← Kembali ke halaman publik</router-link>
  </main>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'

const router = useRouter()
const { currentUser, authChecked, loginWithGoogle, logout, checkAuthorized } = useAuth()
const checking = ref(true)
const authorized = ref(false)
const loggingIn = ref(false)
const loginError = ref('')
async function evaluate() {
  if (!authChecked.value) return
  checking.value = true
  if (currentUser.value && !currentUser.value.isAnonymous) {
    authorized.value = await checkAuthorized()
    if (authorized.value) setTimeout(() => router.push({ name: 'setup' }), 800)
  }
  checking.value = false
}
watch([currentUser, authChecked], evaluate, { immediate: true })
async function handleLogin() {
  loginError.value = ''; loggingIn.value = true
  try { await loginWithGoogle() }
  catch (err) {
    console.error('Login Google gagal:', err)
    loginError.value = err?.code ? `Login Google gagal (${err.code}). Silakan coba lagi.` : 'Login Google gagal. Silakan coba lagi.'
  } finally { loggingIn.value = false }
}
async function handleLogout() { await logout(); authorized.value = false }
</script>

<style scoped>
.auth-page { min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:2rem 1rem; background:radial-gradient(circle at 50% 20%,#f9fbfc,#edf3f6 58%); }
.brand { display:flex; align-items:center; gap:.6rem; color:var(--color-navy-dark); text-decoration:none; font-size:.76rem; letter-spacing:.08em; }
.seal { display:grid; place-items:center; width:36px; height:36px; color:var(--color-amber-dark); border:2px solid var(--color-amber); border-radius:50%; font-size:.58rem; }
.login-card { width:min(100%,440px); margin:auto 0 1rem; padding:2.4rem 2.2rem 1.5rem; text-align:center; background:#fff; border:1px solid rgba(6,45,61,.07); border-radius:18px; box-shadow:0 20px 55px rgba(6,45,61,.11); }
.crest { display:grid; place-items:center; width:72px; height:72px; margin:0 auto 1.25rem; color:var(--color-amber-dark); border:3px double var(--color-amber); border-radius:50%; font-weight:900; }
h1 { margin-bottom:.6rem; color:var(--color-navy-dark); font-size:1.65rem; }
.intro { color:var(--color-muted); font-size:.86rem; line-height:1.55; margin-bottom:1.5rem; }
.btn-google { display:flex; align-items:center; justify-content:center; gap:.75rem; width:100%; color:var(--color-ink); background:#fff; border:1px solid var(--color-line); font-weight:700; font-size:.9rem; }
.google { display:grid; place-items:center; width:25px; height:25px; color:#4285f4; border:1px solid var(--color-line); border-radius:50%; font-weight:900; }
.status-message { padding:1rem; border-radius:10px; background:var(--color-navy-soft); color:var(--color-navy); font-size:.86rem; }
.status-message small { display:block; margin-top:.4rem; }
.status-message.denied { background:#f9e7e8; color:var(--color-red); }
.status-message.success { background:#e4f3ed; color:var(--color-green); }
.status-message .btn-secondary { width:100%; margin-top:1rem; }
.secure-note { margin:1.4rem 0 0; color:var(--color-faint); font-size:.65rem; }
.back-link { margin:auto 0 0; color:var(--color-muted); font-size:.75rem; text-decoration:none; }
</style>
