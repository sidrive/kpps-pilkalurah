# Versi Android (Capacitor)

Aplikasi Android ini membungkus web app Vue yang sama (tanpa menulis ulang) memakai
[Capacitor](https://capacitorjs.com). Semua logic Firestore, offline cache, tally, rekap, dan PDF
tetap satu kode dengan versi PWA. Branch: `claude/android-app`.

- `appId`: `id.pilkalurah.kpps`
- Orientasi dikunci portrait, akses Firestore memakai `persistentLocalCache` (IndexedDB di WebView)
- Login Google memakai Google Sign-In **native** (`@capacitor-firebase/authentication`), lalu
  credential-nya diteruskan ke Firebase JS SDK sehingga sesi auth tetap satu (lihat `useAuth.js`)

## Prasyarat
Node 20+, JDK 17, Android Studio (atau Android SDK + `ANDROID_HOME`).

## Setup satu kali (WAJIB agar login Google jalan)
1. Firebase Console → Project Settings → Your apps → **Add app → Android**
   - package name: `id.pilkalurah.kpps`
   - SHA-1: ambil dari `cd android && ./gradlew signingReport` (debug) dan keystore release nanti
2. Aktifkan Google sign-in di Authentication (sudah aktif untuk web).
3. Download `google-services.json` → taruh di `android/app/google-services.json`
   (sudah di-`.gitignore`, jangan di-commit).
   Tanpa file ini app tetap build dan jalan, tapi tombol login Google gagal.

## Build
```bash
npm install
npm run android:build     # build web + cap sync + assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
npm run android:open      # buka di Android Studio (run ke device/emulator)
```
Setelah mengubah kode web, jalankan `npm run android:sync` sebelum run ulang.

CI: workflow `Android debug APK` membangun APK debug dan meng-upload sebagai artifact.
Isi secret `GOOGLE_SERVICES_JSON` dengan isi file `google-services.json`.

## Rilis
Untuk APK release, buat keystore sendiri (jangan di-commit) dan konfigurasikan `signingConfigs`
di `android/app/build.gradle`, lalu `./gradlew assembleRelease`/`bundleRelease`.
Daftarkan SHA-1 keystore release ke Firebase juga.
