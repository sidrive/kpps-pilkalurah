<template>
  <div class="landing-wrap">
    <header>
      <h1>{{ config?.nama_tps || 'TPS Pilkalurah' }}</h1>
      <p class="tanggal">{{ config?.tanggal_pemilihan || '' }}</p>
      <span class="status-badge" :class="statusClass">{{ statusLabel }}</span>
    </header>

    <p class="intro">
      Pantau proses pemilihan secara langsung di halaman ini. Tidak perlu login.
    </p>

    <div class="menu-grid">
      <router-link to="/display/presensi" class="menu-card">
        <span class="menu-icon">👥</span>
        <span class="menu-title">Status Kehadiran</span>
        <span class="menu-desc">Pantau jumlah pemilih yang sudah hadir</span>
      </router-link>

      <router-link to="/display/tally" class="menu-card">
        <span class="menu-icon">📊</span>
        <span class="menu-title">Penghitungan Suara</span>
        <span class="menu-desc">Pantau proses hitung suara secara langsung</span>
      </router-link>

      <router-link to="/display/hasil-akhir" class="menu-card">
        <span class="menu-icon">📋</span>
        <span class="menu-title">Hasil Akhir</span>
        <span class="menu-desc">Lihat hasil resmi setelah penghitungan selesai</span>
      </router-link>
    </div>

    <div class="petugas-section">
      <router-link to="/login" class="btn-login">
        🔒 Login Petugas
      </router-link>
      <p class="petugas-hint">Khusus anggota KPPS yang bertugas di TPS ini.</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { STATUS_TPS } from '../config/constants.js'

const { config } = useTpsConfig()

const statusLabel = computed(() => {
  switch (config.value?.status_tps) {
    case STATUS_TPS.PRESENSI_OPEN: return 'Presensi Berlangsung'
    case STATUS_TPS.PRESENSI_LOCKED: return 'Penghitungan Berlangsung'
    case STATUS_TPS.TALLY_DONE: return 'Hasil Final'
    default: return 'Memuat...'
  }
})
const statusClass = computed(() => {
  switch (config.value?.status_tps) {
    case STATUS_TPS.TALLY_DONE: return 'status-done'
    case STATUS_TPS.PRESENSI_LOCKED: return 'status-progress'
    default: return 'status-open'
  }
})
</script>

<style scoped>
.landing-wrap {
  max-width: 480px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 3rem;
}

header {
  text-align: center;
  margin-bottom: 1.5rem;
}
h1 {
  font-size: 1.6rem;
}
.tanggal {
  color: #6b6b66;
  margin-bottom: 0.75rem;
}
.status-badge {
  display: inline-block;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.85rem;
}
.status-open { background: #fbeee0; color: var(--color-amber-dark); }
.status-progress { background: #dde8f0; color: var(--color-navy); }
.status-done { background: #e2f1e8; color: var(--color-green); }

.intro {
  text-align: center;
  color: #6b6b66;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.menu-grid {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-bottom: 2.5rem;
}

.menu-card {
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  padding: 1.1rem;
  text-decoration: none;
  color: var(--color-ink);
}
.menu-icon {
  font-size: 1.6rem;
  margin-bottom: 0.4rem;
}
.menu-title {
  font-weight: 700;
  font-size: 1.05rem;
}
.menu-desc {
  color: #6b6b66;
  font-size: 0.85rem;
  margin-top: 0.2rem;
}

.petugas-section {
  border-top: 1px solid var(--color-line);
  padding-top: 1.5rem;
  text-align: center;
}
.btn-login {
  display: inline-block;
  background: var(--color-navy);
  color: white;
  font-weight: 700;
  padding: 0.9rem 2rem;
  border-radius: var(--radius);
  text-decoration: none;
}
.petugas-hint {
  margin-top: 0.6rem;
  font-size: 0.8rem;
  color: #a09a8a;
}
</style>
