<template>
  <div class="wrap">
    <OperationalHeader title="Rekapitulasi &amp; Berita Acara" :subtitle="config?.nama_tps || 'TPS Pilkalurah'" :name="namaPetugas" @exit="$router.push('/setup')" />

    <div v-if="config?.status_tps !== STATUS_TPS.TALLY_DONE" class="warning-banner">Hasil tally belum dikunci (status: {{ config?.status_tps || '...' }}). Data tetap ditampilkan, tapi tunggu tally selesai sebelum export BA final.</div>

    <section class="form-section">
      <h2>Waktu Pelaksanaan</h2>
      <div class="field-row"><label>Tanggal Pemilihan<input v-model="form.tanggal_pemilihan" type="text" placeholder="cth: 22 Agustus 2026"></label></div>
      <div class="field-row two-col">
        <label>Mulai Pemungutan<input v-model="form.waktu_mulai_pemungutan" type="time"></label>
        <label>Selesai Pemungutan<input v-model="form.waktu_selesai_pemungutan" type="time"></label>
      </div>
      <div class="field-row two-col">
        <label>Mulai Penghitungan<input v-model="form.waktu_mulai_hitung" type="time"></label>
        <label>Selesai Penghitungan<input v-model="form.waktu_selesai_hitung" type="time"></label>
      </div>
    </section>

    <section class="form-section">
      <h2>Catatan Kejadian Khusus</h2>
      <textarea v-model="form.catatan_khusus" rows="3" placeholder="Kosongkan jika tidak ada kejadian khusus"></textarea>
    </section>

    <section class="form-section">
      <h2>Saksi yang Hadir</h2>
      <div v-for="(_, i) in form.daftar_saksi" :key="i" class="saksi-row">
        <input v-model="form.daftar_saksi[i]" type="text" placeholder="Nama saksi"><button class="btn-remove" type="button" @click="hapusSaksi(i)">✕</button>
      </div>
      <button class="btn-add" type="button" @click="tambahSaksi">+ Tambah Saksi</button>
    </section>

    <button class="btn-save" type="button" @click="simpan">{{ saved ? '✓ Tersimpan' : 'Simpan Perubahan' }}</button>

    <section class="preview">
      <h2>Ringkasan (akan masuk ke PDF)</h2>
      <div class="preview-row"><span>Total DPT</span><span class="mono">{{ totalDpt }}</span></div>
      <div class="preview-row"><span>Hadir</span><span class="mono">{{ jumlahHadir }} ({{ persenHadir }}%)</span></div>
      <div class="preview-row"><span>Tidak Hadir</span><span class="mono">{{ jumlahBelumHadir }}</span></div>
      <div class="preview-divider"></div>
      <div v-for="item in hasilSuara" :key="item.nama" class="preview-row"><span>{{ item.nama }}</span><span class="mono">{{ item.count }}</span></div>
      <div class="preview-row preview-total"><span>Total Suara</span><span class="mono">{{ totalKeseluruhan }}</span></div>
    </section>

    <button class="btn-export" type="button" @click="exportPdf">📄 Export PDF Berita Acara</button>
    <router-link to="/display/hasil-akhir" class="link-hasil" target="_blank">🖥️ Buka Layar Hasil Akhir (untuk saksi/publik) →</router-link>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useTpsConfig } from '../composables/useTpsConfig.js'
import { useTally } from '../composables/useTally.js'
import { useDevice } from '../composables/useDevice.js'
import { useDpt } from '../composables/useDpt.js'
import { STATUS_TPS, TIDAK_SAH_ID } from '../config/constants.js'
import { generateBeritaAcaraPdf } from '../utils/generateBeritaAcaraPdf.js'
import OperationalHeader from '../components/OperationalHeader.vue'

