// Bantu daftarkan beberapa email petugas sekaligus ke collection
// `authorized_emails` -- alternatif dari nambah satu-satu manual lewat
// Firestore console (tetap valid, script ini cuma mempercepat kalau
// petugasnya banyak).
//
// Cara pakai:
//   node scripts/add-authorized-emails.mjs email1@gmail.com email2@gmail.com ...
//
// Butuh service account key yang sama dengan scripts/import-dpt.mjs
// (scripts/serviceAccountKey.json -- JANGAN commit ke git).

import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const emails = process.argv.slice(2)
if (emails.length === 0) {
  console.error('Usage: node scripts/add-authorized-emails.mjs email1@gmail.com email2@gmail.com ...')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync('./scripts/serviceAccountKey.json', 'utf-8'))
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function main() {
  for (const email of emails) {
    const trimmed = email.trim().toLowerCase()
    await db.collection('authorized_emails').doc(trimmed).set({
      ditambahkan_pada: new Date().toISOString()
    })
    console.log(`✓ ${trimmed} ditambahkan ke authorized_emails`)
  }
  console.log(`Selesai. Total ${emails.length} email diproses.`)
}

main().catch((err) => {
  console.error('Gagal menambahkan email:', err)
  process.exit(1)
})
