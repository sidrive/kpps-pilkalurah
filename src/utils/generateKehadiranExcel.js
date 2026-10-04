const STATUS_LABEL = { BELUM_HADIR: 'Belum hadir', DI_ANTREAN: 'Menunggu KPPS', HADIR_SAH: 'Hadir sah' }

function toWib(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const text = d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).replace(',', '').replace(/\./g, ':')
  return `${text} WIB`
}

export async function generateKehadiranExcel({ namaTps, daftar }) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'KPPS Pilkalurah'
  wb.created = new Date()

  const total = daftar.length
  const hadir = daftar.filter((v) => v.status_proses === 'HADIR_SAH').length
  const antre = daftar.filter((v) => v.status_proses === 'DI_ANTREAN').length
  const belum = total - hadir - antre

  const ringkas = wb.addWorksheet('Ringkasan')
  ringkas.columns = [{ width: 32 }, { width: 24 }]
  ringkas.addRow(['Laporan Daftar Kehadiran Pemilih']).font = { bold: true, size: 14 }
  ringkas.addRow(['TPS', namaTps || '-'])
  ringkas.addRow(['Dicetak', toWib(new Date())])
  ringkas.addRow([])
  ringkas.addRow(['Total DPT', total])
  ringkas.addRow(['Hadir sah', hadir])
  ringkas.addRow(['Menunggu KPPS', antre])
  ringkas.addRow(['Belum hadir', belum])
  ringkas.addRow(['Persentase hadir sah', total ? `${((hadir / total) * 100).toFixed(1)}%` : '0%'])

  const ws = wb.addWorksheet('Daftar Kehadiran', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = [
    { header: 'No. Urut DPT', key: 'no', width: 13 },
    { header: 'Nama', key: 'nama', width: 30 },
    { header: 'JK', key: 'jk', width: 6 },
    { header: 'Status Pemilih', key: 'sp', width: 15 },
    { header: 'RT', key: 'rt', width: 6 },
    { header: 'RW', key: 'rw', width: 6 },
    { header: 'Alamat', key: 'alamat', width: 34 },
    { header: 'Status Kehadiran', key: 'status', width: 17 },
    { header: 'No. Kedatangan', key: 'kedatangan', width: 15 },
    { header: 'Waktu Validasi', key: 'validasi', width: 25 },
    { header: 'Waktu Hadir', key: 'hadir', width: 25 },
    { header: 'Petugas', key: 'petugas', width: 20 },
  ]
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } }
  daftar.forEach((v) => {
    ws.addRow({
      no: v.no_urut,
      nama: v.nama,
      jk: v.jenis_kelamin || '',
      sp: v.status_pemilih || '',
      rt: v.rt || '',
      rw: v.rw || '',
      alamat: v.alamat || '',
      status: STATUS_LABEL[v.status_proses] || STATUS_LABEL.BELUM_HADIR,
      kedatangan: v.nomor_kedatangan || '',
      validasi: toWib(v.waktu_validasi),
      hadir: toWib(v.waktu_konfirmasi),
      petugas: v.updated_by_nama || '',
    })
  })
  ws.autoFilter = { from: 'A1', to: 'L1' }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const slug = (namaTps || 'tps').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const filename = `kehadiran-pemilih-${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return filename
}
