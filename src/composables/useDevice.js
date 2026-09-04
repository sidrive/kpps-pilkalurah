import { ref } from 'vue'

const DEVICE_ID_KEY = 'kpps_device_id'
const DEVICE_ROLE_KEY = 'kpps_device_role'
const DEVICE_NAME_KEY = 'kpps_device_nama_petugas'

function generateUuid() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  // fallback sederhana kalau browser lama tidak punya crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Device identity disimpan di localStorage (bukan sessionStorage) supaya
 * persist antar reload/restart browser -- device yang sama harus selalu
 * punya device_id yang sama untuk keperluan audit trail di presensi_log.
 */
export function useDevice() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = generateUuid()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }

  const role = ref(localStorage.getItem(DEVICE_ROLE_KEY) || '')
  const namaPetugas = ref(localStorage.getItem(DEVICE_NAME_KEY) || '')

  function setRole(newRole) {
    role.value = newRole
    localStorage.setItem(DEVICE_ROLE_KEY, newRole)
  }

  function setNamaPetugas(nama) {
    namaPetugas.value = nama
    localStorage.setItem(DEVICE_NAME_KEY, nama)
  }

  function isSetupComplete() {
    return Boolean(role.value && namaPetugas.value)
  }

  return {
    deviceId, // tidak reaktif, tidak pernah berubah setelah generate pertama
    role,
    namaPetugas,
    setRole,
    setNamaPetugas,
    isSetupComplete
  }
}
