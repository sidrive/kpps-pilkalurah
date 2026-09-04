# Project Context: Aplikasi Asisten Digital KPPS (Pemilihan Lurah / Pilkalurah)

> Versi ini menggantikan draft awal. Perubahan utama: keputusan arsitektur final,
> hasil review bug, dan status implementasi Modul 1 (sudah di-scaffold & build sukses).

## 1. Overview Proyek

- **Nama Proyek**: Aplikasi Asisten Digital KPPS (Pemilihan Lurah / Pilkalurah)
- **Tujuan Utama**:
  1. Mengatur alur antrean fisik pemilih di TPS secara terstruktur dan efisien.
  2. Meminimalkan kesalahan matematis (*human error*) pada proses penghitungan suara (*tallying*).
  3. Mengotomatiskan pembuatan dokumen rekapitulasi dan Berita Acara (BA/C1) siap cetak/ekspor.
- **Target Pengguna**: Petugas Ketertiban/Keamanan TPS dan Anggota KPPS (KPPS 1, 2, 3, dan Ketua) — dipakai sendiri di **1 TPS**, bukan multi-tenant publik.
- **Skala Data**: ±600–700 data DPT per TPS.
- **Platform**: PWA (Vue 3), bukan native Android. Alasan: offline-first sudah terpenuhi via IndexedDB, tidak ada kebutuhan hardware low-level (background service, NFC) di v1. Native/WebView-bridge disimpan sebagai opsi v2 kalau nanti perlu scan NFC e-KTP.

## 2. Arsitektur Teknis & Strategi Offline

- **Frontend**: Vue 3 (Vite + `vite-plugin-pwa`), PWA installable.
- **Database & Cloud**: Firebase Firestore (Web SDK v10, modular).
- **Konektivitas TPS**: internet lemah (kuota/hotspot/WiFi) **selalu ada** — bukan zero-connectivity. Ini keputusan penting: arsitektur Firestore standar dipakai apa adanya, TIDAK perlu local sync server / PouchDB-CouchDB.
- **Offline Persistence**: `persistentLocalCache` + `persistentMultipleTabManager` **wajib aktif** (`src/config/firebase.js`). Seluruh DPT diunduh ke IndexedDB H-1 lewat script import (`scripts/import-dpt.mjs`), sehingga pencarian & pencatatan presensi 100% instan secara lokal.
- **Auth**: **Anonymous Auth** (bukan auth penuh, bukan tanpa auth). Alasan: mencegah akses publik ke Firestore (siapa pun yang tahu `firebaseConfig` bisa baca/tulis data kalau rules terbuka), tanpa menambah friction UX (auto sign-in di background) atau kompleksitas (tidak perlu login manual).
- **PIN Ketua KPPS**: plain string di `tps_config/{tps_id}.pin_ketua`, divalidasi client-side dari cache lokal (bukan hash, bukan Firebase Auth penuh). Keputusan sadar mengingat skala pemakaian (1 TPS, milik sendiri) — prioritas: simple, gratis, cepat, tetap jalan offline.

## 3. Tiga Bug Kritis yang Ditemukan Saat Review Arsitektur (Sudah Di-fix di Scaffold)

1. **Firestore Security Rules** — tanpa Anonymous Auth + rules yang mensyaratkan `request.auth != null`, siapa pun di internet bisa baca data pemilih atau menulis hasil tally dari jarak jauh. **Fix**: `firestore.rules` mensyaratkan auth di semua collection; `presensi_log` khusus append-only (`allow update, delete: if false`).
2. **Race condition double-tap** — awalnya direncanakan pakai `runTransaction()` Firestore, tapi ternyata **transaction butuh koneksi server aktif** dan tidak bisa jalan offline — bertentangan dengan requirement inti. **Fix final**: guard murni client-side di `src/composables/useDpt.js` — `isPending` ref (disable tombol synchronous sebelum await pertama) + baca status dari `getDocFromCache` sebelum `updateDoc` biasa. Trade-off yang diterima: race antar 2 device berbeda pada no. urut yang sama persis di waktu bersamaan tidak dijamin konsisten, tapi tetap tercatat di `presensi_log` untuk audit manual.
3. **`serverTimestamp()` untuk sorting antrean** — resolve jadi `null` dulu di cache lokal sampai sampai ke server, bikin urutan FIFO salah render saat koneksi lemah/delay. **Fix**: `waktu_masuk_antrean` pakai `Date.now()` (client-generated) untuk sorting UI real-time; `serverTimestamp()` tetap dipakai terpisah di `presensi_log` untuk keperluan audit resmi presisi waktu server.

