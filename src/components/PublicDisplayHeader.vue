<template>
  <header class="display-header">
    <div class="brand-mark mono">KP</div>
    <div class="brand-copy">
      <strong>{{ config?.nama_tps || 'TPS Pilkalurah' }}</strong>
      <span>Pemilihan Lurah {{ year }}</span>
    </div>
    <div class="connection"><i /> <span>KONEKSI {{ online ? 'ONLINE' : 'OFFLINE' }}</span></div>
    <div class="clock mono"><strong>{{ time }}</strong><span>{{ date }}</span></div>
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
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.9rem;
  min-height: 86px;
  padding: 1rem clamp(1rem, 4vw, 2rem);
  color: #fff;
  background: var(--color-navy-dark);
}
.brand-mark { display:grid; place-items:center; width:52px; height:52px; border:2px solid var(--color-amber); border-radius:50%; color:var(--color-amber); font-weight:800; }
.brand-copy { display:flex; flex-direction:column; min-width:0; }
.brand-copy strong { font-size:1.05rem; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.brand-copy span, .clock span { color:#aec3cc; font-size:0.72rem; }
.connection { display:flex; align-items:center; gap:0.4rem; padding-right:1rem; border-right:1px solid rgba(255,255,255,.15); color:#65d0a2; font-size:.68rem; font-weight:800; }
.connection i { width:8px; height:8px; border-radius:50%; background:currentColor; box-shadow:0 0 0 4px rgba(101,208,162,.12); }
.clock { display:flex; flex-direction:column; text-align:right; }
.clock strong { font-size:1.15rem; }
@media (max-width: 640px) {
  .display-header { grid-template-columns:auto 1fr auto; gap:.65rem; }
  .connection { grid-column:2 / -1; grid-row:2; border:0; padding:0; }
  .clock { grid-column:3; grid-row:1; }
  .brand-copy strong { font-size:.85rem; }
  .clock strong { font-size:.9rem; }
}
</style>
