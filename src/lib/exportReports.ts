import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  FORM3_KOMPONEN_MODUL,
  FORM4_INTI,
  FORM4_PENDAHULUAN,
  FORM4_PENUTUP,
  FORM9_WEIGHT_TEMPLATE,
  SupervisionRecord,
  calculateForm3Stats,
  calculateForm4Stats,
} from '../types/supervision';

function formatNum(val: number): string {
  return (Math.round(val * 100) / 100).toFixed(2);
}

export function exportRecapToExcel(records: SupervisionRecord[]): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekapitulasi Utama
  const mainRows: Array<Record<string, string | number>> = records.map((r, idx) => {
    const compMap = Object.fromEntries(
      r.form9.komponen.map((c) => [c.key, c])
    );
    return {
      No: idx + 1,
      'Nama Guru / Observant': r.teacherName,
      'NIP / NIPPPK': r.teacherNip || '-',
      'Email Guru': r.teacherEmail || '-',
      'Mata Pelajaran': r.mataPelajaran,
      'Konsentrasi Keahlian': r.konsentrasiKeahlian || '-',
      'Kelas / Semester': r.kelasSemester || '-',
      Tanggal: r.tanggal || '-',
      Tahap: r.tahap,
      Status:
        r.status === 'finalized'
          ? 'Final'
          : r.status === 'in_progress'
            ? 'Proses'
            : 'Draft',
      'Perencanaan (20%)': compMap.perencanaan?.nilai ?? 0,
      'Pelaksanaan (30%)': compMap.pelaksanaan?.nilai ?? 0,
      'Aktivitas Siswa (25%)': compMap.aktivitasPesertaDidik?.nilai ?? 0,
      'Asesmen (10%)': compMap.asesmen?.nilai ?? 0,
      'Refleksi & RTL (10%)': compMap.refleksiTindakLanjut?.nilai ?? 0,
      'Karakteristik SMK/K3 (5%)': compMap.karakteristikSmkK3?.nilai ?? 0,
      'Nilai Akhir (0-100)': r.totalNilai,
      Kategori: r.kategori,
      'Rekomendasi Tindak Lanjut': r.form9.tindakLanjut,
    };
  });

  if (records.length > 0) {
    const avg = (fn: (r: SupervisionRecord) => number) =>
      Math.round((records.reduce((s, r) => s + fn(r), 0) / records.length) * 100) /
      100;

    mainRows.push({
      No: records.length + 1,
      'Nama Guru / Observant': 'RATA-RATA KESELURUHAN',
      'NIP / NIPPPK': '',
      'Email Guru': '',
      'Mata Pelajaran': '',
      'Konsentrasi Keahlian': '',
      'Kelas / Semester': '',
      Tanggal: '',
      Tahap: '',
      Status: '',
      'Perencanaan (20%)': avg(
        (r) =>
          r.form9.komponen.find((c) => c.key === 'perencanaan')?.nilai ?? 0
      ),
      'Pelaksanaan (30%)': avg(
        (r) =>
          r.form9.komponen.find((c) => c.key === 'pelaksanaan')?.nilai ?? 0
      ),
      'Aktivitas Siswa (25%)': avg(
        (r) =>
          r.form9.komponen.find((c) => c.key === 'aktivitasPesertaDidik')
            ?.nilai ?? 0
      ),
      'Asesmen (10%)': avg(
        (r) => r.form9.komponen.find((c) => c.key === 'asesmen')?.nilai ?? 0
      ),
      'Refleksi & RTL (10%)': avg(
        (r) =>
          r.form9.komponen.find((c) => c.key === 'refleksiTindakLanjut')
            ?.nilai ?? 0
      ),
      'Karakteristik SMK/K3 (5%)': avg(
        (r) =>
          r.form9.komponen.find((c) => c.key === 'karakteristikSmkK3')?.nilai ??
          0
      ),
      'Nilai Akhir (0-100)': avg((r) => r.totalNilai),
      Kategori: '',
      'Rekomendasi Tindak Lanjut': '',
    });
  }

  const ws1 = XLSX.utils.json_to_sheet(mainRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Rekapitulasi Nilai');

  // Sheet 2: Analisis Rata-Rata Komponen
  const compSummary = FORM9_WEIGHT_TEMPLATE.map((tpl) => {
    const avgSkor =
      records.length > 0
        ? records.reduce(
            (s, r) =>
              s + (r.form9.komponen.find((c) => c.key === tpl.key)?.skor ?? 0),
            0
          ) / records.length
        : 0;
    const avgNilai =
      records.length > 0
        ? records.reduce(
            (s, r) =>
              s + (r.form9.komponen.find((c) => c.key === tpl.key)?.nilai ?? 0),
            0
          ) / records.length
        : 0;
    return {
      Komponen: tpl.label,
      'Bobot (%)': tpl.bobot,
      'Rata-Rata Skor (0-100)': Math.round(avgSkor * 100) / 100,
      'Rata-Rata Nilai Terbobot': Math.round(avgNilai * 100) / 100,
    };
  });
  const ws2 = XLSX.utils.json_to_sheet(compSummary);
  XLSX.utils.book_append_sheet(wb, ws2, 'Rata-Rata Komponen');

  // Sheet 3: Detail Form 3 & Form 4
  const detailRows = records.map((r, idx) => {
    const f3 = calculateForm3Stats(r.form3);
    const f4 = calculateForm4Stats(r.form4);
    return {
      No: idx + 1,
      'Nama Guru': r.teacherName,
      'Mata Pelajaran': r.mataPelajaran,
      'Skor Telaah Modul (Form 3 / 60)': f3.totalSkor,
      'Persentase Form 3 (%)': f3.persentase,
      'Pendahuluan (Form 4 / 28)': f4.pendahuluanSkor,
      'Kegiatan Inti (Form 4 / 64)': f4.intiSkor,
      'Penutup (Form 4 / 24)': f4.penutupSkor,
      'Total Observasi (Form 4 / 116)': f4.totalSkor,
      'Persentase Form 4 (%)': f4.persentase,
    };
  });
  const ws3 = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, ws3, 'Detail Form 3 & 4');

  const dateTag = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(
    wb,
    `Rekap_Supervisi_Lesson_Study_SMKN13_Bandung_${dateTag}.xlsx`
  );
}

