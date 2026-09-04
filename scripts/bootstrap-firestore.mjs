// Bootstrap data minimum Firestore sebelum app pertama kali dipakai.
//
// Cara pakai:
//   node scripts/bootstrap-firestore.mjs
//
// Script meminta email admin pertama, nama TPS, dan PIN Ketua secara
// interaktif. PIN tidak ditampilkan di terminal dan tidak pernah dicetak
// kembali. Semua data awal ditulis dalam satu batch atomik.
//
// Butuh scripts/serviceAccountKey.json (JANGAN commit ke git).

import { readFileSync } from 'node:fs'
import { Writable } from 'node:stream'
import { createInterface } from 'node:readline/promises'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const EXPECTED_PROJECT_ID = 'kpps-pilkalurah'
const SERVICE_ACCOUNT_PATH = './scripts/serviceAccountKey.json'

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'))
if (serviceAccount.project_id !== EXPECTED_PROJECT_ID) {
  console.error(
    `Service account bukan milik project ${EXPECTED_PROJECT_ID}. ` +
    `Project yang terbaca: ${serviceAccount.project_id || '(tidak ada)'}`
  )
  process.exit(1)
}

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

let hideOutput = false
const hiddenOutput = new Writable({
  write(chunk, encoding, callback) {
    if (!hideOutput) process.stdout.write(chunk, encoding)
    callback()
  }
})
const rl = createInterface({ input: process.stdin, output: hiddenOutput, terminal: true })

async function question(label) {
  return (await rl.question(label)).trim()
}

async function hiddenQuestion(label) {
  process.stdout.write(label)
  hideOutput = true
  const value = await rl.question('')
  hideOutput = false
  process.stdout.write('\n')
  return value.trim()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function main() {
  console.log(`Bootstrap Firestore untuk project: ${EXPECTED_PROJECT_ID}\n`)

  const email = (await question('Email Google pertama yang diizinkan: ')).toLowerCase()
  if (!isValidEmail(email)) throw new Error('Format email tidak valid.')

  const namaTps = await question('Nama TPS: ')
  if (!namaTps) throw new Error('Nama TPS tidak boleh kosong.')

  const pin = await hiddenQuestion('PIN Ketua (minimal 4 karakter): ')
  if (pin.length < 4) throw new Error('PIN minimal 4 karakter.')

  const pinConfirmation = await hiddenQuestion('Ulangi PIN Ketua: ')
  if (pin !== pinConfirmation) throw new Error('Konfirmasi PIN tidak cocok.')

  const emailRef = db.collection('authorized_emails').doc(email)
  const tpsRef = db.collection('tps_config').doc('tps-default')
  const [emailSnap, tpsSnap] = await Promise.all([emailRef.get(), tpsRef.get()])

  if (tpsSnap.exists) {
    throw new Error(
      'tps_config/tps-default sudah ada. Script berhenti agar konfigurasi yang ada tidak tertimpa.'
    )
  }

  console.log('\nData yang akan dibuat:')
  console.log(`- authorized_emails/${email}${emailSnap.exists ? ' (sudah ada, metadata diperbarui)' : ''}`)
  console.log('- tps_config/tps-default')
  console.log(`- Nama TPS: ${namaTps}`)
  console.log('- Status awal: PRESENSI_OPEN')
  console.log('- Daftar calon: kosong (isi melalui /admin)')
  console.log('- PIN: [disembunyikan]')

  const confirmation = (await question('\nKetik LANJUT untuk menulis data: ')).toUpperCase()
  if (confirmation !== 'LANJUT') {
    console.log('Dibatalkan. Tidak ada data yang ditulis.')
    return
  }

  const batch = db.batch()
  batch.set(emailRef, {
    added_at: Date.now(),
    ditambahkan_pada: new Date().toISOString()
  }, { merge: true })
  batch.set(tpsRef, {
    nama_tps: namaTps,
    pin_ketua: pin,
    status_tps: 'PRESENSI_OPEN',
    daftar_calon: []
  })
  await batch.commit()

  const [verifiedEmail, verifiedTps] = await Promise.all([emailRef.get(), tpsRef.get()])
  const tpsData = verifiedTps.data()
  const verified = verifiedEmail.exists
    && verifiedTps.exists
    && tpsData?.nama_tps === namaTps
    && tpsData?.status_tps === 'PRESENSI_OPEN'
    && Array.isArray(tpsData?.daftar_calon)

  if (!verified) throw new Error('Verifikasi setelah penulisan gagal.')

  console.log('\n✓ Bootstrap berhasil dan sudah diverifikasi.')
  console.log(`✓ Whitelist pertama: ${verifiedEmail.id}`)
  console.log(`✓ TPS: ${tpsData.nama_tps}`)
  console.log(`✓ Status: ${tpsData.status_tps}`)
  console.log('✓ PIN tersimpan (nilainya tidak ditampilkan)')
  console.log('\nSelanjutnya jalankan npm run dev, lalu login dan buka /admin untuk mengisi daftar calon.')
}

main()
  .catch((error) => {
    hideOutput = false
    console.error(`\nGagal bootstrap: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => rl.close())
