<template>
  <main class="setup-page">
    <section class="setup-card">
      <div class="header-icon">⌘</div>
      <p class="eyebrow">SETUP PERANGKAT</p>
      <h1>Selamat datang, {{ nama || 'Petugas' }}</h1>
      <p class="intro">Lengkapi nama dan pilih peran yang akan digunakan di perangkat ini.</p>

      <label>Nama Petugas<input v-model="nama" class="input-control" type="text" placeholder="Nama lengkap petugas"></label>
      <fieldset>
        <legend>Pilih Peran</legend>
        <label class="role-card" :class="{ selected: selectedRole === ROLE.PETUGAS_DEPAN }">
          <input v-model="selectedRole" type="radio" :value="ROLE.PETUGAS_DEPAN">
          <span class="role-icon">⌕</span><span><strong>Petugas Depan</strong><small>Input pemilih, lihat antrean, konfirmasi/batal</small></span><i>›</i>
        </label>
        <div class="role-card kpps-role" :class="{ selected: [ROLE.KPPS_1, ROLE.KPPS_2].includes(selectedRole) }">
          <span class="role-icon">☷</span>
          <span class="role-copy"><strong>Anggota KPPS</strong><small>Input pemilih, lihat antrean, konfirmasi/batal</small></span>
          <span class="kpps-options" aria-label="Pilih nomor anggota KPPS">
            <label :class="{ active: selectedRole === ROLE.KPPS_1 }"><input v-model="selectedRole" type="radio" :value="ROLE.KPPS_1">KPPS 1</label>
            <label :class="{ active: selectedRole === ROLE.KPPS_2 }"><input v-model="selectedRole" type="radio" :value="ROLE.KPPS_2">KPPS 2</label>
          </span>
        </div>
        <label class="role-card" :class="{ selected: selectedRole === ROLE.KETUA }">
          <input v-model="selectedRole" type="radio" :value="ROLE.KETUA">
          <span class="role-icon">♜</span><span><strong>Ketua KPPS</strong><small>Kelola tally, rekapitulasi, dan penguncian</small></span><i>›</i>
        </label>
      </fieldset>

      <button class="btn-primary continue" :disabled="!nama || !selectedRole" @click="lanjut">Lanjutkan →</button>
      <div class="meta"><span class="mono">DEVICE {{ deviceId.slice(0, 8).toUpperCase() }}</span><button @click="handleLogout">Logout {{ currentUser?.email }}</button></div>
      <router-link to="/admin" class="admin-link">⚙ Kelola Calon & Akses Petugas</router-link>
    </section>
  </main>
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
const nama = ref(''); const selectedRole = ref('')
onMounted(() => { if (currentUser.value?.displayName) nama.value = currentUser.value.displayName })
function lanjut() {
  setNamaPetugas(nama.value.trim()); setRole(selectedRole.value)
  if (selectedRole.value === ROLE.KETUA) router.push({ name:'tally' })
  else router.push({ name:'kpps' })
}
async function handleLogout() { await logout(); router.push({ name:'landing' }) }
</script>

<style scoped>
.setup-page { min-height:100vh; display:grid; place-items:center; padding:1.5rem 1rem; }
.setup-card { width:min(100%,480px); padding:2rem; background:#fff; border-radius:18px; box-shadow:var(--shadow-card); }
.header-icon { display:grid; place-items:center; width:52px; height:52px; margin:0 auto .8rem; color:var(--color-amber-dark); background:#fff8ed; border-radius:50%; font-size:1.4rem; }
.eyebrow { margin:0; color:var(--color-amber-dark); font-size:.64rem; font-weight:850; text-align:center; letter-spacing:.15em; }
h1 { margin:.35rem 0; color:var(--color-navy-dark); text-align:center; font-size:1.45rem; }
.intro { margin:0 auto 1.35rem; max-width:340px; color:var(--color-muted); text-align:center; font-size:.8rem; line-height:1.5; }
.setup-card > label { display:flex; flex-direction:column; gap:.35rem; margin-bottom:1rem; color:var(--color-navy-dark); font-size:.77rem; font-weight:750; }
fieldset { border:0; padding:0; margin:0; }
legend { margin-bottom:.5rem; color:var(--color-navy-dark); font-size:.77rem; font-weight:750; }
.role-card { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:.8rem; min-height:68px; padding:.75rem; margin-bottom:.55rem; border:1px solid var(--color-line); border-radius:11px; cursor:pointer; }
.role-card.selected { border-color:var(--color-navy); background:var(--color-navy-soft); box-shadow:inset 3px 0 var(--color-navy); }
.role-card > input, .kpps-options input { position:absolute; opacity:0; pointer-events:none; }
.role-icon { display:grid; place-items:center; width:40px; height:40px; color:var(--color-navy); background:var(--color-navy-soft); border-radius:9px; font-weight:900; }
.role-card span:nth-of-type(2), .role-copy { display:flex; flex-direction:column; }
.role-card strong { color:var(--color-navy-dark); font-size:.86rem; }
.role-card small { color:var(--color-muted); font-size:.68rem; margin-top:.15rem; }
.role-card i { color:var(--color-muted); font-style:normal; font-size:1.4rem; }
.kpps-role { cursor:default; }
.kpps-options { display:flex; gap:.3rem; }
.kpps-options label { position:relative; padding:.45rem .55rem; color:var(--color-muted); background:var(--color-bg); border:1px solid var(--color-line); border-radius:7px; cursor:pointer; font-size:.62rem; font-weight:800; }
.kpps-options label.active { color:#fff; background:var(--color-navy); border-color:var(--color-navy); }
.continue { width:100%; margin-top:.65rem; }
.meta { display:flex; justify-content:space-between; align-items:center; gap:.5rem; margin-top:1rem; color:var(--color-faint); font-size:.58rem; }
.meta button { min-height:auto; padding:0; color:var(--color-muted); background:none; font-size:.65rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.admin-link { display:block; margin-top:.9rem; color:var(--color-navy); text-align:center; text-decoration:none; font-size:.72rem; font-weight:700; }
@media (max-width:480px){ .setup-card{padding:1.4rem 1rem;} }
</style>