## 4. Modul 1: Presensi Dual-App System — **STATUS: SCAFFOLD SELESAI, BUILD SUKSES**

### Struktur Data DPT (Firestore `dpt/{no_urut}`)
```json
{
  "no_urut": 42,
  "nama": "Budi Santoso",
  "rt": "02",
  "rw": "05",
  "jenis_kelamin": "L",
  "status_proses": "DI_ANTREAN",
  "waktu_masuk_antrean": 1755500000000,
  "waktu_konfirmasi": null,
  "status_centang_manual": false,
  "kategori_pemilih": "DPT",
  "updated_by_device": "uuid-device",
  "updated_by_nama": "Nama Petugas"
}
```

### Collection lain
```
tps_config/{tps_id}     -- nama_tps, pin_ketua, status_tps
presensi_log/{auto_id}  -- audit trail append-only (no_urut, status_lama, status_baru, device_id, nama_petugas, waktu_server)
devices/{device_id}     -- BELUM diimplementasi (device_id baru di localStorage, belum di-push ke Firestore)
```

### State Flow Status Pemilih
`BELUM_HADIR` → `DI_ANTREAN` (Petugas Depan, buffer max 10 hardcoded) → `HADIR_SAH` (KPPS 1/2 konfirmasi).

### File yang sudah ada
```
src/config/firebase.js         -- init Firestore offline + anonymous auth
src/config/constants.js        -- MAX_QUEUE_BUFFER=10, STATUS_PROSES, STATUS_TPS, ROLE, TPS_ID
src/composables/useDevice.js   -- identitas device (UUID persisten + role, localStorage)
src/composables/useDpt.js      -- query realtime antrean, tambahKeAntrean, konfirmasiHadir, batalkanAntrean
src/composables/useTpsConfig.js -- PIN Ketua, ubahStatusTps, lockPresensi
src/views/SetupView.vue        -- pilih role & nama petugas per device
src/views/PetugasDepanView.vue -- numpad besar, guard buffer + double-tap
src/views/KppsView.vue         -- daftar antrean, konfirmasi/batal, filter centang manual
firestore.rules                -- security rules dengan anonymous auth gate
scripts/import-dpt.mjs         -- import CSV DPT via firebase-admin (dijalankan H-1)
README.md                      -- instruksi setup Firebase project, deploy rules, import data, run dev
```

### Belum ada di Modul 1 (opsional, tidak blocking Modul 2)
- Push `devices/{device_id}` ke Firestore (saat ini hanya localStorage)
- UI tombol "Kunci Presensi" untuk Ketua (composable `lockPresensi()` sudah ada, UI belum)
- Icon PWA (`public/icons/icon-192.png`, `icon-512.png`)

## 5. Modul 2: Digital Tally / Penghitungan Suara — **STATUS: SCAFFOLD SELESAI, BUILD SUKSES**

### Keputusan yang dikonfirmasi user
- Jumlah calon: **default 4, tapi configurable** (bisa berubah tanpa redeploy kode) — disimpan sebagai array `daftar_calon` di `tps_config/{tps_id}`, bukan hardcode.
- Mekanisme input: **tap tombol besar per calon (1 tap = 1 suara)** dengan tombol koreksi/undo — bukan input manual angka total.

### Pola arsitektur yang dipakai (konsisten dengan Modul 1)
- **Tidak pakai counter field ter-increment** — setiap tap = 1 dokumen baru di collection `tally_votes` (append-only, mirip `presensi_log`). Jumlah per calon dihitung on-the-fly dari COUNT dokumen realtime, menghindari masalah race condition yang sama seperti buffer antrean di Modul 1.
- **Undo = soft-delete** (`dibatalkan: true`), bukan hapus dokumen — supaya tetap ada jejak audit lengkap kalau ada dispute saksi. Target undo: suara terakhir secara keseluruhan (lintas calon), sesuai proses fisik menghitung surat suara satu per satu berurutan.
- **Suara tidak sah** diperlakukan seperti "calon" tambahan dengan id khusus `TIDAK_SAH` (`src/config/constants.js`), supaya logic total (Sah + Tidak Sah) konsisten.
- **Validasi otomatis real-time**: `Total Suara (Sah + Tidak Sah)` dibandingkan langsung dengan `Pemilih Hadir` (query `HADIR_SAH` dari Modul 1) — tampil sebagai banner cocok/tidak cocok di UI, bukan hanya dicek saat submit akhir.
- **PIN gate** dipakai untuk "Kunci & Submit Hasil Tally" (`useTpsConfig.lockTally()`), mengubah `status_tps` ke `TALLY_DONE`.

