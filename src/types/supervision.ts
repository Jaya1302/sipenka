export type UserRole = 'admin' | 'guru';

export type TahapLessonStudy = 'PLAN' | 'DO' | 'SEE';

export type SupervisionStatus = 'draft' | 'in_progress' | 'finalized';

export type PerformanceCategory =
  | 'Sangat Baik'
  | 'Baik'
  | 'Cukup'
  | 'Perlu Perbaikan';

export interface UserProfile {
  uid: string;
  username?: string;
  email: string;
  displayName: string;
  role: UserRole;
  nip?: string;
  mataPelajaran?: string;
  konsentrasiKeahlian?: string;
  photoURL?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TeacherDirectoryEntry {
  uid: string;
  username?: string;
  displayName: string;
  role: UserRole;
  nip?: string;
  mataPelajaran?: string;
  konsentrasiKeahlian?: string;
  updatedAt?: unknown;
}

export interface RoleAssignment {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  nip?: string;
  mataPelajaran?: string;
  konsentrasiKeahlian?: string;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ObserverMember {
  nama: string;
  jabatan: string;
  tandaTangan: string;
}

export interface Form1Data {
  namaGuru: string;
  nip: string;
  mataPelajaran: string;
  konsentrasiKeahlian: string;
  kelasSemester: string;
  fase: string;
  materiTopik: string;
  hariTanggal: string;
  waktu: string;
  ruangLab: string;
  tahap: TahapLessonStudy;
  supervisor: string;
  timObserver: ObserverMember[];
}

export interface Form2Data {
  identifikasi: Record<string, string>; // keys 1..10
  tujuanLessonStudy: string;
  fokusPengamatan: Record<string, string>; // keys 1..10
}

export interface ScoredIndicatorEntry {
  skor: number; // 0 = belum dinilai, 1..4 = skala
  catatan: string;
}

export interface Form3Data {
  items: Record<string, ScoredIndicatorEntry>; // keys 1..15
  catatanUmum: string;
}

export interface Form4Data {
  pendahuluan: Record<string, ScoredIndicatorEntry>; // 1..7
  inti: Record<string, ScoredIndicatorEntry>; // 1..16
  penutup: Record<string, ScoredIndicatorEntry>; // 1..6
}

export interface StudentObservationRow {
  namaInisial: string;
  aktivitas: boolean;
  fokusPerhatian: boolean;
  bertanya: boolean;
  berdiskusi: boolean;
  memahami: boolean;
  kesulitan: boolean;
  catatan: string;
}

export interface Form5Data {
  rows: StudentObservationRow[];
}

export interface Form6Data {
  jawabanReflektif: Record<string, string>; // 1..10
  halDipertahankan: string;
  halDiperbaiki: string;
  halDicobaBerikutnya: string;
}

export interface Form7Data {
  hasilPengamatan: Record<string, string>; // 1..9
}

export interface Form8TemuanRow {
  temuan: string;
  buktiFakta: string;
  dampak: string;
}

export interface Form8PraktikBaikRow {
  praktikBaik: string;
  bukti: string;
}

export interface Form8PerbaikanRow {
  aspek: string;
  masalah: string;
  penyebab: string;
  solusi: string;
}

export interface Form8Data {
  temuanUtama: Form8TemuanRow[];
  praktikBaik: Form8PraktikBaikRow[];
  perluDiperbaiki: Form8PerbaikanRow[];
}

export interface Form9ComponentScore {
  key:
    | 'perencanaan'
    | 'pelaksanaan'
    | 'aktivitasPesertaDidik'
    | 'asesmen'
    | 'refleksiTindakLanjut'
    | 'karakteristikSmkK3';
  label: string;
  bobot: number; // 20, 30, 25, 10, 10, 5
  skor: number; // 0 - 100
  nilai: number; // (skor * bobot) / 100
}

export interface Form9Data {
  autoCalculated: boolean;
  komponen: Form9ComponentScore[];
  totalNilai: number;
  kategori: PerformanceCategory;
  tindakLanjut: string;
}

export interface Form10Row {
  temuan: string;
  tindakanPerbaikan: string;
  penanggungJawab: string;
  waktu: string;
  indikatorKeberhasilan: string;
}

export interface Form10Data {
  rows: Form10Row[];
  bentukTindakLanjut: string[];
}

export interface Form12Row {
  rekomendasi: string;
  statusPelaksanaan: 'sudah' | 'belum' | '';
  bukti: string;
  hasilMonitoring: string;
}

export interface Form12Data {
  rows: Form12Row[];
  kesimpulanMonitoring: string[];
}

export interface Form13Data {
  hari: string;
  tanggal: string;
  bulan: string;
  tahun: string;
  praktikBaik: [string, string];
  halPerluDiperbaiki: [string, string];
  rencanaTindakLanjut: [string, string];
  tempat: string;
  tanggalBeritaAcara: string;
  namaGuru: string;
  nipGuru: string;
  namaObserver: string;
  nipObserver: string;
  namaSupervisor: string;
  nipSupervisor: string;
  namaKetuaTim: string;
  nipKetuaTim: string;
}

export interface SupervisionRecord {
  id: string;
  createdByUid: string;
  teacherUid?: string;
  teacherUsername?: string;
  teacherEmail: string;
  teacherName: string;
  teacherNip: string;
  mataPelajaran: string;
  konsentrasiKeahlian: string;
  kelasSemester: string;
  tanggal: string;
  tahap: TahapLessonStudy;
  status: SupervisionStatus;
  totalNilai: number;
  kategori: PerformanceCategory;
  form1: Form1Data;
  form2: Form2Data;
  form3: Form3Data;
  form4: Form4Data;
  form5: Form5Data;
  form6: Form6Data;
  form7: Form7Data;
  form8: Form8Data;
  form9: Form9Data;
  form10: Form10Data;
  form12: Form12Data;
  form13: Form13Data;
  createdAt?: unknown;
  updatedAt?: unknown;
}

// --- Static Exact Questions & Indicators from PDF SMKN 13 Bandung ---

export const FORM2_IDENTIFIKASI_ASPEK = [
  'Karakteristik peserta didik',
  'Kompetensi awal peserta didik',
  'Permasalahan pembelajaran yang ditemukan',
  'Kebutuhan belajar peserta didik',
  'Hambatan pembelajaran',
  'Materi yang dianggap sulit',
  'Strategi pembelajaran yang akan digunakan',
  'Media/sumber belajar',
  'Kebutuhan pembelajaran praktik',
  'Fokus perbaikan pembelajaran',
] as const;

export const FORM2_FOKUS_PENGAMATAN = [
  'Keterlibatan peserta didik',
  'Keaktifan bertanya',
  'Diskusi/kolaborasi',
  'Pemahaman materi',
  'Kemandirian belajar',
  'Peserta didik yang mengalami kesulitan',
  'Peserta didik yang pasif',
  'Respons terhadap pertanyaan guru',
  'Aktivitas praktik',
  'Penggunaan media/alat',
] as const;

export const FORM3_KOMPONEN_MODUL = [
  'Tujuan pembelajaran jelas',
  'Tujuan sesuai CP/TP',
  'Materi sesuai tujuan',
  'Metode sesuai karakteristik peserta didik',
  'Model pembelajaran jelas',
  'Aktivitas peserta didik dirancang aktif',
  'Diferensiasi pembelajaran tersedia',
  'Media pembelajaran sesuai',
  'LKPD/lembar kerja mendukung pembelajaran',
  'Asesmen dirancang sesuai tujuan',
  'Instrumen asesmen tersedia',
  'Rencana remedial/pengayaan',
  'Pembelajaran kontekstual dengan dunia kerja',
  'Unsur karakter/Pancawaluya',
  'Keselamatan kerja/K3 untuk pembelajaran praktik',
] as const;

export const FORM4_PENDAHULUAN = [
  'Guru membuka pembelajaran dengan baik',
  'Guru membangun suasana belajar positif',
  'Guru mengecek kesiapan peserta didik',
  'Guru melakukan apersepsi',
  'Guru mengaitkan materi dengan pengalaman peserta didik',
  'Guru menyampaikan tujuan pembelajaran',
  'Guru menyampaikan aktivitas/kriteria keberhasilan',
] as const;

export const FORM4_INTI = [
  'Peserta didik aktif mengikuti pembelajaran',
  'Guru memberikan pertanyaan pemantik',
  'Guru memberikan kesempatan berpikir',
  'Peserta didik berdiskusi',
  'Peserta didik berkolaborasi',
  'Guru memfasilitasi pembelajaran',
  'Guru memberikan pertanyaan tingkat tinggi',
  'Guru memberikan umpan balik',
  'Guru memperhatikan peserta didik yang mengalami kesulitan',
  'Guru memberikan penguatan',
  'Media pembelajaran digunakan secara efektif',
  'Peserta didik menggunakan sumber belajar',
  'Pembelajaran sesuai karakteristik SMK',
  'Pembelajaran mengembangkan keterampilan',
  'Kegiatan praktik berjalan efektif',
  'K3 diterapkan dalam pembelajaran praktik',
] as const;

export const FORM4_PENUTUP = [
  'Guru melakukan refleksi',
  'Peserta didik menyampaikan kesimpulan',
  'Guru melakukan asesmen/cek pemahaman',
  'Guru memberikan umpan balik',
  'Guru menyampaikan tindak lanjut',
  'Guru menutup pembelajaran dengan baik',
] as const;

export const FORM6_PERTANYAAN_REFLEKTIF = [
  'Apakah tujuan pembelajaran tercapai?',
  'Bagian pembelajaran yang paling berhasil?',
  'Bagian pembelajaran yang belum berhasil?',
  'Bagaimana keterlibatan peserta didik?',
  'Peserta didik mana yang membutuhkan perhatian?',
  'Apakah strategi pembelajaran efektif?',
  'Apakah media/LKPD efektif?',
  'Bagaimana respons peserta didik?',
  'Apakah alokasi waktu sesuai?',
  'Apa yang akan diperbaiki?',
] as const;

export const FORM7_PERTANYAAN_OBSERVER = [
  'Apa yang paling menarik dari pembelajaran?',
  'Bagaimana peserta didik belajar?',
  'Bagian mana peserta didik paling aktif?',
  'Bagian mana peserta didik mengalami kesulitan?',
  'Apakah tujuan pembelajaran tercapai?',
  'Strategi apa yang efektif?',
  'Strategi apa yang perlu diperbaiki?',
  'Apa temuan penting dari observasi?',
  'Apa rekomendasi perbaikan?',
] as const;

export const FORM9_WEIGHT_TEMPLATE: Array<{
  key: Form9ComponentScore['key'];
  label: string;
  bobot: number;
}> = [
  { key: 'perencanaan', label: 'Perencanaan pembelajaran', bobot: 20 },
  { key: 'pelaksanaan', label: 'Pelaksanaan pembelajaran', bobot: 30 },
  { key: 'aktivitasPesertaDidik', label: 'Aktivitas/keterlibatan peserta didik', bobot: 25 },
  { key: 'asesmen', label: 'Asesmen pembelajaran', bobot: 10 },
  { key: 'refleksiTindakLanjut', label: 'Refleksi dan tindak lanjut', bobot: 10 },
  { key: 'karakteristikSmkK3', label: 'Kesesuaian dengan karakteristik SMK/K3', bobot: 5 },
];

export const FORM9_KATEGORI_RULES: Array<{
  rentang: string;
  kategori: PerformanceCategory;
  tindakLanjut: string;
}> = [
  {
    rentang: '91–100',
    kategori: 'Sangat Baik',
    tindakLanjut: 'Pengimbasan/berbagi praktik baik',
  },
  {
    rentang: '81–90',
    kategori: 'Baik',
    tindakLanjut: 'Penguatan dan pengembangan',
  },
  {
    rentang: '71–80',
    kategori: 'Cukup',
    tindakLanjut: 'Pembinaan dan pendampingan',
  },
  {
    rentang: '≤70',
    kategori: 'Perlu Perbaikan',
    tindakLanjut: 'Pendampingan intensif dan supervisi ulang',
  },
];

export const FORM10_BENTUK_TINDAK_LANJUT = [
  'Coaching',
  'Mentoring',
  'Diskusi MGMP',
  'IHT',
  'Peer Teaching',
  'Lesson Study Siklus II',
  'Berbagi Praktik Baik',
  'Observasi ulang',
  'Pengembangan perangkat pembelajaran',
] as const;

export const FORM12_KESIMPULAN_MONITORING = [
  'Tindak lanjut berhasil',
  'Tindak lanjut sebagian berhasil',
  'Membutuhkan pendampingan',
  'Membutuhkan Lesson Study siklus berikutnya',
] as const;

export const KONSENTRASI_KEAHLIAN_SMKN13 = [
  'Kimia Analisis',
  'Teknik Komputer dan Jaringan',
  'Rekayasa Perangkat Lunak',
  'Analis Pengujian Laboratorium',
  'Mata Pelajaran Umum / Normatif Adaptif',
] as const;

// --- Calculation Helpers ---

export function getCategoryAndFollowUp(score: number): {
  kategori: PerformanceCategory;
  tindakLanjut: string;
} {
  const rounded = Math.round(score * 100) / 100;
  if (rounded >= 91) {
    return {
      kategori: 'Sangat Baik',
      tindakLanjut: 'Pengimbasan/berbagi praktik baik',
    };
  }
  if (rounded >= 81) {
    return {
      kategori: 'Baik',
      tindakLanjut: 'Penguatan dan pengembangan',
    };
  }
  if (rounded >= 71) {
    return {
      kategori: 'Cukup',
      tindakLanjut: 'Pembinaan dan pendampingan',
    };
  }
  return {
    kategori: 'Perlu Perbaikan',
    tindakLanjut: 'Pendampingan intensif dan supervisi ulang',
  };
}

export function calculateForm3Stats(form3: Form3Data): {
  totalSkor: number;
  maxSkor: number;
  persentase: number;
  answeredCount: number;
} {
  let total = 0;
  let answered = 0;
  for (let i = 1; i <= 15; i++) {
    const val = form3.items[String(i)]?.skor ?? 0;
    if (val > 0) {
      total += val;
      answered += 1;
    }
  }
  const maxSkor = 60;
  return {
    totalSkor: total,
    maxSkor,
    persentase: answered > 0 ? Math.round((total / (answered * 4)) * 1000) / 10 : 0,
    answeredCount: answered,
  };
}

export function calculateForm4Stats(form4: Form4Data): {
  pendahuluanSkor: number;
  intiSkor: number;
  penutupSkor: number;
  totalSkor: number;
  maxSkor: number;
  persentase: number;
  answeredCount: number;
} {
  let p = 0;
  let i = 0;
  let pen = 0;
  let answered = 0;

  for (let k = 1; k <= 7; k++) {
    const s = form4.pendahuluan[String(k)]?.skor ?? 0;
    if (s > 0) {
      p += s;
      answered += 1;
    }
  }
  for (let k = 1; k <= 16; k++) {
    const s = form4.inti[String(k)]?.skor ?? 0;
    if (s > 0) {
      i += s;
      answered += 1;
    }
  }
  for (let k = 1; k <= 6; k++) {
    const s = form4.penutup[String(k)]?.skor ?? 0;
    if (s > 0) {
      pen += s;
      answered += 1;
    }
  }

  const total = p + i + pen;
  const maxSkor = 116;
  return {
    pendahuluanSkor: p,
    intiSkor: i,
    penutupSkor: pen,
    totalSkor: total,
    maxSkor,
    persentase: answered > 0 ? Math.round((total / (answered * 4)) * 1000) / 10 : 0,
    answeredCount: answered,
  };
}

function avgScore100(entries: Array<number | undefined>): number {
  const valid = entries.filter((v): v is number => typeof v === 'number' && v > 0);
  if (valid.length === 0) return 0;
  const avg = valid.reduce((acc, v) => acc + v, 0) / valid.length;
  return Math.round((avg / 4) * 1000) / 10;
}

export function computeAutoForm9(
  form3: Form3Data,
  form4: Form4Data,
  form5: Form5Data,
  form6: Form6Data,
  form7: Form7Data,
  form8: Form8Data
): Form9Data {
  // 1. Perencanaan pembelajaran (20%): Form 3 items 1..9
  const perencanaanSkor = avgScore100(
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => form3.items[String(k)]?.skor)
  );

