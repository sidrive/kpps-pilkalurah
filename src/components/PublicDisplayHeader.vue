<template>
  <header class="display-header">
    <router-link to="/" class="brand-link" title="Kembali ke Beranda">
      <div class="brand-mark mono">KP</div>
      <div class="brand-copy">
        <strong>{{ config?.nama_tps || 'TPS Pilkalurah' }}</strong>
        <span>Pemilihan Lurah {{ year }}</span>
      </div>
    </router-link>
    <div class="header-right">
      <div class="connection"><i /> <span>KONEKSI {{ online ? 'ONLINE' : 'OFFLINE' }}</span></div>
      <div class="clock mono"><strong>{{ time }}</strong><span>{{ date }}</span></div>
      <router-link to="/" class="btn-home-nav" title="Kembali ke Beranda">
        <span>Beranda</span>
        <span class="home-icon">⌂</span>
      </router-link>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useTpsConfig } from '../composables/useTpsConfig.js'

const { config } = useTpsConfig()
const now = ref(new Date())
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
let timer

const year = computed(() => now.value.getFullYear())
const time = computed(() => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now.value).replaceAll('.', ':'))
const date = computed(() => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(now.value))

function updateOnline() { online.value = navigator.onLine }
onMounted(() => {
  timer = setInterval(() => (now.value = new Date()), 1000)
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
})
onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
})
</script>

<style scoped>
.display-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 86px;
  padding: 1rem clamp(1rem, 4vw, 2rem);
  color: #fff;
  background: var(--color-navy-dark);
}
.brand-link {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  color: inherit;
  text-decoration: none;
}
.brand-link:hover .brand-copy strong {
  text-decoration: underline;
}
.brand-mark { display:grid; place-items:center; width:52px; height:52px; border:2px solid var(--color-amber); border-radius:50%; color:var(--color-amber); font-weight:800; flex:0 0 auto; }
.brand-copy { display:flex; flex-direction:column; min-width:0; }
.brand-copy strong { font-size:1.05rem; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.brand-copy span, .clock span { color:#aec3cc; font-size:0.72rem; }
.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.connection { display:flex; align-items:center; gap:0.4rem; padding-right:1rem; border-right:1px solid rgba(255,255,255,.15); color:#65d0a2; font-size:.68rem; font-weight:800; }
.connection i { width:8px; height:8px; border-radius:50%; background:currentColor; box-shadow:0 0 0 4px rgba(101,208,162,.12); }
.clock { display:flex; flex-direction:column; text-align:right; }
.clock strong { font-size:1.15rem; }
.btn-home-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 38px;
  padding: 0 0.8rem;
  color: var(--color-navy-dark);
  background: var(--color-amber);
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(201,133,47,.25);
  transition: transform .15s ease, background .15s ease;
}
.btn-home-nav:hover {
  background: #f3b251;
  transform: translateY(-1px);
}
.home-icon {
  font-size: 1rem;
}
@media (max-width: 768px) {
  .display-header { flex-direction: column; align-items: stretch; gap: .75rem; padding: 1rem; }
  .header-right { justify-content: space-between; border-top: 1px solid rgba(255,255,255,.12); padding-top: .75rem; }
  .connection { border: 0; padding: 0; }
}
@media (max-width: 480px) {
  .btn-home-nav span:first-child { display: none; }
  .btn-home-nav { padding: 0 .6rem; }
}
</style>
