import {
  SupervisionRecord,
  computeAutoForm9,
  createEmptySupervision,
} from '../types/supervision';
import { apiRequest } from './api';

interface SamplePreset {
  id: string;
  teacherName: string;
  teacherNip: string;
  teacherEmail: string;
  mataPelajaran: string;
  konsentrasiKeahlian: string;
  kelasSemester: string;
  materiTopik: string;
  tanggal: string;
  ruangLab: string;
  form3Score: number; // 1..4 avg target
  form4Score: number; // 1..4 avg target
  praktikBaik: [string, string];
  perbaikan: [string, string];
}

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'ls-smkn13-2026-001',
    teacherName: 'Dra. Hj. Ratna Kusumawati, M.Pd.',
    teacherNip: '197204151998022003',
    teacherEmail: 'ratna.kusuma@smkn13bdg.sch.id',
    mataPelajaran: 'Kimia Analisis Instrumen',
    konsentrasiKeahlian: 'Kimia Analisis',
    kelasSemester: 'XI KA 2 / Ganjil',
    materiTopik: 'Analisis Spektrofotometri UV-Vis',
    tanggal: '2026-11-04',
    ruangLab: 'Lab Instrumen 1',
    form3Score: 4,
    form4Score: 4,
    praktikBaik: [
      'Penerapan prosedur K3 laboratorium dan kalibrasi kuvet sangat disiplin sebelum praktikum.',
      'Pertanyaan pemantik berbasis studi kasus industri farmasi memicu diskusi kelompok aktif.',
    ],
    perbaikan: [
      'Perlu pembagian waktu lebih seimbang saat pembacaan kurva kalibrasi kelompok belakang.',
      'Penambahan rubrik refleksi mandiri pada LKPD digital.',
    ],
  },
  {
    id: 'ls-smkn13-2026-002',
    teacherName: 'Asep Saepudin, S.Kom., M.T.',
    teacherNip: '198309122010011014',
    teacherEmail: 'asep.saepudin@smkn13bdg.sch.id',
    mataPelajaran: 'Administrasi Infrastruktur Jaringan',
    konsentrasiKeahlian: 'Teknik Komputer dan Jaringan',
    kelasSemester: 'XI TKJ 1 / Ganjil',
    materiTopik: 'Konfigurasi VLAN & Inter-VLAN Routing',
    tanggal: '2026-11-06',
    ruangLab: 'Lab Jaringan Cisco',
    form3Score: 4,
    form4Score: 3,
    praktikBaik: [
      'Penggunaan topologi nyata dengan perangkat switch terkelola meningkatkan kemandirian siswa.',
      'Diferensiasi studi kasus troubleshooting berjalan efektif.',
    ],
    perbaikan: [
      'Siswa yang pasif di kelompok 4 perlu didorong untuk bergantian memegang konfigurasi CLI.',
      'Asesmen formatif singkat di akhir sesi dapat diperkuat dengan kuis topologi.',
    ],
  },
  {
    id: 'ls-smkn13-2026-003',
    teacherName: 'Rina Marlina, S.T.',
    teacherNip: '198906212022212008',
    teacherEmail: 'rina.marlina@smkn13bdg.sch.id',
    mataPelajaran: 'Pemrograman Web & Perangkat Bergerak',
    konsentrasiKeahlian: 'Rekayasa Perangkat Lunak',
    kelasSemester: 'XI RPL 2 / Ganjil',
    materiTopik: 'Integrasi REST API & Validasi Form',
    tanggal: '2026-11-08',
    ruangLab: 'Lab RPL 3',
    form3Score: 3,
    form4Score: 3,
    praktikBaik: [
      'Live coding interaktif membantu peserta didik memahami alur request-response.',
      'Kolaborasi pair programming berjalan tertib.',
    ],
    perbaikan: [
      'Beberapa peserta didik kesulitan membaca pesan error HTTP status code di console.',
      'LKPD perlu menyertakan contoh payload JSON bertahap dari sederhana ke kompleks.',
    ],
  },
  {
    id: 'ls-smkn13-2026-004',
    teacherName: 'Dedi Kurniawan, S.Si.',
    teacherNip: '198603182014021002',
    teacherEmail: 'dedi.kurniawan@smkn13bdg.sch.id',
    mataPelajaran: 'Teknik Pengujian Mikrobiologi',
    konsentrasiKeahlian: 'Analis Pengujian Laboratorium',
    kelasSemester: 'XII APL 1 / Ganjil',
    materiTopik: 'Pewarnaan Gram & Identifikasi Bakteri',
    tanggal: '2026-11-11',
    ruangLab: 'Lab Mikrobiologi',
    form3Score: 3,
    form4Score: 3,
    praktikBaik: [
      'Penguasaan teknis aseptik dan penggunaan mikroskop binokuler ditunjukkan dengan jelas.',
      'Umpan balik langsung saat praktikum mencegah kesalahan fiksasi preparat.',
    ],
    perbaikan: [
      'Alokasi waktu penutup terlalu singkat sehingga kesimpulan siswa belum tergali merata.',
      'Perlu lembar observasi khusus keselamatan biologis bagi setiap meja praktik.',
    ],
  },
  {
    id: 'ls-smkn13-2026-005',
    teacherName: 'Siti Nurhasanah, S.Pd.',
    teacherNip: '199201052023212011',
    teacherEmail: 'siti.nurhasanah@smkn13bdg.sch.id',
    mataPelajaran: 'Matematika Terapan',
    konsentrasiKeahlian: 'Mata Pelajaran Umum / Normatif Adaptif',
    kelasSemester: 'X KA 3 / Ganjil',
    materiTopik: 'Perbandingan Trigonometri pada Pengukuran Lapangan',
    tanggal: '2026-11-13',
    ruangLab: 'Ruang Teori 204',
    form3Score: 3,
    form4Score: 2,
    praktikBaik: [
      'Suasana kelas hangat dan guru ramah menyapa kesiapan belajar peserta didik.',
      'Pemberian contoh soal bertahap membantu siswa memahami konsep dasar sudut.',
    ],
    perbaikan: [
      'Pertanyaan pemantik perlu lebih kontekstual dengan bidang kimia/teknik siswa.',
      'Perlu pendampingan intensif pada kelompok siswa yang masih keliru rasio sinus-kosinus.',
    ],
  },
];