  // 2. Pelaksanaan pembelajaran (30%): Form 4 Pendahuluan 1..7 + Inti 2,3,6,7,8,9,10,11 + Penutup 2,4,6
  const pelaksanaanSkor = avgScore100([
    ...[1, 2, 3, 4, 5, 6, 7].map((k) => form4.pendahuluan[String(k)]?.skor),
    ...[2, 3, 6, 7, 8, 9, 10, 11].map((k) => form4.inti[String(k)]?.skor),
    ...[2, 4, 6].map((k) => form4.penutup[String(k)]?.skor),
  ]);

  // 3. Aktivitas/keterlibatan peserta didik (25%): Form 4 Inti 1,4,5,12 + Form 5 observation ratio if filled
  const form4StudentSkor = avgScore100(
    [1, 4, 5, 12].map((k) => form4.inti[String(k)]?.skor)
  );
  const filledStudents = form5.rows.filter((r) => r.namaInisial.trim().length > 0);
  let studentEngagementSkor = form4StudentSkor;
  if (filledStudents.length > 0) {
    const positiveSum = filledStudents.reduce((sum, s) => {
      const pts =
        (s.aktivitas ? 1 : 0) +
        (s.fokusPerhatian ? 1 : 0) +
        (s.bertanya ? 1 : 0) +
        (s.berdiskusi ? 1 : 0) +
        (s.memahami ? 1 : 0);
      return sum + (pts / 5) * 100;
    }, 0);
    const form5Avg = Math.round((positiveSum / filledStudents.length) * 10) / 10;
    studentEngagementSkor =
      form4StudentSkor > 0
        ? Math.round((form4StudentSkor * 0.7 + form5Avg * 0.3) * 10) / 10
        : form5Avg;
  }

