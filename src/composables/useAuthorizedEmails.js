import { ref, onUnmounted } from 'vue'
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase.js'

const emailsCollection = collection(db, 'authorized_emails')

/**
 * CRUD untuk whitelist `authorized_emails` dari dalam app (AdminView.vue).
 * Sebelumnya collection ini HANYA bisa diedit manual lewat Firestore
 * console (`allow write: if false`) -- rule sekarang dibuka jadi
 * `isAuthorized()`, lihat komentar panjang di firestore.rules soal
 * trade-off keamanannya.
 */
export function useAuthorizedEmails() {
  const emails = ref([]) // [{ email, added_at }]

  const unsubscribe = onSnapshot(emailsCollection, (snap) => {
    emails.value = snap.docs.map((d) => ({ email: d.id, ...d.data() }))
  })
  onUnmounted(() => unsubscribe())

  /**
   * Email di-lowercase & di-trim sebelum disimpan, karena dokumen ID di
   * collection ini HARUS cocok persis dengan `request.auth.token.email`
   * yang dipakai firestore.rules (isAuthorized()) -- kalau tersimpan
   * dengan huruf besar/kecil berbeda dari token Google, whitelist tidak
   * akan match saat login.
   */
  async function addEmail(rawEmail) {
    const email = rawEmail.trim().toLowerCase()
    await setDoc(doc(db, 'authorized_emails', email), { added_at: Date.now() })
  }

  async function removeEmail(email) {
    await deleteDoc(doc(db, 'authorized_emails', email))
  }

  return { emails, addEmail, removeEmail }
}