const { config, daftarCalon, updateRekapInfo } = useTpsConfig()
const { countsByCalonId, totalKeseluruhan } = useTally()
const { namaPetugas } = useDevice()
const { totalDpt, jumlahHadir, jumlahBelumHadir } = useDpt()
const form = reactive({ tanggal_pemilihan:'', waktu_mulai_pemungutan:'', waktu_selesai_pemungutan:'', waktu_mulai_hitung:'', waktu_selesai_hitung:'', catatan_khusus:'', daftar_saksi:[''] })
const saved = ref(false)
let initialized = false
watch(config, (val) => {
  if (!val || initialized) return
  form.tanggal_pemilihan = val.tanggal_pemilihan || ''
  form.waktu_mulai_pemungutan = val.waktu_mulai_pemungutan || ''
  form.waktu_selesai_pemungutan = val.waktu_selesai_pemungutan || ''
  form.waktu_mulai_hitung = val.waktu_mulai_hitung || ''
  form.waktu_selesai_hitung = val.waktu_selesai_hitung || ''
  form.catatan_khusus = val.catatan_khusus || ''
  form.daftar_saksi = val.daftar_saksi?.length ? [...val.daftar_saksi] : ['']
  initialized = true
})
function tambahSaksi(){ form.daftar_saksi.push('') }
function hapusSaksi(i){ form.daftar_saksi.splice(i,1); if(!form.daftar_saksi.length) form.daftar_saksi.push('') }
async function simpan(){ await updateRekapInfo({ ...form }); saved.value = true; setTimeout(()=>saved.value=false,2000) }
const persenHadir = computed(()=> totalDpt.value===0?0:Math.round((jumlahHadir.value/totalDpt.value)*100))
const hasilSuara = computed(()=>{ const items=daftarCalon.value.map((c)=>({nama:c.nama,count:countsByCalonId.value[c.id]||0})); items.push({nama:'Tidak Sah',count:countsByCalonId.value[TIDAK_SAH_ID]||0}); return items })
async function exportPdf(){
  await generateBeritaAcaraPdf({ namaTps:config.value?.nama_tps, tanggalPemilihan:form.tanggal_pemilihan, waktuMulaiPemungutan:form.waktu_mulai_pemungutan, waktuSelesaiPemungutan:form.waktu_selesai_pemungutan, waktuMulaiHitung:form.waktu_mulai_hitung, waktuSelesaiHitung:form.waktu_selesai_hitung, totalDpt:totalDpt.value, jumlahHadir:jumlahHadir.value, jumlahBelumHadir:jumlahBelumHadir.value, persenHadir:persenHadir.value, hasilSuara:hasilSuara.value, totalSuara:totalKeseluruhan.value, catatanKhusus:form.catatan_khusus, daftarSaksi:form.daftar_saksi.filter((s)=>s.trim()), namaKetua:namaPetugas.value })
}
</script>

<style scoped>
.wrap{max-width:520px;margin:0 auto;padding:1.5rem 1rem 3rem}
.warning-banner{padding:.8rem 1rem;margin-bottom:1rem;color:var(--color-amber-dark);background:#fff6e8;border:1px solid #f0c98a;border-radius:10px;font-size:.78rem}
.form-section{padding:1rem;margin-bottom:1rem;background:#fff;border:1px solid rgba(6,45,61,.06);border-radius:var(--radius);box-shadow:var(--shadow-card)}
.form-section h2{margin-bottom:.75rem;color:var(--color-navy-dark);font-size:.9rem}
.field-row{margin-bottom:.7rem}.field-row.two-col{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
label{display:flex;flex-direction:column;gap:.3rem;color:var(--color-navy-dark);font-size:.75rem;font-weight:750}
input,textarea{padding:.6rem .75rem;color:var(--color-ink);background:#fff;border:1px solid var(--color-line);border-radius:9px;font-size:.9rem}
textarea{resize:vertical}
.saksi-row{display:flex;gap:.5rem;margin-bottom:.5rem}.saksi-row input{flex:1}
.btn-remove{min-width:44px;color:var(--color-red);background:#fff;border:1px solid #e7b9bd}
.btn-add{width:100%;color:var(--color-navy);background:#fff;border:1px dashed var(--color-line);font-weight:700}
.btn-save{width:100%;margin-bottom:1rem;color:#fff;background:var(--color-green);font-weight:800}
.preview{padding:1rem;margin-bottom:1rem;background:#fff;border:1px solid rgba(6,45,61,.06);border-radius:var(--radius);box-shadow:var(--shadow-card)}
.preview h2{margin-bottom:.65rem;color:var(--color-navy-dark);font-size:.9rem}
.preview-row{display:flex;justify-content:space-between;padding:.32rem 0;color:var(--color-muted);font-size:.82rem}.preview-row .mono{color:var(--color-ink);font-weight:800}
.preview-divider{border-top:1px solid var(--color-line);margin:.5rem 0}
.preview-total{font-weight:800;border-top:1px solid var(--color-line);margin-top:.4rem;padding-top:.55rem;color:var(--color-ink)}
.btn-export{width:100%;color:#fff;background:var(--color-navy);font-size:.95rem;font-weight:800}
.link-hasil{display:block;margin-top:.9rem;color:var(--color-navy);text-align:center;text-decoration:none;font-size:.78rem;font-weight:750}
</style>