  // 4. Asesmen pembelajaran (10%): Form 3 items 10,11,12 + Form 4 Penutup 3
  const asesmenSkor = avgScore100([
    form3.items['10']?.skor,
    form3.items['11']?.skor,
    form3.items['12']?.skor,
    form4.penutup['3']?.skor,
  ]);

  // 5. Refleksi dan tindak lanjut (10%): Form 4 Penutup 1,5 + reflection completion bonus
  const form4RefleksiSkor = avgScore100([
    form4.penutup['1']?.skor,
    form4.penutup['5']?.skor,
  ]);
  const form6Filled = Object.values(form6.jawabanReflektif).filter((v) => v.trim().length > 0).length;
  const form7Filled = Object.values(form7.hasilPengamatan).filter((v) => v.trim().length > 0).length;
  const form8Filled =
    form8.temuanUtama.some((r) => r.temuan.trim().length > 0) ||
    form8.praktikBaik.some((r) => r.praktikBaik.trim().length > 0);
  const reflectionCompletionRatio =
    ((form6Filled > 0 ? 1 : 0) + (form7Filled > 0 ? 1 : 0) + (form8Filled ? 1 : 0)) / 3;
  const refleksiSkor =
    form4RefleksiSkor > 0
      ? Math.round((form4RefleksiSkor * 0.75 + reflectionCompletionRatio * 100 * 0.25) * 10) / 10
      : Math.round(reflectionCompletionRatio * 1000) / 10;