### Struktur data baru: `tally_votes/{auto_id}`
```json
{
  "calon_id": "calon-1",
  "dibatalkan": false,
  "waktu": 1755500000000,
  "device_id": "uuid-device",
  "nama_petugas": "Nama Petugas",
  "waktu_server": "<serverTimestamp>"
}
```

### File yang sudah ada
```
src/composables/useTally.js  -- catatSuara, batalkanSuaraTerakhir, countsByCalonId, validasi total
src/views/TallyView.vue      -- papan hitung, banner validasi, PIN gate kunci hasil
```
`useTpsConfig.js` diperluas: `daftarCalon` (computed dari `tps_config.daftar_calon`), `lockTally()`.
`firestore.rules` diperluas: collection `tally_votes` (create/read/update oleh auth, delete selalu ditolak).

### Gap yang sudah di-fix
- ~~Tombol "Kunci & Submit Hasil Tally" melompati state `PRESENSI_LOCKED`~~ — **FIXED**. Sekarang hard gate: semua tombol tap suara & tombol kunci tally disabled selama `status_tps === PRESENSI_OPEN`. Ditambahkan tombol "Kunci Presensi Sekarang" langsung di TallyView (PIN Ketua) supaya alur `PRESENSI_OPEN` → `PRESENSI_LOCKED` → `TALLY_DONE` bisa dijalankan tanpa perlu buka Firestore console manual.

### Gap yang masih ada (didokumentasikan, belum di-fix)
- Undo hanya realistis kalau **1 device aktif** mencatat saat penghitungan resmi (didokumentasikan di komentar `useTally.js`) — kalau 2 device menghitung bersamaan, "suara terakhir" bisa ambigu antar device.

## 5b. Layar Publik (Display Screens) — **STATUS: SCAFFOLD SELESAI, BUILD SUKSES**

Dua layar read-only tambahan (tanpa tombol aksi, tanpa PIN gate) untuk transparansi ke saksi/publik — dimaksudkan dibuka di device/laptop terpisah yang dihadapkan ke publik, bukan device kerja petugas.

- **`/display/presensi`** (`PresensiDisplayView.vue`): donut chart (SVG native, tanpa library chart) menampilkan persentase kehadiran, dengan angka besar di tengah donut + 3 stat besar di bawah (Total DPT / Sudah Hadir / Belum Hadir). Dipilih donut (bukan pie polos) karena bisa menaruh angka kunci (persentase) di tengah tanpa mengganggu keterbacaan proporsi — pola umum untuk "voter turnout tracker".
- **`/display/tally`** (`TallyDisplayView.vue`): horizontal bar chart, diurutkan otomatis dari suara terbanyak ke tersedikit (gaya "quick count" TV) — dipilih dibanding pie/donut karena dengan 4+ kategori (calon + tidak sah) bar jauh lebih mudah dibandingkan langsung dan terbaca dari jarak jauh. Progress bar tambahan di bawah menunjukkan total suara terhitung vs jumlah pemilih hadir.
- **`/display/hasil-akhir`** (`HasilAkhirView.vue`): layar hasil **final**, beda dari 2 layar di atas yang menampilkan proses berjalan (realtime, terus berubah). Hanya tampil penuh setelah `status_tps === TALLY_DONE` (sebelum itu tampil pesan "belum final"). Menggabungkan: hasil suara (bar, calon suara terbanyak ditandai bintang), rekap kehadiran, waktu pelaksanaan, dan daftar saksi — satu layar ringkas untuk difoto/dilihat warga.
  - **Catatan penting soal wording**: layar ini SENGAJA tidak memakai kata "pemenang" — dipakai "suara terbanyak di TPS ini" + disclaimer eksplisit bahwa hasil final Pemilihan Lurah ditentukan lewat rekapitulasi seluruh TPS oleh Panitia, bukan dari 1 TPS saja. Ini untuk mencegah kesalahpahaman warga yang melihat layar ini sebagai pengumuman resmi pemenang.

