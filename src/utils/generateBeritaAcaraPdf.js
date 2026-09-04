/**
 * Generate Berita Acara sebagai PDF, 100% client-side (jsPDF menggambar
 * teks langsung, bukan screenshot DOM) -- konsisten dengan arsitektur
 * offline-first, tidak butuh koneksi internet sama sekali untuk export.
 *
 * Field-field di sini SENGAJA dibuat longgar (bukan skema kaku) karena
 * format resmi BA/C1 belum final -- kemungkinan berubah. Struktur fungsi
 * per-section supaya gampang disusun ulang / ditambah section baru nanti
 * tanpa merombak seluruh file.
 *
 * `jspdf` di-import secara dynamic (bukan di top-level) karena dependency
 * bawaannya (html2canvas + dompurify, tidak dipakai langsung di sini)
 * menambah ~250KB ke bundle utama kalau di-import statis -- itu jadi beban
 * untuk SEMUA pengunjung (termasuk warga yang cuma buka landing page/layar
 * publik), padahal fitur export PDF cuma dipakai Ketua sekali di akhir
 * hari-H. Dengan dynamic import, kode ini baru diunduh saat tombol export
 * benar-benar diklik. Fungsi jadi async; caller (RekapView.vue) sudah
 * menyesuaikan dengan `await`.
 */
export async function generateBeritaAcaraPdf({
  namaTps,
  tanggalPemilihan,
  waktuMulaiPemungutan,
  waktuSelesaiPemungutan,
  waktuMulaiHitung,
  waktuSelesaiHitung,
  totalDpt,
  jumlahHadir,
  jumlahBelumHadir,
  persenHadir,
  hasilSuara, // [{ nama, count }], sudah termasuk baris "Tidak Sah"
  totalSuara,
  catatanKhusus,
  daftarSaksi, // [string]
  namaKetua
}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const marginX = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  function heading(text, size = 13) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.text(text, pageWidth / 2, y, { align: 'center' })
    y += size / 2.2
  }

  function sectionTitle(text) {
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(text, marginX, y)
    y += 2
    doc.setDrawColor(180, 180, 180)
    doc.line(marginX, y, pageWidth - marginX, y)
    y += 6
  }

  function row(label, value) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(label, marginX, y)
    doc.text(String(value), marginX + 70, y)
    y += 6
  }

  function paragraph(text) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(text || '-', pageWidth - marginX * 2)
    doc.text(lines, marginX, y)
    y += lines.length * 5 + 2
  }

  // --- Header ---
  heading('BERITA ACARA HASIL PEMILIHAN LURAH')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(namaTps || '-', pageWidth / 2, y, { align: 'center' })
  y += 5
  doc.text(tanggalPemilihan || '-', pageWidth / 2, y, { align: 'center' })
  y += 10

  // --- Waktu Pelaksanaan ---
  sectionTitle('Waktu Pelaksanaan')
  row('Pemungutan Suara', `${waktuMulaiPemungutan || '-'}  s/d  ${waktuSelesaiPemungutan || '-'}`)
  row('Penghitungan Suara', `${waktuMulaiHitung || '-'}  s/d  ${waktuSelesaiHitung || '-'}`)

  // --- Rekap Kehadiran ---
  sectionTitle('Rekapitulasi Kehadiran Pemilih')
  row('Total DPT', totalDpt)
  row('Hadir', `${jumlahHadir}  (${persenHadir}%)`)
  row('Tidak Hadir', jumlahBelumHadir)

  // --- Hasil Suara (tabel manual, tanpa plugin autotable biar dependency minim) ---
  sectionTitle('Hasil Penghitungan Suara')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('No', marginX, y)
  doc.text('Nama', marginX + 15, y)
  doc.text('Jumlah Suara', pageWidth - marginX - 30, y)
  y += 5
  doc.setDrawColor(180, 180, 180)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  hasilSuara.forEach((item, i) => {
    doc.text(String(i + 1), marginX, y)
    doc.text(item.nama, marginX + 15, y)
    doc.text(String(item.count), pageWidth - marginX - 30, y)
    y += 6
  })
  y += 1
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Total', marginX + 15, y)
  doc.text(String(totalSuara), pageWidth - marginX - 30, y)
  y += 10

  // --- Catatan Khusus ---
  sectionTitle('Catatan Kejadian Khusus')
  paragraph(catatanKhusus)

  // --- Tanda Tangan ---
  // Nama saksi dicetak (bukan tanda tangan digital, sesuai keputusan), tapi
  // tetap disediakan ruang kosong di bawah nama untuk tanda tangan basah
  // di atas kertas fisik -- ini standar dokumen resmi yang dicetak dan
  // ditandatangani manual setelah export. Kalau ternyata tidak perlu,
  // gampang dihapus (lihat fungsi signatureBlock di bawah).
  if (y > 230) {
    doc.addPage()
    y = 20
  }
  sectionTitle('Saksi yang Hadir')

  function signatureBlock(nama) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(nama, marginX, y)
    y += 18 // ruang kosong untuk tanda tangan fisik
    doc.line(marginX, y, marginX + 60, y)
    y += 4
    doc.setFontSize(8)
    doc.text('Tanda Tangan', marginX, y)
    y += 10
  }

  ;(daftarSaksi.length ? daftarSaksi : ['-']).forEach(signatureBlock)

  y += 4
  sectionTitle('Ketua KPPS')
  signatureBlock(namaKetua || '-')

  doc.save(`Berita-Acara-${(namaTps || 'TPS').replace(/\s+/g, '-')}.pdf`)
}
