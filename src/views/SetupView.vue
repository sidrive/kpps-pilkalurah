<template>
  <div class="setup-wrap">
    <h1>Setup Device</h1>
    <p class="subtitle mono">device: {{ deviceId.slice(0, 8) }}</p>

    <label>
      Nama Petugas
      <input v-model="nama" type="text" placeholder="Nama lengkap petugas" />
    </label>

    <label>
      Peran di device ini
      <select v-model="selectedRole">
        <option value="" disabled>Pilih peran</option>
        <option :value="ROLE.PETUGAS_DEPAN">Petugas Depan (Keamanan)</option>
        <option :value="ROLE.KPPS_1">KPPS 1</option>
        <option :value="ROLE.KPPS_2">KPPS 2</option>
        <option :value="ROLE.KETUA">Ketua KPPS</option>
      </select>
    </label>

    <button class="btn-primary" :disabled="!nama || !selectedRole" @click="lanjut">
      Lanjut
    </button>

    <button class="btn-logout" @click="handleLogout">
      Logout ({{ currentUser?.email }})
    </button>

    <router-link to="/admin" class="link-admin">
      ⚙️ Kelola Calon & Akses Petugas →
    </router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDevice } from '../composables/useDevice.js'
import { useAuth } from '../composables/useAuth.js'
import { ROLE } from '../config/constants.js'

const router = useRouter()
const { deviceId, setRole, setNamaPetugas } = useDevice()
const { currentUser, logout } = useAuth()

const nama = ref('')
const selectedRole = ref('')

// Prefill nama dari akun Google supaya petugas tidak perlu ngetik ulang --
// tetap bisa diedit kalau mau pakai nama panggilan/berbeda.
onMounted(() => {
  if (currentUser.value?.displayName) {
    nama.value = currentUser.value.displayName
  }
})

function lanjut() {
  setNamaPetugas(nama.value.trim())
  setRole(selectedRole.value)

  if (selectedRole.value === ROLE.PETUGAS_DEPAN) {
    router.push({ name: 'petugas-depan' })
  } else if (selectedRole.value === ROLE.KETUA) {
    // Ketua bertanggung jawab atas Modul 2 (Tally) & PIN gate
    router.push({ name: 'tally' })
  } else {
    // KPPS_1, KPPS_2 pakai tampilan meja registrasi
    router.push({ name: 'kpps' })
  }
}

async function handleLogout() {
  await logout()
  router.push({ name: 'landing' })
}
</script>

<style scoped>
.setup-wrap {
  max-width: 420px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.subtitle {
  color: #6b6b66;
  margin-top: -0.5rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-weight: 600;
}

input, select {
  min-height: var(--touch-min);
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 0 1rem;
  font-size: 1.1rem;
  background: white;
}

.btn-primary {
  background: var(--color-navy);
  color: white;
  font-weight: 600;
  margin-top: 0.5rem;
}

.btn-logout {
  background: white;
  border: 1px solid var(--color-line);
  color: #6b6b66;
  font-size: 0.85rem;
}

.link-admin {
  display: block;
  text-align: center;
  color: var(--color-navy);
  font-weight: 600;
  text-decoration: none;
  margin-top: -0.5rem;
}
</style>
