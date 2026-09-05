# KPPS Pilkalurah — Aplikasi Asisten Digital

Scaffold Modul 1–3 + landing page publik + login petugas dari PROJECT_CONTEXT.md.

## Yang sudah termasuk di scaffold ini

- Vue 3 + Vite + PWA (offline installable, service worker untuk app shell)
- Firestore dengan `persistentLocalCache` (multi-tab) — offline-first sesuai strategi A
- **Landing page publik** (`/`) — dashboard untuk warga TANPA login, link ke 3 layar publik + tombol login petugas
- **Login petugas** (`/login`) — Google Sign-In + whitelist Firestore (`authorized_emails`), lihat bagian Auth di bawah
- **Admin internal** (`/admin`) — kelola daftar calon dan whitelist email petugas (perubahan whitelist memakai gate PIN Ketua di UI)
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
Firebase CLI sudah tersedia sebagai dependency project, jadi tidak perlu instalasi global:
```bash
npx firebase login
npx firebase deploy --only firestore:rules
```
Project default sudah dikunci ke `kpps-pilkalurah` di `.firebaserc`; tetap periksa nama project pada output CLI sebelum menyetujui deployment.

### 4. Bootstrap data awal
Taruh service account key di `scripts/serviceAccountKey.json` (file ini sudah diabaikan Git), lalu jalankan:
```bash
node scripts/bootstrap-firestore.mjs
```
Script interaktif ini membuat whitelist email pertama dan dokumen `tps_config/tps-default` secara atomik. Script meminta email admin pertama, nama TPS, serta PIN Ketua tanpa menampilkan ulang PIN di terminal, lalu memverifikasi hasil tulisannya.

Setelah admin pertama dapat login, buka `/admin` untuk:
- mengisi atau mengubah `daftar_calon` tanpa redeploy;
- menambah atau mencabut whitelist email petugas (dengan gate PIN Ketua di UI).

Petugas yang sudah authorized secara teknis memiliki izin Firestore untuk mengubah whitelist. PIN Ketua pada halaman admin adalah gate UX client-side, bukan verifikasi server-side; pembatas keamanan utama tetap whitelist Google email di Firestore Rules.

Field Modul 3 (`tanggal_pemilihan`, `waktu_mulai_pemungutan`, dst, `catatan_khusus`, `daftar_saksi`) dapat diisi langsung melalui `/rekap`.

### 5. Import data DPT (H-1)
Siapkan CSV dengan header `no_urut,nama,rt,rw,jenis_kelamin`, lalu:
```bash
npm install firebase-admin
# taruh service account key di scripts/serviceAccountKey.json (lihat komentar di script)
node scripts/import-dpt.mjs path/ke/dpt.csv
```

### 6. Deploy ke server Armbian dengan Nginx
Aplikasi ini merupakan frontend statis. Setelah build, Nginx dapat menyajikan isi folder `dist/` secara langsung; PM2 tidak diperlukan untuk menjalankan aplikasinya.

Build di komputer development:
```bash
npm run build
```

Salin **isi** folder `dist/` ke document root server, misalnya `/var/www/kpps-pilkalurah/`. Contoh konfigurasi Nginx:
```nginx
server {
    listen 80;
    server_name kpps.example.com;
    root /var/www/kpps-pilkalurah;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location ~ ^/(sw\.js|registerSW\.js|manifest\.webmanifest)$ {
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }
}
```

`try_files ... /index.html` wajib karena router memakai history mode; tanpanya, membuka atau refresh `/setup`, `/admin`, dan `/display/*` akan menghasilkan 404. Aktifkan HTTPS (misalnya Certbot/Let's Encrypt), karena service worker, instalasi PWA, dan Google login pada domain produksi membutuhkan secure context.

Tambahkan domain HTTPS produksi ke `Firebase Console > Authentication > Settings > Authorized domains` sebelum menguji Google login.

Smoke test pascadeploy:
- `/` menampilkan landing publik.
- buka langsung dan refresh `/display/presensi` tidak menghasilkan 404.
- login petugas dari `/login` berhasil dan mengarah ke `/setup`.
- `/admin` dapat membaca dan mengubah calon serta whitelist.
- pengguna anonim tetap hanya mendapat akses read sesuai rules.
- service worker terdaftar dan tidak ada error 404 untuk `manifest`/icon.

### 7. Jalankan secara lokal
```bash
npm install
npm run dev
```
Pilihan lain di luar produksi adalah preview build produksi:
```bash
npm run preview
```

**Catatan penting soal testing Google Sign-In**: `localhost` biasanya sudah otomatis authorized, tapi akses lewat IP LAN (misal `192.168.x.x:5173`) BELUM TENTU authorized untuk redirect/popup Google -- kalau login gagal saat testing di HP lewat IP LAN, itu sebabnya. Pakai URL Hosting produksi untuk pengujian penuh dari HP, atau uji dulu di `localhost` lewat browser desktop.

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
- **Format BA/C1 belum final** — struktur PDF di `generateBeritaAcaraPdf.js` dibuat modular per-section
- **Penggantian data simulasi yang aman** — belum ada prosedur pembersihan/rotasi data trial di `presensi_log`/`tally_votes` sebelum hari-H

## Catatan keamanan

`src/config/firebase.js` berisi `apiKey` publik Firebase — ini **normal dan aman** untuk web app Firebase (bukan secret), karena akses sebenarnya dikontrol lewat Firestore Security Rules (`firestore.rules`), bukan lewat kerahasiaan config. Yang **harus** dijaga kerahasiaannya adalah `scripts/serviceAccountKey.json` — jangan commit ke git (sudah ada di `.gitignore`).