  // 6. Kesesuaian dengan karakteristik SMK/K3 (5%): Form 3 items 13,14,15 + Form 4 Inti 13,14,15,16
  const smkK3Skor = avgScore100([
    form3.items['13']?.skor,
    form3.items['14']?.skor,
    form3.items['15']?.skor,
    form4.inti['13']?.skor,
    form4.inti['14']?.skor,
    form4.inti['15']?.skor,
    form4.inti['16']?.skor,
  ]);

  const rawScores: Record<Form9ComponentScore['key'], number> = {
    perencanaan: perencanaanSkor,
    pelaksanaan: pelaksanaanSkor,
    aktivitasPesertaDidik: studentEngagementSkor,
    asesmen: asesmenSkor,
    refleksiTindakLanjut: refleksiSkor,
    karakteristikSmkK3: smkK3Skor,
  };

  const komponen: Form9ComponentScore[] = FORM9_WEIGHT_TEMPLATE.map((tpl) => {
    const skor = rawScores[tpl.key];
    const nilai = Math.round(((skor * tpl.bobot) / 100) * 100) / 100;
    return {
      key: tpl.key,
      label: tpl.label,
      bobot: tpl.bobot,
      skor,
      nilai,
    };
  });

  const totalNilai =
    Math.round(komponen.reduce((acc, item) => acc + item.nilai, 0) * 100) / 100;
  const { kategori, tindakLanjut } = getCategoryAndFollowUp(totalNilai);