export async function seedSampleSupervisions(adminUid: string): Promise<void> {
  const records: SupervisionRecord[] = SAMPLE_PRESETS.map((preset) => {
    const derivedUsername = preset.teacherEmail.split('@')[0] || 'guru';
    const base = createEmptySupervision({
      id: preset.id,
      createdByUid: adminUid,
      teacherUsername: derivedUsername,
      teacherEmail: `${derivedUsername}@smkn13.local`,
      teacherName: preset.teacherName,
      teacherNip: preset.teacherNip,
      mataPelajaran: preset.mataPelajaran,
      konsentrasiKeahlian: preset.konsentrasiKeahlian,
      supervisorName: 'Tim Supervisi Akademik SMKN 13 Bandung',
    });

    base.kelasSemester = preset.kelasSemester;
    base.tanggal = preset.tanggal;
    base.tahap = 'SEE';
    base.status = 'finalized';

    base.form1.kelasSemester = preset.kelasSemester;
    base.form1.materiTopik = preset.materiTopik;
    base.form1.hariTanggal = preset.tanggal;
    base.form1.ruangLab = preset.ruangLab;
    base.form1.tahap = 'SEE';
    base.form1.timObserver = [
      { nama: 'Drs. H. Endang Suryana, M.Pd.', jabatan: 'Pengawas / Supervisor', tandaTangan: 'Tertanda' },
      { nama: 'Yani Suryani, M.Pd.', jabatan: 'Ketua MGMP / Observer', tandaTangan: 'Tertanda' },
    ];

    base.form2.tujuanLessonStudy = `Meningkatkan keaktifan, pemahaman konsep, dan keterampilan praktik peserta didik pada topik ${preset.materiTopik}.`;
    base.form2.identifikasi['1'] = 'Peserta didik memiliki gaya belajar kinestetik-praktik dominan.';
    base.form2.identifikasi['10'] = 'Optimalisasi kolaborasi kelompok dan ketepatan prosedur kerja.';

    for (let i = 1; i <= 15; i++) {
      const alt = i % 3 === 0 ? Math.max(2, preset.form3Score - 1) : preset.form3Score;
      base.form3.items[String(i)] = {
        skor: alt,
        catatan: alt >= 4 ? 'Lengkap dan terstruktur' : 'Dapat dipertajam',
      };
    }

    for (let i = 1; i <= 7; i++) {
      base.form4.pendahuluan[String(i)] = {
        skor: preset.form4Score,
        catatan: 'Terlaksana sistematis',
      };
    }
    for (let i = 1; i <= 16; i++) {
      const s = i % 4 === 0 ? Math.max(2, preset.form4Score - 1) : preset.form4Score;
      base.form4.inti[String(i)] = {
        skor: s,
        catatan: s >= 3 ? 'Siswa terlibat aktif' : 'Perlu penguatan',
      };
    }
    for (let i = 1; i <= 6; i++) {
      base.form4.penutup[String(i)] = {
        skor: preset.form4Score,
        catatan: 'Refleksi berjalan baik',
      };
    }

    base.form5.rows = [
      {
        namaInisial: 'PD-01 (Kelompok 1)',
        aktivitas: true,
        fokusPerhatian: true,
        bertanya: true,
        berdiskusi: true,
        memahami: preset.form4Score >= 3,
        kesulitan: false,
        catatan: 'Aktif mencatat langkah kerja dan berdiskusi dengan teman sebangku.',
      },
      {
        namaInisial: 'PD-02 (Kelompok 2)',
        aktivitas: true,
        fokusPerhatian: true,
        bertanya: false,
        berdiskusi: true,
        memahami: preset.form4Score >= 3,
        kesulitan: preset.form4Score < 3,
        catatan: 'Fokus membaca LKPD selama 5 menit sebelum mulai praktik.',
      },
      {
        namaInisial: 'PD-03 (Kelompok 3)',
        aktivitas: preset.form4Score >= 3,
        fokusPerhatian: true,
        bertanya: false,
        berdiskusi: preset.form4Score >= 3,
        memahami: preset.form4Score >= 4,
        kesulitan: true,
        catatan: 'Sempat ragu saat verifikasi hasil awal, terbantu setelah arahan guru.',
      },
    ];

    base.form6.jawabanReflektif['1'] = 'Sebagian besar tujuan pembelajaran tercapai sesuai target LKPD.';
    base.form6.halDipertahankan = preset.praktikBaik[0];
    base.form6.halDiperbaiki = preset.perbaikan[0];
    base.form7.hasilPengamatan['1'] = preset.praktikBaik[0];
    base.form7.hasilPengamatan['9'] = preset.perbaikan[0];

    base.form8.praktikBaik[0] = { praktikBaik: preset.praktikBaik[0], bukti: 'Lembar observasi DO' };
    base.form8.perluDiperbaiki[0] = {
      aspek: 'Pengelolaan Kelas & LKPD',
      masalah: preset.perbaikan[0],
      penyebab: 'Variasi kecepatan belajar antar kelompok',
      solusi: preset.perbaikan[1] ?? 'Pendampingan bertahap',
    };

    const auto9 = computeAutoForm9(
      base.form3,
      base.form4,
      base.form5,
      base.form6,
      base.form7,
      base.form8
    );
    base.form9 = auto9;
    base.totalNilai = auto9.totalNilai;
    base.kategori = auto9.kategori;

    base.form10.rows[0] = {
      temuan: preset.perbaikan[0],
      tindakanPerbaikan: preset.perbaikan[1] ?? 'Coaching & perbaikan LKPD',
      penanggungJawab: preset.teacherName,
      waktu: '2 Minggu',
      indikatorKeberhasilan: 'Seluruh kelompok menuntaskan aktivitas tepat waktu',
    };
    base.form10.bentukTindakLanjut =
      auto9.totalNilai >= 91
        ? ['Berbagi Praktik Baik']
        : auto9.totalNilai >= 81
          ? ['Diskusi MGMP', 'Pengembangan perangkat pembelajaran']
          : ['Coaching', 'Mentoring', 'Lesson Study Siklus II'];

    base.form13.hari = 'Rabu';
    base.form13.tanggal = preset.tanggal.slice(8, 10);
    base.form13.bulan = 'November';
    base.form13.tahun = '2026';
    base.form13.praktikBaik = preset.praktikBaik;
    base.form13.halPerluDiperbaiki = preset.perbaikan;
    base.form13.rencanaTindakLanjut = [
      base.form10.rows[0].tindakanPerbaikan,
      'Berbagi hasil refleksi pada forum MGMP sekolah.',
    ];
    base.form13.namaGuru = preset.teacherName;
    base.form13.nipGuru = preset.teacherNip;
    base.form13.namaObserver = 'Yani Suryani, M.Pd.';
    base.form13.namaSupervisor = 'Drs. H. Endang Suryana, M.Pd.';
    base.form13.namaKetuaTim = 'Koordinator Lesson Study SMKN 13';

    return base;
  });

  await apiRequest('/api/supervisions/seed', {
    method: 'POST',
    body: JSON.stringify({ records }),
  });
}