export function exportRecapToPdf(records: SupervisionRecord[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PEMERINTAH DAERAH PROVINSI JAWA BARAT — DINAS PENDIDIKAN', 148.5, 13, {
    align: 'center',
  });
  doc.setFontSize(14);
  doc.text('SMK NEGERI 13 BANDUNG', 148.5, 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    'REKAPITULASI PENILAIAN KINERJA GURU — SUPERVISI AKADEMIK BERBASIS LESSON STUDY',
    148.5,
    25,
    { align: 'center' }
  );

  doc.setLineWidth(0.5);
  doc.line(14, 28, 283, 28);

  const avgTotal =
    records.length > 0
      ? records.reduce((s, r) => s + r.totalNilai, 0) / records.length
      : 0;
  const sangatBaik = records.filter((r) => r.kategori === 'Sangat Baik').length;
  const baik = records.filter((r) => r.kategori === 'Baik').length;

  doc.setFontSize(9);
  doc.text(
    `Total Data: ${records.length} Supervisi   |   Rata-Rata Nilai Kinerja: ${formatNum(avgTotal)}   |   Sangat Baik: ${sangatBaik}   |   Baik: ${baik}   |   Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
    14,
    34
  );

  const body = records.map((r, idx) => {
    const getN = (k: string) =>
      formatNum(r.form9.komponen.find((c) => c.key === k)?.nilai ?? 0);
    return [
      String(idx + 1),
      `${r.teacherName}\n${r.teacherNip || '-'}`,
      `${r.mataPelajaran}\n${r.konsentrasiKeahlian || '-'}`,
      r.tanggal || '-',
      getN('perencanaan'),
      getN('pelaksanaan'),
      getN('aktivitasPesertaDidik'),
      getN('asesmen'),
      getN('refleksiTindakLanjut'),
      getN('karakteristikSmkK3'),
      formatNum(r.totalNilai),
      r.kategori,
      r.form9.tindakLanjut,
    ];
  });

  autoTable(doc, {
    startY: 38,
    head: [
      [
        'No',
        'Guru / NIP',
        'Mapel / Konsentrasi',
        'Tanggal',
        'Renc\n20%',
        'Laks\n30%',
        'Aktv\n25%',
        'Ases\n10%',
        'Refl\n10%',
        'SMK\n5%',
        'Total',
        'Kategori',
        'Tindak Lanjut',
      ],
    ],
    body,
    styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      4: { halign: 'right', cellWidth: 13 },
      5: { halign: 'right', cellWidth: 13 },
      6: { halign: 'right', cellWidth: 13 },
      7: { halign: 'right', cellWidth: 13 },
      8: { halign: 'right', cellWidth: 13 },
      9: { halign: 'right', cellWidth: 12 },
      10: { halign: 'right', fontStyle: 'bold', cellWidth: 14 },
      11: { halign: 'center', cellWidth: 23 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? 150;
  const sigY = Math.min(finalY + 12, 175);
  doc.setFontSize(9);
  doc.text('Bandung, .................................... 2026', 215, sigY);
  doc.text('Kepala SMKN 13 Bandung / Koordinator Supervisi,', 215, sigY + 5);
  doc.text('........................................................', 215, sigY + 22);
  doc.text('NIP.', 215, sigY + 27);

  const dateTag = new Date().toISOString().slice(0, 10);
  doc.save(`Rekap_Supervisi_SMKN13_Bandung_${dateTag}.pdf`);
}

export function exportSupervisionToPdf(record: SupervisionRecord): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const f1 = record.form1;
  const f3Stats = calculateForm3Stats(record.form3);
  const f4Stats = calculateForm4Stats(record.form4);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    'INSTRUMEN SUPERVISI AKADEMIK BERBASIS LESSON STUDY',
    105,
    14,
    { align: 'center' }
  );
  doc.setFontSize(12);
  doc.text('SMKN 13 BANDUNG', 105, 20, { align: 'center' });
  doc.setLineWidth(0.4);
  doc.line(14, 23, 196, 23);

  // Form 1
  doc.setFontSize(10);
  doc.text('FORM 1. IDENTITAS PELAKSANAAN LESSON STUDY', 14, 30);

  autoTable(doc, {
    startY: 33,
    head: [['Komponen', 'Isian']],
    body: [
      ['Nama Guru / Observant', f1.namaGuru || record.teacherName],
      ['NIP / NIPPPK', f1.nip || record.teacherNip || '-'],
      ['Mata Pelajaran', f1.mataPelajaran || record.mataPelajaran],
      ['Konsentrasi Keahlian', f1.konsentrasiKeahlian || '-'],
      ['Kelas / Semester', f1.kelasSemester || '-'],
      ['Fase', f1.fase || '-'],
      ['Materi / Topik', f1.materiTopik || '-'],
      ['Hari / Tanggal', f1.hariTanggal || record.tanggal || '-'],
      ['Waktu', f1.waktu || '-'],
      ['Ruang / Laboratorium', f1.ruangLab || '-'],
      ['Tahap', f1.tahap || record.tahap],
      ['Supervisor', f1.supervisor || '-'],
    ],
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  // Form 3 Summary
  let y =
    ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? 110) + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    `FORM 3. TELAAH MODUL AJAR/RPP (Skor: ${f3Stats.totalSkor} / ${f3Stats.maxSkor})`,
    14,
    y
  );

  autoTable(doc, {
    startY: y + 3,
    head: [['No', 'Komponen yang Ditelaah', 'Skor', 'Catatan']],
    body: FORM3_KOMPONEN_MODUL.map((label, idx) => {
      const entry = record.form3.items[String(idx + 1)];
      return [
        String(idx + 1),
        label,
        entry?.skor ? String(entry.skor) : '-',
        entry?.catatan || '-',
      ];
    }),
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // Page 2: Form 4 & Form 9
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    `FORM 4. OBSERVASI PELAKSANAAN PEMBELAJARAN (Skor: ${f4Stats.totalSkor} / ${f4Stats.maxSkor})`,
    14,
    15
  );

  const form4Rows = [
    ...FORM4_PENDAHULUAN.map((lbl, idx) => {
      const e = record.form4.pendahuluan[String(idx + 1)];
      return [`A.${idx + 1}`, lbl, e?.skor ? String(e.skor) : '-', e?.catatan || '-'];
    }),
    ...FORM4_INTI.map((lbl, idx) => {
      const e = record.form4.inti[String(idx + 1)];
      return [`B.${idx + 1}`, lbl, e?.skor ? String(e.skor) : '-', e?.catatan || '-'];
    }),
    ...FORM4_PENUTUP.map((lbl, idx) => {
      const e = record.form4.penutup[String(idx + 1)];
      return [`C.${idx + 1}`, lbl, e?.skor ? String(e.skor) : '-', e?.catatan || '-'];
    }),
  ];

  autoTable(doc, {
    startY: 18,
    head: [['Kode', 'Indikator Pelaksanaan Pembelajaran', 'Skor', 'Bukti/Fakta']],
    body: form4Rows,
    styles: { fontSize: 7, cellPadding: 1.3 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 12, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // Page 3: Form 9 & Form 13 Berita Acara
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('FORM 9. REKAPITULASI PENILAIAN SUPERVISI AKADEMIK', 14, 15);

  autoTable(doc, {
    startY: 18,
    head: [['Komponen', 'Bobot', 'Skor (0-100)', 'Nilai']],
    body: [
      ...record.form9.komponen.map((c) => [
        c.label,
        `${c.bobot}%`,
        formatNum(c.skor),
        formatNum(c.nilai),
      ]),
      ['TOTAL NILAI AKHIR', '100%', '', formatNum(record.form9.totalNilai)],
      ['KATEGORI', '', '', record.form9.kategori],
      ['TINDAK LANJUT', '', '', record.form9.tindakLanjut],
    ],
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: {
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 28 },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
  });

  y =
    ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? 95) + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FORM 13. BERITA ACARA HASIL LESSON STUDY', 105, y, {
    align: 'center',
  });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const f13 = record.form13;
  doc.text(
    `Pada hari ${f13.hari || '..............'} tanggal ${f13.tanggal || '......'} Bulan ${f13.bulan || '..............'} Tahun ${f13.tahun || '2026'} telah dilaksanakan kegiatan Supervisi Akademik Berbasis Lesson Study terhadap:`,
    14,
    y,
    { maxWidth: 182 }
  );
  y += 12;

  const infoLines = [
    ['Nama Guru', f13.namaGuru || record.teacherName],
    ['Mata Pelajaran', f1.mataPelajaran || record.mataPelajaran],
    ['Kelas', f1.kelasSemester || record.kelasSemester || '-'],
    ['Materi', f1.materiTopik || '-'],
  ];
  infoLines.forEach(([k, v]) => {
    doc.text(`${k}`, 18, y);
    doc.text(`: ${v}`, 52, y);
    y += 5.5;
  });

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text(
    'Kegiatan dilaksanakan melalui tahapan: PLAN -> DO -> SEE -> TINDAK LANJUT',
    14,
    y
  );
  y += 7;

  doc.text('Praktik baik:', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(`1. ${f13.praktikBaik[0] || '-'}`, 18, y, { maxWidth: 178 });
  y += 6;
  doc.text(`2. ${f13.praktikBaik[1] || '-'}`, 18, y, { maxWidth: 178 });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Hal yang perlu diperbaiki:', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(`1. ${f13.halPerluDiperbaiki[0] || '-'}`, 18, y, { maxWidth: 178 });
  y += 6;
  doc.text(`2. ${f13.halPerluDiperbaiki[1] || '-'}`, 18, y, { maxWidth: 178 });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Rencana tindak lanjut:', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(`1. ${f13.rencanaTindakLanjut[0] || '-'}`, 18, y, { maxWidth: 178 });
  y += 6;
  doc.text(`2. ${f13.rencanaTindakLanjut[1] || '-'}`, 18, y, { maxWidth: 178 });
  y += 10;

  doc.text(
    'Demikian berita acara ini dibuat untuk digunakan sebagai dokumen peningkatan mutu pembelajaran.',
    14,
    y,
    { maxWidth: 182 }
  );
  y += 10;

  doc.text(`${f13.tempat || 'Bandung'}, ${f13.tanggalBeritaAcara || ''}`, 130, y);
  y += 6;

  doc.text('Guru/Observant,', 20, y);
  doc.text('Observer,', 130, y);
  y += 18;
  doc.text(f13.namaGuru || record.teacherName || '........................', 20, y);
  doc.text(f13.namaObserver || '........................', 130, y);
  y += 5;
  doc.text(`NIP. ${f13.nipGuru || record.teacherNip || ''}`, 20, y);
  doc.text(`NIP. ${f13.nipObserver || ''}`, 130, y);

  y += 10;
  doc.text('Supervisor,', 20, y);
  doc.text('Ketua Tim Lesson Study,', 130, y);
  y += 18;
  doc.text(f13.namaSupervisor || f1.supervisor || '........................', 20, y);
  doc.text(f13.namaKetuaTim || '........................', 130, y);
  y += 5;
  doc.text(`NIP. ${f13.nipSupervisor || ''}`, 20, y);
  doc.text(`NIP. ${f13.nipKetuaTim || ''}`, 130, y);

  const safeName = (record.teacherName || 'Guru').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Supervisi_LessonStudy_${safeName}_${record.tanggal || '2026'}.pdf`);
}