  return {
    autoCalculated: true,
    komponen,
    totalNilai,
    kategori,
    tindakLanjut,
  };
}

export function recalculateManualForm9(komponen: Form9ComponentScore[]): Form9Data {
  const updated = komponen.map((k) => {
    const clampedSkor = Math.max(0, Math.min(100, Number(k.skor) || 0));
    return {
      ...k,
      skor: clampedSkor,
      nilai: Math.round(((clampedSkor * k.bobot) / 100) * 100) / 100,
    };
  });
  const totalNilai =
    Math.round(updated.reduce((acc, item) => acc + item.nilai, 0) * 100) / 100;
  const { kategori, tindakLanjut } = getCategoryAndFollowUp(totalNilai);
  return {
    autoCalculated: false,
    komponen: updated,
    totalNilai,
    kategori,
    tindakLanjut,
  };
}

function makeScoredRecord(count: number): Record<string, ScoredIndicatorEntry> {
  const rec: Record<string, ScoredIndicatorEntry> = {};
  for (let i = 1; i <= count; i++) {
    rec[String(i)] = { skor: 0, catatan: '' };
  }
  return rec;
}

function makeStringRecord(count: number): Record<string, string> {
  const rec: Record<string, string> = {};
  for (let i = 1; i <= count; i++) {
    rec[String(i)] = '';
  }
  return rec;
}

export function createEmptySupervision(params: {
  id: string;
  createdByUid: string;
  teacherUid?: string;
  teacherUsername?: string;
  teacherEmail?: string;
  teacherName?: string;
  teacherNip?: string;
  mataPelajaran?: string;
  konsentrasiKeahlian?: string;
  supervisorName?: string;
}): SupervisionRecord {
  const todayIso = new Date().toISOString().slice(0, 10);
  const form3: Form3Data = {
    items: makeScoredRecord(15),
    catatanUmum: '',
  };
  const form4: Form4Data = {
    pendahuluan: makeScoredRecord(7),
    inti: makeScoredRecord(16),
    penutup: makeScoredRecord(6),
  };
  const form5: Form5Data = {
    rows: Array.from({ length: 5 }, () => ({
      namaInisial: '',
      aktivitas: false,
      fokusPerhatian: false,
      bertanya: false,
      berdiskusi: false,
      memahami: false,
      kesulitan: false,
      catatan: '',
    })),
  };
  const form6: Form6Data = {
    jawabanReflektif: makeStringRecord(10),
    halDipertahankan: '',
    halDiperbaiki: '',
    halDicobaBerikutnya: '',
  };
  const form7: Form7Data = {
    hasilPengamatan: makeStringRecord(9),
  };
  const form8: Form8Data = {
    temuanUtama: Array.from({ length: 4 }, () => ({
      temuan: '',
      buktiFakta: '',
      dampak: '',
    })),
    praktikBaik: Array.from({ length: 3 }, () => ({
      praktikBaik: '',
      bukti: '',
    })),
    perluDiperbaiki: Array.from({ length: 3 }, () => ({
      aspek: '',
      masalah: '',
      penyebab: '',
      solusi: '',
    })),
  };
  const form9 = computeAutoForm9(form3, form4, form5, form6, form7, form8);

  return {
    id: params.id,
    createdByUid: params.createdByUid,
    teacherUid: params.teacherUid ?? '',
    teacherUsername: params.teacherUsername ?? '',
    teacherEmail: params.teacherEmail ?? '',
    teacherName: params.teacherName ?? '',
    teacherNip: params.teacherNip ?? '',
    mataPelajaran: params.mataPelajaran ?? '',
    konsentrasiKeahlian: params.konsentrasiKeahlian ?? '',
    kelasSemester: '',
    tanggal: todayIso,
    tahap: 'PLAN',
    status: 'draft',
    totalNilai: form9.totalNilai,
    kategori: form9.kategori,
    form1: {
      namaGuru: params.teacherName ?? '',
      nip: params.teacherNip ?? '',
      mataPelajaran: params.mataPelajaran ?? '',
      konsentrasiKeahlian: params.konsentrasiKeahlian ?? '',
      kelasSemester: '',
      fase: 'F',
      materiTopik: '',
      hariTanggal: todayIso,
      waktu: '07.30 - 09.00 WIB',
      ruangLab: '',
      tahap: 'PLAN',
      supervisor: params.supervisorName ?? '',
      timObserver: [
        { nama: '', jabatan: '', tandaTangan: '' },
        { nama: '', jabatan: '', tandaTangan: '' },
      ],
    },
    form2: {
      identifikasi: makeStringRecord(10),
      tujuanLessonStudy: '',
      fokusPengamatan: makeStringRecord(10),
    },
    form3,
    form4,
    form5,
    form6,
    form7,
    form8,
    form9,
    form10: {
      rows: Array.from({ length: 4 }, () => ({
        temuan: '',
        tindakanPerbaikan: '',
        penanggungJawab: '',
        waktu: '',
        indikatorKeberhasilan: '',
      })),
      bentukTindakLanjut: [],
    },
    form12: {
      rows: Array.from({ length: 3 }, () => ({
        rekomendasi: '',
        statusPelaksanaan: '',
        bukti: '',
        hasilMonitoring: '',
      })),
      kesimpulanMonitoring: [],
    },
    form13: {
      hari: '',
      tanggal: '',
      bulan: '',
      tahun: '2026',
      praktikBaik: ['', ''],
      halPerluDiperbaiki: ['', ''],
      rencanaTindakLanjut: ['', ''],
      tempat: 'Bandung',
      tanggalBeritaAcara: todayIso,
      namaGuru: params.teacherName ?? '',
      nipGuru: params.teacherNip ?? '',
      namaObserver: '',
      nipObserver: '',
      namaSupervisor: params.supervisorName ?? '',
      nipSupervisor: '',
      namaKetuaTim: '',
      nipKetuaTim: '',
    },
  };
}
