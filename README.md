# KPPS Pilkalurah — Aplikasi Asisten Digital

Scaffold Modul 1–3 + landing page publik + login petugas dari PROJECT_CONTEXT.md.

## Yang sudah termasuk di scaffold ini

- Vue 3 + Vite + PWA (offline installable, service worker untuk app shell)
- Firestore dengan `persistentLocalCache` (multi-tab) — offline-first sesuai strategi A
- **Landing page publik** (`/`) — dashboard untuk warga TANPA login, link ke 3 layar publik + tombol login petugas
- **Login petugas** (`/login`) — Google Sign-In + whitelist Firestore (`authorized_emails`), lihat bagian Auth di bawah
- Guard client-side untuk double-tap / race condition — lihat komentar panjang di `src/composables/useDpt.js` soal kenapa `runTransaction` TIDAK dipakai
- Client-generated timestamp untuk sorting antrean/suara — `serverTimestamp()` tetap dipakai terpisah untuk audit resmi
- **Modul 1**: Setup device (pilih role + nama, prefill dari akun Google), Petugas Depan (numpad + buffer 10), KPPS (daftar antrean + filter centang manual)
- **Modul 2**: Papan Hitung Suara (tombol besar per calon + undo), validasi otomatis (Total Suara vs Pemilih Hadir), PIN gate berlapis (`PRESENSI_OPEN` → `PRESENSI_LOCKED` → `TALLY_DONE`)
- **Modul 3**: Form rekap (waktu, catatan, daftar saksi) + preview + export PDF Berita Acara (client-side via `jsPDF`, tanpa backend)
- **Layar publik** (`/display/presensi`, `/display/tally`, `/display/hasil-akhir`): donut chart kehadiran, bar chart hasil suara real-time, dan layar hasil final — semua untuk dibuka di device terpisah menghadap saksi/publik
- Script import DPT dari CSV via Firebase Admin SDK
- Script bulk-add email petugas ke whitelist

## Setup

### 1. Buat project Firebase
1. https://console.firebase.google.com → Create project
2. Aktifkan **Firestore Database** (mode production, pilih region terdekat)
3. Aktifkan **Authentication** → sign-in method → **Anonymous** (toggle enable) DAN **Google** (toggle enable)
4. Authentication → Settings → **Authorized domains** → tambahkan domain custom kamu kalau deploy ke luar `*.web.app`/`*.firebaseapp.com` (misal domain dari infra Cloudflare Tunnel kamu)
5. Project Settings → General → scroll ke "Your apps" → tambah Web app → copy config

### 2. Isi config
Edit `src/config/firebase.js`, ganti `firebaseConfig` dengan config dari langkah 1.

