<template>
  <main class="landing-page">
    <div class="ambient ambient-one" />
    <div class="ambient ambient-two" />
    <div class="ambient ambient-three" />

    <nav class="topbar">
      <div class="brand">
        <span class="brand-mark mono">KP</span>
        <span class="brand-copy"><strong>KPPS PILKALURAH</strong><small>{{ config?.nama_tps || 'Sistem Informasi TPS' }}</small></span>
      </div>
      <div class="topbar-actions">
        <span class="status-badge" :class="statusClass"><i />{{ statusLabel }}</span>
        <router-link to="/login" class="login-link">Login Petugas</router-link>
      </div>
    </nav>

    <section class="hero-dashboard">
      <div class="hero-copy">
        <span class="eyebrow">PORTAL INFORMASI TPS</span>
        <h1>Pantau suasana TPS secara langsung.</h1>
        <p>Informasi kehadiran, antrean, dan penghitungan suara diperbarui dari TPS agar warga dapat mengikuti proses pemilihan dengan transparan.</p>
        <div class="event-meta">
          <span class="status-badge large" :class="statusClass"><i />{{ statusLabel }}</span>
          <span>{{ config?.tanggal_pemilihan || 'Pemilihan Lurah' }}</span>
        </div>
      </div>

      <aside class="hero-panel" aria-label="Ringkasan TPS">
        <div class="panel-head">
          <span>LIVE TPS</span>
          <strong>{{ attendancePercent }}%</strong>
        </div>
        <div class="progress-track" aria-hidden="true"><span :style="{ width: `${attendancePercent}%` }" /></div>
        <p class="panel-summary"><strong>{{ jumlahHadir }}</strong> dari <strong>{{ totalDpt }}</strong> pemilih DPT sudah memberikan hak pilihnya.</p>
        <div class="stat-grid">
          <div class="stat-card">
            <small>Total DPT</small>
            <strong class="mono">{{ totalDpt }}</strong>
          </div>
          <div class="stat-card voted">
            <small>Sudah Memilih</small>
            <strong class="mono">{{ jumlahHadir }}</strong>
          </div>
          <div class="stat-card queued">
            <small>Antrean Aktif</small>
            <strong class="mono">{{ bufferCount }}</strong>
          </div>
          <div class="stat-card">
            <small>Belum Hadir</small>
            <strong class="mono">{{ jumlahBelumHadir }}</strong>
          </div>
        </div>
      </aside>
    </section>

    <section class="menu-grid" aria-label="Informasi publik">
      <router-link to="/cek-dpt" class="menu-card">
        <span class="menu-icon">⌕</span>
        <span class="menu-copy"><small>CEK DATA</small><strong>Cek Daftar DPT</strong><em>Cari nama atau nomor DPT pemilih</em></span>
        <span class="arrow">→</span>
      </router-link>
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

    <section class="activity-section" aria-label="Aktivitas pemilih">
      <div class="section-title compact">
        <span class="eyebrow">AKTIVITAS PEMILIH</span>
      </div>

      <div class="activity-board">
        <article class="activity-panel voted-panel">
          <header>
            <span class="panel-icon">✓</span>
            <div>
              <small>SELESAI MEMILIH</small>
              <h3>Sudah Memberikan Hak Pilih</h3>
            </div>
          </header>
          <TransitionGroup name="voter-fade" tag="div" class="voter-list">
            <div v-for="item in visibleVoted" :key="`voted-${item.id}-${rotationKey}`" class="voter-card voted">
              <strong>{{ item.nama }}</strong>
              <small>{{ formatRt(item) }}</small>
              <span>Sudah Memberikan hak pilihnya</span>
            </div>
          </TransitionGroup>
          <div v-if="visibleVoted.length === 0" class="empty-state">Belum ada pemilih yang tercatat sudah memberikan hak pilih.</div>
        </article>

        <article class="activity-panel queued-panel">
          <header>
            <span class="panel-icon">⌁</span>
            <div>
              <small>ANTREAN TPS</small>
              <h3>Sedang Mengantri di TPS</h3>
            </div>
          </header>
          <TransitionGroup name="voter-fade" tag="div" class="voter-list">
            <div v-for="item in visibleQueued" :key="`queued-${item.id}-${rotationKey}`" class="voter-card queued">
              <strong>{{ item.nama }}</strong>
              <small>{{ formatRt(item) }}</small>
              <span>Sedang mengantri di TPS</span>
            </div>
          </TransitionGroup>
          <div v-if="visibleQueued.length === 0" class="empty-state">Belum ada antrean aktif di TPS.</div>
        </article>
      </div>
    </section>

    <footer>Asisten Digital KPPS · Data TPS diperbarui secara real-time</footer>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { useDpt } from '../composables/useDpt.js'
