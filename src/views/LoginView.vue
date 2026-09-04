<template>
  <div class="login-wrap">
    <h1>Login Petugas</h1>

    <div v-if="checking" class="status-message">
      <p>Memeriksa akses...</p>
    </div>

    <div v-else-if="!currentUser || currentUser.isAnonymous">
      <p class="intro">Masuk dengan akun Google yang sudah didaftarkan sebagai petugas KPPS.</p>
      <p v-if="loginError" class="login-error">{{ loginError }}</p>
      <button class="btn-google" :disabled="loggingIn" @click="handleLogin">
        {{ loggingIn ? 'Membuka Google...' : 'Masuk dengan Google' }}
      </button>
    </div>

    <div v-else-if="!authorized" class="status-message denied">
      <p><strong>{{ currentUser.email }}</strong> belum terdaftar sebagai petugas.</p>
      <p class="hint">Hubungi admin untuk didaftarkan (email perlu ditambahkan ke daftar akses).</p>
      <button class="btn-secondary" @click="handleLogout">Coba Akun Lain</button>
    </div>

    <div v-else class="status-message success">
      <p>✓ Berhasil masuk sebagai {{ currentUser.email }}</p>
      <p class="hint">Mengalihkan...</p>
    </div>

    <router-link to="/" class="back-link">← Kembali ke halaman publik</router-link>
  </div>
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
    if (authorized.value) {
      setTimeout(() => router.push({ name: 'setup' }), 800)
    }
  }
  checking.value = false
}

// Pantau keduanya. authChecked dapat berubah menjadi true tanpa perubahan
// referensi currentUser yang sempat terlihat komponen, khususnya saat state
// Auth sudah dipulihkan sebelum LoginView selesai di-mount.
watch([currentUser, authChecked], evaluate, { immediate: true })

async function handleLogin() {
  loginError.value = ''
  loggingIn.value = true
  try {
    await loginWithGoogle()
    // Browser biasa selesai lewat popup; PWA standalone kembali lewat
    // redirect dan evaluate() jalan dari perubahan state Firebase Auth.
  } catch (err) {
    console.error('Login Google gagal:', err)
    loginError.value = err?.code
      ? `Login Google gagal (${err.code}). Silakan coba lagi.`
      : 'Login Google gagal. Silakan coba lagi.'
  } finally {
    loggingIn.value = false
  }
}

async function handleLogout() {
  await logout()
  authorized.value = false
}
</script>

<style scoped>
.login-wrap {
  max-width: 400px;
  margin: 15vh auto 0;
  padding: 0 1.25rem;
  text-align: center;
}

h1 {
  margin-bottom: 1.5rem;
}

.intro {
  color: #6b6b66;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.login-error {
  color: var(--color-red);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.btn-google {
  background: var(--color-navy);
  color: white;
  font-weight: 700;
  padding: 0.9rem 1.5rem;
  width: 100%;
}

.btn-google:disabled {
  cursor: wait;
  opacity: 0.7;
}

.status-message {
  padding: 1.5rem;
  border-radius: var(--radius);
  margin-bottom: 1.5rem;
}
.status-message.denied {
  background: #f6e4e1;
  color: var(--color-red);
}
.status-message.success {
  background: #e2f1e8;
  color: var(--color-green);
}
.hint {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  opacity: 0.85;
}

.btn-secondary {
  background: white;
  border: 2px solid var(--color-line);
  margin-top: 0.75rem;
}

.back-link {
  display: block;
  margin-top: 1.5rem;
  color: #6b6b66;
  font-size: 0.9rem;
  text-decoration: none;
}
</style>
