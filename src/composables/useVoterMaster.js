import dptRows from '../data/dpt-tps-004.json'

const voters = dptRows.map((voter) => ({
  ...voter,
  no_urut: Number(voter.no_urut),
  rw: voter.rw || '',
  kategori_pemilih: voter.kategori_pemilih || 'DPT'
}))

const voterByNoUrut = new Map(voters.map((voter) => [voter.no_urut, voter]))

export function useVoterMaster() {
  function findVoterByNoUrut(noUrut) {
    return voterByNoUrut.get(Number(noUrut)) || null
  }

  return {
    voters,
    totalDpt: voters.length,
    findVoterByNoUrut
  }
}
