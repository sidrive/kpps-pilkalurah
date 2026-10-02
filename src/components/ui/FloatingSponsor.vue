<template>
  <a class="floating-sponsor" :href="href" target="_blank" rel="noopener noreferrer" :aria-label="ariaLabel">
    <span class="sponsor-label">{{ sponsorLabel }}</span>
    <span class="sponsor-card">
      <span class="sponsor-main">
        <img class="sponsor-logo" :src="logo" :alt="logoAlt">
        <span class="promo-text">{{ promoText }}</span>
      </span>
      <span class="sponsor-arrow" aria-hidden="true">
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M4 10h10m0 0-4-4m4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </span>
  </a>
</template>

<script setup>
defineProps({
  logo: { type: String, required: true },
  sponsorLabel: { type: String, default: 'Supported by' },
  promoText: { type: String, default: 'Pasang internet Murah, klik disini' },
  href: { type: String, required: true },
  logoAlt: { type: String, default: 'ZKNet Internet untuk Desa' },
  ariaLabel: { type: String, default: 'Kunjungi zknet.my.id untuk informasi pemasangan internet' }
})
</script>

<style scoped>
.floating-sponsor {
  position: fixed;
  right: clamp(1.25rem, 2vw, 1.5rem);
  bottom: clamp(1.25rem, 2vw, 1.5rem);
  z-index: 80;
  width: min(350px, calc(100vw - 2.5rem));
  color: var(--color-navy-dark);
  text-decoration: none;
  animation: sponsor-in .46s ease .85s both;
}
.sponsor-label {
  position: relative;
  z-index: 1;
  display: inline-flex;
  margin: 0 0 -.45rem 1rem;
  padding: .28rem .62rem;
  border: 1px solid rgba(6,45,61,.08);
  border-radius: 999px;
  background: rgba(255,255,255,.96);
  color: #345463;
  box-shadow: 0 8px 18px rgba(6,45,61,.07);
  font-size: .7rem;
  font-weight: 750;
  line-height: 1;
}
.sponsor-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: .7rem;
  min-height: 62px;
  padding: .58rem .68rem .54rem;
  border: 1px solid rgba(6,45,61,.08);
  border-radius: 21px;
  background: rgba(255,255,255,.96);
  box-shadow: 0 18px 38px rgba(6,45,61,.13);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.sponsor-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: .65rem;
}
.sponsor-logo {
  display: block;
  flex: 0 0 auto;
  width: 108px;
  max-width: 108px;
  height: 32px;
  object-fit: contain;
  object-position: left center;
}
.promo-text {
  max-width: none;
  color: var(--color-navy-dark);
  font-size: .7rem;
  font-weight: 820;
  line-height: 1.18;
  text-shadow: 0 1px 5px rgba(6,45,61,.18);
}
.sponsor-arrow {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  color: var(--color-amber-dark);
  background: #fff2df;
  box-shadow: inset 0 0 0 1px rgba(154,92,20,.08);
  transition: transform .2s ease, background .2s ease;
}
.sponsor-arrow svg { width: 20px; height: 20px; }
.floating-sponsor:hover .sponsor-card,
.floating-sponsor:focus-visible .sponsor-card {
  transform: translateY(-3px);
  border-color: rgba(201,133,47,.22);
  box-shadow: 0 24px 46px rgba(6,45,61,.17);
}
.floating-sponsor:hover .sponsor-arrow,
.floating-sponsor:focus-visible .sponsor-arrow { transform: translateX(3px) scale(1.04); background:#ffe8bf; }
.floating-sponsor:focus-visible { outline: 3px solid var(--color-amber); outline-offset: 5px; border-radius: 22px; }
@keyframes sponsor-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 900px) {
  .floating-sponsor { width: min(310px, calc(100vw - 2rem)); right: 1rem; bottom: 1rem; }
  .sponsor-label { margin-left:.75rem; padding:.24rem .52rem; font-size:.62rem; }
  .sponsor-card { min-height: 58px; gap:.55rem; padding:.54rem .6rem .5rem; border-radius:18px; }
  .sponsor-main { gap:.55rem; }
  .sponsor-logo { width:96px; max-width:96px; height:29px; }
  .promo-text { font-size:.64rem; line-height:1.14; }
  .sponsor-arrow { width:32px; height:32px; }
}
@media (max-width: 640px) {
  .floating-sponsor {
    width: min(100% - 1.1rem, 420px);
    right: .55rem;
    bottom: .65rem;
  }
  .sponsor-label { margin:0 0 -.34rem .75rem; padding:.2rem .46rem; font-size:.54rem; }
  .sponsor-card { min-height:54px; grid-template-columns:minmax(0,1fr) 28px; gap:.45rem; padding:.52rem .55rem .48rem; border-radius:16px; }
  .sponsor-main { flex-direction:row; align-items:center; gap:.5rem; }
  .sponsor-logo { flex:0 0 auto; width:78px; max-width:78px; height:24px; }
  .promo-text { max-width:none; font-size:.58rem; line-height:1.13; }
  .sponsor-arrow { width:28px; height:28px; }
  .sponsor-arrow svg { width:17px; height:17px; }
}
@media (max-width: 360px) {
  .floating-sponsor { width: calc(100% - 1rem); right:.5rem; bottom:.55rem; }
  .sponsor-card { min-height:50px; padding:.48rem .5rem .42rem; gap:.34rem; }
  .sponsor-logo { width:70px; max-width:70px; height:22px; }
  .promo-text { font-size:.53rem; }
  .sponsor-arrow { width:26px; height:26px; }
}
@media (prefers-reduced-motion: reduce) {
  .floating-sponsor { animation:none; }
  .sponsor-card,.sponsor-arrow { transition:none; }
}
</style>
