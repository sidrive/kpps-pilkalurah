// Batas maksimal antrean fisik di depan Petugas Depan.
// Hardcoded sesuai keputusan awal (skala kecil, 1 TPS, dipakai sendiri).
// TODO(v2): pindahkan ke dokumen `tps_config/{tps_id}.max_antrean` di Firestore
// kalau nanti perlu berbeda-beda per TPS / mudah diubah tanpa redeploy kode.
export const MAX_QUEUE_BUFFER = 100

export const STATUS_PROSES = {
  BELUM_HADIR: 'BELUM_HADIR',
  DI_ANTREAN: 'DI_ANTREAN',
  HADIR_SAH: 'HADIR_SAH'
}

export const STATUS_TPS = {
  PRESENSI_OPEN: 'PRESENSI_OPEN',
  PRESENSI_LOCKED: 'PRESENSI_LOCKED',
  TALLY_DONE: 'TALLY_DONE'
}

export const ROLE = {
  PETUGAS_DEPAN: 'PETUGAS_DEPAN',
  KPPS_1: 'KPPS_1',
  KPPS_2: 'KPPS_2',
  KETUA: 'KETUA'
}

// ID TPS tunggal karena app ini dipakai untuk 1 TPS saja.
// Kalau suatu saat perlu multi-TPS, ini yang pertama diubah jadi dinamis.
export const TPS_ID = 'tps-default'

// ID khusus untuk suara tidak sah di collection tally_votes -- diperlakukan
// seperti "calon" tambahan supaya perhitungan total (Sah + Tidak Sah) bisa
// pakai logic yang sama persis dengan suara calon biasa.
export const TIDAK_SAH_ID = 'TIDAK_SAH'
