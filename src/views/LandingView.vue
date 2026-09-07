<template>
  <main class="landing-page">
    <nav class="topbar">
      <div class="brand">
        <span class="brand-mark mono">KP</span>
        <span><strong>KPPS PILKALURAH</strong><small>{{ config?.nama_tps || 'Sistem Informasi TPS' }}</small></span>
      </div>
      <router-link to="/login" class="login-link">Login Petugas</router-link>
    </nav>

    <section class="hero">
      <span class="eyebrow">PORTAL INFORMASI PEMILIH</span>
      <h1>Pantau proses pemilihan<br>secara transparan.</h1>
      <p>Informasi kehadiran dan penghitungan suara diperbarui langsung dari TPS. Tidak perlu login.</p>
      <div class="event-meta">
        <span class="status-badge" :class="statusClass"><i />{{ statusLabel }}</span>
        <span>{{ config?.tanggal_pemilihan || 'Pemilihan Lurah' }}</span>
      </div>
    </section>

    <section class="menu-grid" aria-label="Informasi publik">
      <router-link to="/display/presensi" class="menu-card">
        <span class="menu-icon">♟</span>
        <span class="menu-copy"><small>PARTISIPASI</small><strong>Status Kehadiran</strong><em>Pantau jumlah pemilih yang sudah hadir</em></span>
        <span class="arrow">→</span>
      </router-link>
      <router-link to="/display/tally" class="menu-card">
        <span class="menu-icon">▥</span>
        <span class="menu-copy"><small>REAL-TIME</small><strong>Penghitungan Suara</strong><em>Pantau proses hitung suara secara langsung</em></span>
        <span class="arrow">→</span>
      </router-link>
      <router-link to="/display/hasil-akhir" class="menu-card">
        <span class="menu-icon">✓</span>
        <span class="menu-copy"><small>TERVERIFIKASI</small><strong>Hasil Akhir TPS</strong><em>Lihat hasil setelah penghitungan dikunci</em></span>
        <span class="arrow">→</span>
      </router-link>
    </section>

    <footer>Asisten Digital KPPS · Data TPS diperbarui secara real-time</footer>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { STATUS_TPS } from '../config/constants.js'

const { config } = useTpsConfig()
const statusLabel = computed(() => {
  if (config.value?.status_tps === STATUS_TPS.PRESENSI_LOCKED) return 'Penghitungan Berlangsung'
  if (config.value?.status_tps === STATUS_TPS.TALLY_DONE) return 'Hasil Final'
  return config.value ? 'Pemungutan Berlangsung' : 'Memuat Status'
})
const statusClass = computed(() => config.value?.status_tps === STATUS_TPS.TALLY_DONE ? 'done' : config.value?.status_tps === STATUS_TPS.PRESENSI_LOCKED ? 'progress' : 'open')
</script>

<style scoped>
.landing-page { min-height:100vh; padding-bottom:2rem; background:linear-gradient(180deg,#f5f8fa 0,#edf3f6 100%); }
.topbar { display:flex; align-items:center; justify-content:space-between; width:min(100% - 3rem,1080px); margin:auto; padding:1.4rem 0; }
.brand { display:flex; align-items:center; gap:.7rem; color:var(--color-navy-dark); }
.brand-mark { display:grid; place-items:center; width:42px; height:42px; border:2px solid var(--color-amber); border-radius:50%; color:var(--color-amber-dark); font-size:.68rem; font-weight:900; }
.brand span:last-child { display:flex; flex-direction:column; }
.brand strong { font-size:.82rem; letter-spacing:.08em; }
.brand small { color:var(--color-muted); font-size:.68rem; }
.login-link { padding:.65rem 1rem; color:#fff; background:var(--color-navy-dark); border-radius:8px; text-decoration:none; font-size:.78rem; font-weight:750; }
.hero { width:min(100% - 3rem,1080px); margin:clamp(2rem,6vw,5.5rem) auto 2.8rem; }
.eyebrow { color:var(--color-amber-dark); font-size:.7rem; font-weight:850; letter-spacing:.18em; }
h1 { max-width:800px; margin:.75rem 0 1rem; color:var(--color-navy-dark); font-size:clamp(2.25rem,6vw,4.9rem); line-height:1.01; letter-spacing:-.055em; }
.hero p { max-width:600px; margin-bottom:1.4rem; color:var(--color-muted); line-height:1.65; }
.event-meta { display:flex; align-items:center; gap:1rem; color:var(--color-muted); font-size:.78rem; }
.status-badge { display:inline-flex; align-items:center; gap:.45rem; padding:.42rem .75rem; border:1px solid var(--color-line); border-radius:99px; background:white; color:var(--color-navy-dark); font-weight:750; box-shadow:0 5px 12px rgba(6,45,61,.05); }
.status-badge i { width:7px; height:7px; border-radius:50%; background:var(--color-amber); }
.status-badge.done i { background:var(--color-green); }
.status-badge.progress i { background:var(--color-blue); }
.menu-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; width:min(100% - 3rem,1080px); margin:auto; }
.menu-card { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:1rem; min-height:130px; padding:1.25rem; color:var(--color-ink); background:#fff; border:1px solid rgba(6,45,61,.07); border-radius:var(--radius); box-shadow:var(--shadow-card); text-decoration:none; transition:transform .18s ease,box-shadow .18s ease; }
.menu-card:hover { transform:translateY(-3px); box-shadow:0 16px 34px rgba(6,45,61,.12); }
.menu-icon { display:grid; place-items:center; width:48px; height:48px; border-radius:12px; background:var(--color-navy-soft); color:var(--color-navy); font-size:1.2rem; font-weight:900; }
.menu-copy { display:flex; flex-direction:column; min-width:0; }
.menu-copy small { color:var(--color-amber-dark); font-size:.62rem; font-weight:850; letter-spacing:.12em; }
.menu-copy strong { margin:.2rem 0; font-size:1rem; }
.menu-copy em { color:var(--color-muted); font-size:.75rem; font-style:normal; line-height:1.35; }
.arrow { color:var(--color-navy); font-size:1.15rem; }
footer { width:min(100% - 3rem,1080px); margin:2rem auto 0; color:var(--color-faint); font-size:.7rem; text-align:center; }
@media (max-width:800px) { .menu-grid { grid-template-columns:1fr; } .menu-card { min-height:105px; } }
@media (max-width:520px) { .topbar,.hero,.menu-grid,footer { width:min(100% - 1.4rem,1080px); } .topbar { padding:1rem 0; } .brand small { display:none; } .hero { margin:2.5rem auto 2rem; } h1 br { display:none; } .event-meta { align-items:flex-start; flex-direction:column; gap:.65rem; } }
</style>