### 3. Deploy security rules
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # pilih project yang sudah dibuat, pakai firestore.rules yang sudah ada
firebase deploy --only firestore:rules
```

### 4. Daftarkan email petugas (whitelist akses)
Ini yang mengontrol siapa boleh login sebagai petugas. Dua cara, pilih salah satu:

**Cara A — manual lewat Firestore Console** (paling simpel untuk sedikit orang):
Buat collection `authorized_emails`, lalu buat dokumen baru dengan **ID dokumen = email persis** (misal `budi@gmail.com`), isi field apa saja (boleh kosong/`{}`).

**Cara B — script bulk** (kalau petugasnya banyak):
```bash
npm install firebase-admin
# taruh service account key di scripts/serviceAccountKey.json
node scripts/add-authorized-emails.mjs budi@gmail.com siti@gmail.com ...
```

Kalau ada petugas baru di tengah jalan atau ada yang perlu dicabut aksesnya, tinggal tambah/hapus dokumen di collection ini kapan saja — tidak perlu redeploy kode.

### 5. Isi dokumen `tps_config`
Manual lewat Firestore Console, buat dokumen di collection `tps_config` dengan ID `tps-default` (sesuai `TPS_ID` di `src/config/constants.js`):
```json
{
  "nama_tps": "TPS Contoh",
  "pin_ketua": "123456",
  "status_tps": "PRESENSI_OPEN",
  "daftar_calon": [
    { "id": "calon-1", "nama": "Calon 1" },
    { "id": "calon-2", "nama": "Calon 2" },
    { "id": "calon-3", "nama": "Calon 3" },
    { "id": "calon-4", "nama": "Calon 4" }
  ]
}
```
`daftar_calon` sengaja array yang bisa diedit kapan saja di Firestore Console (tambah/hapus elemen) tanpa perlu redeploy kode — Papan Hitung di Modul 2 otomatis menyesuaikan jumlah tombol. Defaultnya 4 calon (placeholder), ganti nama & jumlah sesuai calon riil sebelum hari-H.

Field Modul 3 (`tanggal_pemilihan`, `waktu_mulai_pemungutan`, dst, `catatan_khusus`, `daftar_saksi`) TIDAK perlu diisi manual di sini — semua bisa diisi langsung lewat form di halaman `/rekap`.

### 6. Import data DPT (H-1)
Siapkan CSV dengan header `no_urut,nama,rt,rw,jenis_kelamin`, lalu:
```bash
npm install firebase-admin
# taruh service account key di scripts/serviceAccountKey.json (lihat komentar di script)
node scripts/import-dpt.mjs path/ke/dpt.csv
```

### 7. Install & jalankan
```bash
npm install
npm run dev
```
Buka di HP via IP LAN (`npm run dev` akan tampilkan alamat network) atau deploy ke Firebase Hosting / Netlify / Vercel untuk akses via HTTPS (wajib HTTPS untuk PWA install prompt, service worker, DAN Google Sign-In).

**Catatan penting soal testing Google Sign-In**: `localhost` biasanya sudah otomatis authorized, tapi akses lewat IP LAN (misal `192.168.x.x:5173`) BELUM TENTU authorized untuk redirect Google -- kalau login gagal saat testing di HP lewat IP LAN, itu sebabnya. Deploy ke domain HTTPS asli untuk testing penuh, atau uji dulu di localhost lewat browser desktop.

### 8. Testing offline
Chrome DevTools → Network tab → set ke "Offline" untuk simulasi TPS tanpa sinyal. Data DPT yang sudah diimport tetap bisa dicari & diproses karena sudah di IndexedDB. Login Google WAJIB online sekali di awal (OAuth butuh internet); setelah itu sesi tersimpan dan device bisa kerja offline seperti biasa.

## Autentikasi & Otorisasi (penting dibaca)

Dua lapis yang berjalan bersamaan:

1. **Anonymous Auth** (otomatis, tanpa UI login) — jalan untuk SEMUA pengunjung sejak app pertama dibuka, termasuk warga yang cuma buka landing page atau layar publik. Ini yang memenuhi syarat `request.auth != null` di Firestore rules untuk hak BACA data.
2. **Google Sign-In + whitelist** (`authorized_emails`) — wajib untuk fitur petugas (Setup, Petugas Depan, KPPS, Tally, Rekap). Petugas login pakai akun Google mereka; app cek apakah emailnya ada di collection `authorized_emails`. Kalau tidak ada, ditolak dengan pesan jelas dan tombol untuk coba akun lain.

**Kenapa bukan Cloud Functions/custom claims?** Custom claims butuh Cloud Functions untuk di-set, dan Cloud Functions butuh upgrade ke Blaze plan (tetap gratis di kuota kecil, tapi wajib daftar kartu kredit). Whitelist berbasis `exists()` di Firestore rules mencapai hasil yang sama (kontrol akses per-email) tanpa perlu itu semua — konsisten dengan pola PIN Ketua yang sudah ada (semua kontrol akses dikelola manual lewat Firestore console, tanpa backend tambahan).

**Kenapa ada cache di localStorage (`kpps_authorized_email`)?** Supaya petugas yang device-nya sudah pernah login & terverifikasi tidak perlu re-check ke Firestore tiap buka app (bisa gagal kalau offline). Ini CUMA gate UX -- keamanan sesungguhnya tetap di `firestore.rules` yang jalan di server Firestore, tidak bisa dipalsukan dari client.

## Alur pemakaian hari-H (ringkas)

1. Warga buka domain app → langsung lihat landing page (tanpa login) → bisa klik ke layar presensi/tally/hasil akhir kapan saja.
2. Petugas buka domain app → klik "Login Petugas" → masuk dengan Google → (kalau emailnya sudah terdaftar) diarahkan ke Setup Device.
3. Setiap device petugas pilih role + nama (prefill dari akun Google, bisa diedit) — tersimpan di localStorage device itu.
4. Petugas Depan input no. urut lewat numpad → masuk antrean (maks 10).
5. KPPS 1/2 konfirmasi hadir dari daftar antrean, atau batalkan kalau salah.
6. Ketua (di `/tally`) kunci presensi dulu (PIN) → baru bisa mulai tap suara per calon.
7. Setelah semua surat suara dihitung, Ketua kunci & submit hasil tally (PIN).
8. Buka `/rekap`, isi waktu pelaksanaan + catatan + daftar saksi, cek ringkasan, lalu export PDF Berita Acara.
9. Buka `/display/hasil-akhir` untuk menampilkan hasil resmi final ke saksi/warga.

## Yang BELUM ada di scaffold ini (perlu didiskusikan/dibangun lanjut)

- **`devices/{device_id}` registrasi** — saat ini device_id hanya disimpan di localStorage, belum di-push ke Firestore collection `devices`
- **Icon PWA** (`public/icons/icon-192.png`, `icon-512.png`) — belum dibuat
- **UI untuk mengubah `daftar_calon`** — saat ini harus edit manual lewat Firestore console
- **Format BA/C1 belum final** — struktur PDF di `generateBeritaAcaraPdf.js` dibuat modular per-section
- **Bundle size membengkak** karena `jsPDF` menarik `html2canvas` + `dompurify` sebagai dependency bawaan meski tidak dipakai langsung
- **Halaman admin untuk kelola `authorized_emails` dari dalam app** — saat ini murni manual lewat Firestore console/script, belum ada UI

## Catatan keamanan

`src/config/firebase.js` berisi `apiKey` publik Firebase — ini **normal dan aman** untuk web app Firebase (bukan secret), karena akses sebenarnya dikontrol lewat Firestore Security Rules (`firestore.rules`), bukan lewat kerahasiaan config. Yang **harus** dijaga kerahasiaannya adalah `scripts/serviceAccountKey.json` — jangan commit ke git (sudah ada di `.gitignore`).