Ketiganya pakai composable yang sama dengan view kerja petugas (`useDpt`-style query langsung, `useTally`, `useTpsConfig`) — tidak ada logic baru untuk hitung data, hanya visualisasi baca-saja.

## 6. Modul 3: Rekapitulasi & Berita Acara — **STATUS: SCAFFOLD SELESAI, BUILD SUKSES**

### Keputusan yang dikonfirmasi user
- Tanda tangan saksi: **cukup nama tercetak**, tidak perlu tanda tangan digital di app.
- Wajib ada di dokumen: rekap kehadiran (hadir/tidak/persen), waktu mulai & selesai (pemungutan + penghitungan), catatan kejadian khusus (kolom bebas).
- Format belum final, kemungkinan berubah — makanya struktur PDF dibuat modular per-section.

### Penambahan yang saya lakukan di luar permintaan (perlu direview)
- Selain nama saksi tercetak, saya tambahkan **ruang kosong untuk tanda tangan basah** di bawah tiap nama di PDF — asumsi dokumen ini akan dicetak fisik dan ditandatangani manual di atas kertas (standar dokumen BA). Kalau tidak perlu, gampang dihapus di `generateBeritaAcaraPdf.js` (fungsi `signatureBlock`).
- Saya juga menambahkan blok tanda tangan **Ketua KPPS** (bukan cuma saksi) karena BA resmi umumnya juga ditandatangani ketua — bisa dihapus kalau tidak relevan.

### Arsitektur
- Field baru (`tanggal_pemilihan`, `waktu_mulai_pemungutan`, `waktu_selesai_pemungutan`, `waktu_mulai_hitung`, `waktu_selesai_hitung`, `catatan_khusus`, `daftar_saksi`) disimpan di dokumen `tps_config` yang sama — bukan collection terpisah, karena semua cuma dibutuhkan sekali per TPS dan sering diedit bareng saat menyusun BA.
- **Tidak ada PIN gate** untuk field-field ini (beda dengan lock presensi/tally) karena ini cuma data pendukung dokumen, bukan aksi yang mengunci state final.
- Form di `/rekap` sinkron dari Firestore **hanya sekali** saat data pertama datang (`watch` dengan flag `initialized`), supaya tidak menimpa ketikan Ketua yang sedang berlangsung tiap kali ada snapshot baru.
- PDF di-generate **100% client-side** pakai `jsPDF`, teks digambar manual (bukan screenshot DOM/html2canvas) — konsisten dengan arsitektur offline-first, tidak butuh koneksi sama sekali untuk export.

### File yang sudah ada
```
src/views/RekapView.vue              -- form waktu/catatan/saksi + preview + tombol export
src/utils/generateBeritaAcaraPdf.js  -- generator PDF modular per-section (jsPDF)
```
`useTpsConfig.js` diperluas: `updateRekapInfo(data)`.

### Gap yang diketahui
- Bundle size naik signifikan (~1MB) karena `jsPDF` menarik `html2canvas` + `dompurify` sebagai dependency bawaan, meski tidak dipakai langsung. Bisa dioptimasi dengan dynamic import kalau jadi masalah nyata di device low-end.
- Belum ada halaman admin untuk edit `daftar_calon` dari dalam app — masih manual lewat Firestore console.

## 8. Landing Page Publik & Login Petugas — **STATUS: SCAFFOLD SELESAI, BUILD SUKSES**

### Keputusan yang dikonfirmasi user
- Perlu dashboard publik yang bisa diakses warga TANPA login sama sekali.
- Fitur petugas WAJIB login, dengan kontrol siapa boleh masuk (bukan sekadar "siapa saja yang punya link").
- Metode login: **Google Sign-In** (dipilih dari 3 opsi: Google Sign-In, custom claims via Cloud Functions, email/password manual) — dipilih karena tetap gratis (Spark plan, tidak perlu Cloud Functions/Blaze), tidak perlu petugas bikin password baru, dan kontrol akses tetap bisa lewat whitelist Firestore manual (konsisten dengan pola PIN yang sudah ada).

### Arsitektur
- **Dua lapis auth berjalan bersamaan**:
  1. Anonymous Auth (otomatis, tanpa UI) — untuk semua pengunjung, memenuhi `request.auth != null` di rules untuk hak BACA. Ini yang membuat landing page & 3 layar publik bisa diakses tanpa login.
  2. Google Sign-In + whitelist `authorized_emails` — wajib untuk fitur petugas. Dicek di 2 tempat: router guard (`src/router/index.js`, lapisan UX) DAN firestore.rules (`isAuthorized()`, lapisan keamanan sesungguhnya).