import { STATUS_TPS } from '../config/constants.js'

const { config } = useTpsConfig()
const { totalDpt, jumlahHadir, jumlahBelumHadir, hadirList, antreanList, bufferCount } = useDpt()

const visibleVoted = ref([])
const visibleQueued = ref([])
const rotationKey = ref(0)
let rotationTimer

const statusLabel = computed(() => {
  if (config.value?.status_tps === STATUS_TPS.PRESENSI_LOCKED) return 'Penghitungan Berlangsung'
  if (config.value?.status_tps === STATUS_TPS.TALLY_DONE) return 'Hasil Final'
  return config.value ? 'Pemungutan Berlangsung' : 'Memuat Status'
})
const statusClass = computed(() => config.value?.status_tps === STATUS_TPS.TALLY_DONE ? 'done' : config.value?.status_tps === STATUS_TPS.PRESENSI_LOCKED ? 'progress' : 'open')
const attendancePercent = computed(() => totalDpt.value === 0 ? 0 : Math.min(100, Math.round((jumlahHadir.value / totalDpt.value) * 100)))

function pickRandomItems(list, count = 4) {
  const pool = [...list]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

function formatRt(voter) {
  const normalized = String(voter?.rt || '').replace(/^0+/, '')
  return normalized ? `RT ${normalized.padStart(2, '0')}` : 'RT --'
}

function refreshRotatingCards() {
  visibleVoted.value = pickRandomItems(hadirList.value, 1)
  visibleQueued.value = pickRandomItems(antreanList.value, 1)
  rotationKey.value += 1
}

onMounted(() => {
  refreshRotatingCards()
  rotationTimer = setInterval(refreshRotatingCards, 4000)
})

onUnmounted(() => clearInterval(rotationTimer))
</script>

<style scoped>
.landing-page {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  padding-bottom: 2.2rem;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 10%, rgba(201, 133, 47, .22), transparent 28rem),
    radial-gradient(circle at 88% 12%, rgba(43, 94, 173, .2), transparent 24rem),
    linear-gradient(135deg, #f9fbfc 0%, #eef5f7 45%, #e4eef2 100%);
}
.ambient { position:absolute; z-index:-1; border-radius:999px; filter:blur(2px); opacity:.72; animation:float-ambient 14s ease-in-out infinite alternate; }
.ambient-one { width:26rem; height:26rem; left:-11rem; top:11rem; background:rgba(14,81,107,.13); }
.ambient-two { width:19rem; height:19rem; right:-7rem; top:5rem; background:rgba(201,133,47,.16); animation-delay:-4s; }
.ambient-three { width:22rem; height:22rem; right:10%; bottom:-9rem; background:rgba(25,129,93,.13); animation-delay:-7s; }
.topbar {
  position: sticky;
  top: .75rem;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: min(100% - 3rem, 1120px);
  margin: .75rem auto 0;
  padding: .7rem .8rem .7rem 1rem;
  border: 1px solid rgba(255,255,255,.68);
  border-radius: 999px;
  background: rgba(255,255,255,.66);
  box-shadow: 0 18px 45px rgba(6,45,61,.1);
  backdrop-filter: blur(20px);
}
.brand { display:flex; align-items:center; gap:.72rem; min-width:0; color:var(--color-navy-dark); }
.brand-mark { display:grid; place-items:center; width:44px; height:44px; flex:0 0 auto; border:2px solid var(--color-amber); border-radius:50%; color:var(--color-amber-dark); background:rgba(255,255,255,.8); font-size:.7rem; font-weight:950; }
.brand-copy { display:flex; flex-direction:column; min-width:0; }
.brand strong { font-size:.82rem; letter-spacing:.09em; white-space:nowrap; }
.brand small { color:var(--color-muted); font-size:.68rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.topbar-actions { display:flex; align-items:center; gap:.55rem; }
.login-link { min-height:42px; display:inline-flex; align-items:center; padding:.65rem 1rem; color:#fff; background:var(--color-navy-dark); border-radius:999px; text-decoration:none; font-size:.78rem; font-weight:800; box-shadow:0 10px 22px rgba(6,45,61,.2); }
.status-badge { display:inline-flex; align-items:center; gap:.45rem; padding:.48rem .72rem; border:1px solid rgba(6,45,61,.08); border-radius:99px; background:rgba(255,255,255,.74); color:var(--color-navy-dark); font-size:.72rem; font-weight:820; box-shadow:0 8px 18px rgba(6,45,61,.06); white-space:nowrap; }
.status-badge.large { padding:.55rem .85rem; }
.status-badge i { width:8px; height:8px; border-radius:50%; background:var(--color-amber); box-shadow:0 0 0 5px rgba(201,133,47,.13); animation:pulse-dot 1.9s ease-in-out infinite; }
.status-badge.done i { background:var(--color-green); box-shadow:0 0 0 5px rgba(25,129,93,.13); }
.status-badge.progress i { background:var(--color-blue); box-shadow:0 0 0 5px rgba(43,94,173,.13); }
.hero-dashboard {
  display:grid;
  grid-template-columns:minmax(0, 1.1fr) minmax(320px, .9fr);
  align-items:center;
  gap:clamp(1.2rem, 4vw, 3rem);
  width:min(100% - 3rem,1120px);
  margin:clamp(2.4rem,6vw,5.5rem) auto 1.3rem;
}
.hero-copy { min-width:0; }
.eyebrow { color:var(--color-amber-dark); font-size:.7rem; font-weight:900; letter-spacing:.18em; }
h1 { max-width:760px; margin:.75rem 0 1rem; color:var(--color-navy-dark); font-size:clamp(2.5rem,6.4vw,5.35rem); line-height:.96; letter-spacing:-.06em; }
.hero-copy p { max-width:650px; margin-bottom:1.45rem; color:#52656e; font-size:1rem; line-height:1.72; }
.event-meta { display:flex; align-items:center; flex-wrap:wrap; gap:.85rem; color:var(--color-muted); font-size:.8rem; }
.hero-panel {
  padding:1.2rem;
  border:1px solid rgba(255,255,255,.72);
  border-radius:28px;
  background:rgba(255,255,255,.72);
  box-shadow:0 24px 60px rgba(6,45,61,.12);
  backdrop-filter:blur(18px);
}
.panel-head { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; margin-bottom:.8rem; }
.panel-head span { color:var(--color-amber-dark); font-size:.68rem; font-weight:900; letter-spacing:.16em; }
.panel-head strong { color:var(--color-navy-dark); font-size:3.3rem; line-height:.85; letter-spacing:-.08em; }
.progress-track { height:12px; overflow:hidden; border-radius:999px; background:#dfe9ee; }
.progress-track span { display:block; height:100%; max-width:100%; border-radius:inherit; background:linear-gradient(90deg,var(--color-amber),var(--color-green-bright)); transition:width .45s ease; }
.panel-summary { margin:1rem 0 1.1rem; color:var(--color-muted); line-height:1.5; }
.panel-summary strong { color:var(--color-navy-dark); }
.stat-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:.7rem; }
.stat-card { padding:.85rem; border:1px solid rgba(6,45,61,.07); border-radius:17px; background:rgba(255,255,255,.72); }
.stat-card small { display:block; margin-bottom:.35rem; color:var(--color-muted); font-size:.66rem; font-weight:800; }
.stat-card strong { color:var(--color-navy-dark); font-size:1.7rem; line-height:1; }
.stat-card.voted { background:rgba(25,129,93,.09); }
.stat-card.queued { background:rgba(43,94,173,.09); }
.menu-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; width:min(100% - 3rem,1120px); margin:1.2rem auto; }
.menu-card { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:1rem; min-height:126px; padding:1.15rem; color:var(--color-ink); background:rgba(255,255,255,.78); border:1px solid rgba(255,255,255,.76); border-radius:22px; box-shadow:var(--shadow-card); text-decoration:none; transition:transform .18s ease,box-shadow .18s ease,background .18s ease; backdrop-filter:blur(12px); }
.menu-card:hover { transform:translateY(-4px); background:rgba(255,255,255,.94); box-shadow:0 18px 38px rgba(6,45,61,.14); }
.menu-icon { display:grid; place-items:center; width:50px; height:50px; border-radius:16px; background:var(--color-navy-soft); color:var(--color-navy); font-size:1.2rem; font-weight:900; }
.menu-copy { display:flex; flex-direction:column; min-width:0; }
.menu-copy small { color:var(--color-amber-dark); font-size:.62rem; font-weight:900; letter-spacing:.12em; }
.menu-copy strong { margin:.2rem 0; color:var(--color-navy-dark); font-size:1rem; }
.menu-copy em { color:var(--color-muted); font-size:.75rem; font-style:normal; line-height:1.35; }
.arrow { color:var(--color-navy); font-size:1.15rem; }
.activity-section { width:min(100% - 3rem,1120px); margin:2rem auto 0; }
.section-title { display:flex; align-items:end; justify-content:space-between; gap:1.5rem; margin-bottom:1rem; }
.section-title.compact { justify-content:flex-start; }
.section-title h2 { margin:.25rem 0 0; color:var(--color-navy-dark); font-size:clamp(1.5rem,3vw,2.2rem); letter-spacing:-.04em; }
.section-title p { max-width:420px; margin:0; color:var(--color-muted); font-size:.82rem; line-height:1.55; }
.activity-board { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
.activity-panel { min-width:0; padding:1rem; border:1px solid rgba(255,255,255,.76); border-radius:24px; background:rgba(255,255,255,.7); box-shadow:var(--shadow-card); backdrop-filter:blur(14px); }
.activity-panel header { display:flex; align-items:center; gap:.8rem; margin-bottom:.9rem; }
.panel-icon { display:grid; place-items:center; width:42px; height:42px; border-radius:14px; font-weight:950; }
.voted-panel .panel-icon { color:var(--color-green); background:rgba(25,129,93,.12); }
.queued-panel .panel-icon { color:var(--color-blue); background:rgba(43,94,173,.12); }
.activity-panel small { color:var(--color-amber-dark); font-size:.61rem; font-weight:900; letter-spacing:.13em; }
.activity-panel h3 { margin:.1rem 0 0; color:var(--color-navy-dark); font-size:1rem; }
.voter-list { position:relative; display:grid; gap:.65rem; min-height:0; }
.voter-card { position:relative; overflow:hidden; padding:.92rem .95rem .92rem 1.05rem; border:1px solid rgba(6,45,61,.06); border-radius:17px; background:rgba(255,255,255,.86); box-shadow:0 10px 22px rgba(6,45,61,.07); animation:card-arrive .42s ease both; }
.voter-card::before { content:''; position:absolute; inset:0 auto 0 0; width:5px; background:var(--color-green); }
.voter-card.queued::before { background:var(--color-blue); }
.voter-card strong { display:block; color:var(--color-navy-dark); font-size:.95rem; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-transform:uppercase; }
.voter-card small { display:block; margin:.28rem 0 .42rem; color:var(--color-muted); font-size:.74rem; letter-spacing:0; }
.voter-card span { display:inline-flex; padding:.33rem .55rem; border-radius:999px; color:var(--color-green); background:rgba(25,129,93,.09); font-size:.72rem; font-weight:820; }
.voter-card.queued span { color:var(--color-blue); background:rgba(43,94,173,.1); }
.empty-state { display:grid; place-items:center; min-height:164px; padding:1rem; border:1px dashed rgba(6,45,61,.16); border-radius:17px; color:var(--color-muted); background:rgba(255,255,255,.46); text-align:center; font-size:.82rem; line-height:1.5; }
.voter-fade-enter-active, .voter-fade-leave-active { transition:opacity .32s ease, transform .32s ease; }
.voter-fade-enter-from, .voter-fade-leave-to { opacity:0; transform:translateY(10px) scale(.98); }
.voter-fade-leave-active { position:absolute; width:100%; }
footer { width:min(100% - 3rem,1120px); margin:2rem auto 0; color:var(--color-faint); font-size:.7rem; text-align:center; }
@keyframes card-arrive {
  from { opacity:0; transform:translateY(12px) scale(.985); }
  to { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes pulse-dot {
  0%, 100% { transform:scale(1); opacity:1; }
  50% { transform:scale(.72); opacity:.72; }
}
@keyframes float-ambient {
  from { transform:translate3d(0,0,0) scale(1); }
  to { transform:translate3d(18px,-18px,0) scale(1.04); }
}
@media (max-width:1100px) {
  .topbar, .hero-dashboard, .menu-grid, .activity-section, footer { width:min(100% - 2rem,1120px); }
  .hero-dashboard { grid-template-columns:minmax(0, 1fr); align-items:start; margin-top:2.4rem; }
  .hero-copy { max-width:760px; }
  .hero-panel { max-width:720px; }
  .menu-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:.8rem; }
  .menu-card { grid-template-columns:auto 1fr auto; min-height:118px; }
  .menu-icon { grid-column:auto; }
}
@media (max-width:820px) {
  .hero-dashboard, .activity-board { grid-template-columns:1fr; }
  .menu-grid { grid-template-columns:1fr; }
  .menu-card { grid-template-columns:auto 1fr auto; min-height:104px; }
  .menu-icon { grid-column:auto; }
  .section-title { align-items:flex-start; flex-direction:column; gap:.5rem; }
  .section-title p { max-width:none; }
  .activity-panel { padding:.85rem; border-radius:20px; }
}
@media (max-width:620px) {
  .landing-page { padding-bottom:1.4rem; overflow:hidden; }
  .ambient-one { width:18rem; height:18rem; left:-10rem; top:7rem; }
  .ambient-two { width:14rem; height:14rem; right:-8rem; top:3rem; }
  .ambient-three { width:16rem; height:16rem; right:-4rem; bottom:-8rem; }
  .topbar, .hero-dashboard, .menu-grid, .activity-section, footer { width:min(100% - 1.1rem,1120px); }
  .topbar { position:relative; top:auto; align-items:stretch; gap:.75rem; margin-top:.55rem; padding:.75rem; border-radius:22px; flex-direction:column; }
  .brand-mark { width:40px; height:40px; }
  .brand strong { font-size:.76rem; letter-spacing:.06em; }
  .brand small { max-width:220px; font-size:.64rem; }
  .topbar-actions { width:100%; justify-content:space-between; }
  .topbar-actions > .status-badge { display:none; }
  .login-link { justify-content:center; width:100%; min-height:46px; }
  .hero-dashboard { gap:1rem; margin:1.55rem auto 1rem; }
  .eyebrow { font-size:.62rem; letter-spacing:.13em; }
  h1 { max-width:10ch; margin:.6rem 0 .85rem; font-size:clamp(2.15rem,14vw,3.55rem); line-height:.98; letter-spacing:-.055em; }
  .hero-copy p { margin-bottom:1rem; font-size:.88rem; line-height:1.58; }
  .event-meta { align-items:flex-start; flex-direction:column; gap:.6rem; font-size:.74rem; }
  .status-badge.large { max-width:100%; white-space:normal; }
  .hero-panel { padding:.9rem; border-radius:22px; }
  .panel-head { align-items:center; }
  .panel-head span { font-size:.6rem; letter-spacing:.12em; }
  .panel-head strong { font-size:2.45rem; }
  .progress-track { height:10px; }
  .panel-summary { margin:.85rem 0; font-size:.86rem; }
  .stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:.55rem; }
  .stat-card { padding:.72rem; border-radius:14px; }
  .stat-card small { font-size:.6rem; }
  .stat-card strong { font-size:1.45rem; }
  .menu-grid { gap:.65rem; margin:.85rem auto; }
  .menu-card { grid-template-columns:auto 1fr; gap:.72rem; min-height:auto; padding:.82rem; border-radius:18px; }
  .menu-icon { width:42px; height:42px; border-radius:13px; font-size:1rem; }
  .menu-copy small { font-size:.56rem; }
  .menu-copy strong { font-size:.92rem; }
  .menu-copy em { font-size:.68rem; }
  .arrow { display:none; }
  .activity-section { margin-top:1.35rem; }
  .section-title { margin-bottom:.65rem; }
  .activity-board { gap:.75rem; }
  .activity-panel header { gap:.65rem; margin-bottom:.75rem; }
  .panel-icon { width:38px; height:38px; border-radius:12px; }
  .activity-panel h3 { font-size:.92rem; }
  .activity-panel small { font-size:.56rem; letter-spacing:.1em; }
  .voter-card { padding:.82rem .82rem .82rem .95rem; border-radius:15px; }
  .voter-card strong { font-size:.88rem; }
  .voter-card span { font-size:.66rem; line-height:1.25; }
  .empty-state { min-height:118px; padding:.85rem; font-size:.76rem; }
}
@media (max-width:380px) {
  .stat-grid { grid-template-columns:1fr; }
  .brand small { max-width:180px; }
  h1 { max-width:none; font-size:2.05rem; }
  .menu-card { align-items:start; }
}
@media (prefers-reduced-motion: reduce) {
  .ambient, .status-badge i, .voter-card { animation:none; }
  .menu-card, .progress-track span, .voter-fade-enter-active, .voter-fade-leave-active { transition:none; }
}
</style>
