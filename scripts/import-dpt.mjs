// Jalankan H-1 (atau kapan saja sebelum hari-H) untuk mengisi collection
// `dpt` dari file CSV DPT resmi. Sekali jalan sebelum device pertama kali
// dibuka di lokasi TPS, supaya IndexedDB persistence bisa langsung
// menyimpan seluruh data secara lokal saat app pertama dibuka.
//
// Cara pakai:
//   node scripts/import-dpt.mjs path/ke/dpt.csv
//
// Format CSV yang diharapkan (header wajib ada):
//   no_urut,nama,rt,rw,jenis_kelamin
//
// Butuh service account key (JANGAN commit file ini ke git):
//   1. Firebase Console > Project Settings > Service Accounts > Generate new private key
//   2. Simpan sebagai scripts/serviceAccountKey.json

import { readFileSync } from 'fs'
import { initializeApp } from 'firebase-admin/app'
import { cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node scripts/import-dpt.mjs path/ke/dpt.csv')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync('./scripts/serviceAccountKey.json', 'utf-8'))
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split('\n')
  const headers = headerLine.split(',').map((h) => h.trim())
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(',').map((v) => v.trim())
      return Object.fromEntries(headers.map((h, i) => [h, values[i]]))
    })
}

async function main() {
  const rows = parseCsv(readFileSync(csvPath, 'utf-8'))
  console.log(`Ditemukan ${rows.length} baris DPT. Mulai import...`)

  // Batch write per 400 dokumen (limit Firestore batch = 500) supaya aman
  let batch = db.batch()
  let count = 0

  for (const row of rows) {
    const ref = db.collection('dpt').doc(String(row.no_urut))
    batch.set(ref, {
      no_urut: Number(row.no_urut),
      nama: row.nama,
      rt: row.rt || '',
      rw: row.rw || '',
      jenis_kelamin: row.jenis_kelamin || '',
      status_proses: 'BELUM_HADIR',
      waktu_masuk_antrean: null,
      waktu_konfirmasi: null,
      status_centang_manual: false,
      kategori_pemilih: 'DPT'
    })
    count++

    if (count % 400 === 0) {
      await batch.commit()
      console.log(`  ...${count} tersimpan`)
      batch = db.batch()
    }
  }

  await batch.commit()
  console.log(`Selesai. Total ${count} data DPT diimport.`)
}

main().catch((err) => {
  console.error('Import gagal:', err)
  process.exit(1)
})