- **`authorized_emails/{email}`**: collection baru, dokumen dengan ID = email persis, dibuat manual oleh admin lewat Firestore console atau script `scripts/add-authorized-emails.mjs`. TIDAK bisa ditulis dari dalam app (rules: `allow write: if false`) — mencegah petugas yang sudah authorized menambahkan orang lain secara sepihak.
- **Cache localStorage** (`kpps_authorized_email`) di `useAuth.js` — device yang device-nya sudah pernah login & terverifikasi tetap bisa masuk walau offline di kunjungan berikutnya. Ini CUMA gate UX; keamanan sesungguhnya tetap di firestore.rules yang jalan di server, tidak bisa dipalsukan dari client.
- **`signInWithRedirect`** (bukan `signInWithPopup`) dipilih untuk Google Sign-In karena lebih reliable di PWA yang di-install ke homescreen / WebView Android.
- Firestore rules direvisi: semua collection sekarang pisah `read` (tetap `auth != null`, termasuk anonymous) vs `write` (`isAuthorized()`, wajib Google + whitelist). Collection `authorized_emails` sendiri: `read` untuk yang sudah authorized, `write` selalu `false` dari app.

### Routing
- `/` sekarang **LandingView** (publik, dashboard link ke 3 layar display + tombol login) — BUKAN lagi SetupView.
- `/setup` (dipindah dari `/`), `/petugas-depan`, `/kpps`, `/tally`, `/rekap` sekarang punya `meta: { requiresAuth: true }`, dicegat oleh `router.beforeEach` yang panggil `isAuthorizedPetugas()`.
- `/login` — halaman baru, Google Sign-In + tampilan status (checking/denied/success).
- 3 layar `/display/*` TIDAK berubah, tetap publik tanpa gate.

### File yang sudah ada
```
src/composables/useAuth.js  -- Google Sign-In, logout, checkAuthorized, isAuthorizedPetugas (untuk router guard)
src/views/LandingView.vue   -- dashboard publik, link ke 3 layar + tombol login
src/views/LoginView.vue     -- Google Sign-In + cek whitelist + pesan status
scripts/add-authorized-emails.mjs -- bulk-add email ke whitelist (alternatif dari manual Firestore console)
```
`SetupView.vue` diperluas: prefill nama dari `displayName` akun Google, tombol logout.
`firebase.js` diperluas: export `googleProvider`.
`main.js` diperluas: `getRedirectResult()` sebelum `ensureSignedIn()`, supaya alur redirect Google Sign-In selesai dengan benar sebelum app mount.

### Gap yang diketahui
- Belum ada halaman admin di dalam app untuk kelola `authorized_emails` — murni manual (Firestore console/script).
- Testing Google Sign-In di IP LAN (bukan `localhost` atau domain HTTPS asli) kemungkinan gagal karena domain belum ter-authorize di Firebase Auth settings — didokumentasikan di README.

## 7. Keputusan yang Sudah Final (jangan diubah tanpa alasan kuat)

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Platform | PWA, bukan native Android | Kebutuhan sudah terpenuhi tanpa native; native disimpan untuk v2 (NFC e-KTP) |
| Konektivitas | Selalu ada internet (lemah) di TPS | Menghindari kompleksitas local sync server |
| Buffer antrean | Hardcoded 10 | Skala kecil, 1 TPS; catatan v2: pindah ke `tps_config` kalau perlu configurable |
| Auth (baca/publik) | Anonymous Auth + rules | Gratis, tidak nambah friction, tapi tetap menutup akses publik untuk WRITE |
| Auth (petugas/tulis) | Google Sign-In + whitelist `authorized_emails` | Gratis (tanpa Cloud Functions/Blaze), tanpa password, kontrol akses manual konsisten dengan pola PIN |
| PIN Ketua | Plain string, validasi client-side | Simple/murah/cepat, cocok untuk pemakaian sendiri (bukan multi-tenant) |
| Guard race condition | Client-side (bukan `runTransaction`) | Transaction butuh koneksi server, tidak kompatibel offline-first |
| Timestamp sorting | `Date.now()` client-side, bukan `serverTimestamp()` | Menghindari `null` di cache saat koneksi lemah |

