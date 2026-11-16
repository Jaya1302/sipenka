import * as XLSX from 'xlsx';
import { normalizeUsername } from './firebase';
import {
  KONSENTRASI_KEAHLIAN_SMKN13,
  UserProfile,
  UserRole,
} from '../types/supervision';

export interface ParsedExcelUserRow {
  rowNumber: number;
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  nip: string;
  mataPelajaran: string;
  konsentrasiKeahlian: string;
  selected: boolean;
  validationError: string | null;
  importStatus: 'pending' | 'processing' | 'success' | 'error';
  importMessage?: string;
}

function normalizeHeaderKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pickField(
  row: Record<string, string>,
  aliases: string[]
): string {
  for (const [rawKey, val] of Object.entries(row)) {
    const norm = normalizeHeaderKey(rawKey);
    if (aliases.includes(norm)) {
      return String(val ?? '').trim();
    }
  }
  return '';
}

function parseRoleValue(rawRole: string): { role: UserRole; error: string | null } {
  const clean = rawRole.trim().toLowerCase();
  if (!clean) {
    return { role: 'guru', error: null };
  }
  if (
    clean === 'guru' ||
    clean === 'observer' ||
    clean === 'observant' ||
    clean.includes('guru')
  ) {
    return { role: 'guru', error: null };
  }
  if (
    clean === 'admin' ||
    clean === 'administrator' ||
    clean === 'supervisor' ||
    clean.includes('admin') ||
    clean.includes('supervisor')
  ) {
    return { role: 'admin', error: null };
  }
  return {
    role: 'guru',
    error: `Peran "${rawRole}" tidak valid (gunakan "guru" atau "admin")`,
  };
}

function normalizeKonsentrasi(raw: string): string {
  const clean = raw.trim();
  if (!clean) return '';
  const exact = KONSENTRASI_KEAHLIAN_SMKN13.find(
    (k) => k.toLowerCase() === clean.toLowerCase()
  );
  return (exact ?? clean).slice(0, 150);
}

export function downloadUserImportTemplate(): void {
  const wb = XLSX.utils.book_new();

  const templateRows = [
    {
      Username: 'ratna.kusuma',
      Password: 'Password123',
      'Nama Lengkap & Gelar': 'Dra. Ratna Kusumawati, M.Pd.',
      Peran: 'guru',
      'NIP / NIPPPK': '197204151998022003',
      'Mata Pelajaran': 'Kimia Analisis Instrumen',
      'Konsentrasi Keahlian': 'Kimia Analisis',
    },
    {
      Username: 'ahmad.fauzi',
      Password: 'Password123',
      'Nama Lengkap & Gelar': 'Ahmad Fauzi, S.Pd., Gr.',
      Peran: 'guru',
      'NIP / NIPPPK': '198806122015031004',
      'Mata Pelajaran': 'Pemrograman Web & Basis Data',
      'Konsentrasi Keahlian': 'Rekayasa Perangkat Lunak (RPL)',
    },
  ];

  const wsData = XLSX.utils.json_to_sheet(templateRows);
  wsData['!cols'] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 32 },
    { wch: 12 },
    { wch: 24 },
    { wch: 30 },
    { wch: 34 },
  ];

  // Force NIP column cells as text so Excel does not reformat 18-digit numbers
  for (let rowIdx = 2; rowIdx <= templateRows.length + 1; rowIdx++) {
    const cellRef = `E${rowIdx}`;
    if (wsData[cellRef]) {
      wsData[cellRef].t = 's';
      wsData[cellRef].z = '@';
    }
  }

  XLSX.utils.book_append_sheet(wb, wsData, 'Data_Pengguna');

  const guideRows = [
    {
      Kolom: 'Username',
      Wajib: 'Ya',
      Keterangan:
        'Minimal 3 karakter (huruf kecil, angka, simbol @, titik, garis bawah, atau strip). Misal: ratna.kusuma@guru.smk.belajar.id atau ratna.kusuma. Harus unik.',
    },
    {
      Kolom: 'Password',
      Wajib: 'Ya',
      Keterangan: 'Minimal 6 karakter untuk login awal pengguna.',
    },
    {
      Kolom: 'Nama Lengkap & Gelar',
      Wajib: 'Ya',
      Keterangan: 'Nama lengkap beserta gelar akademik (maks. 150 karakter).',
    },
    {
      Kolom: 'Peran',
      Wajib: 'Opsional (Default: guru)',
      Keterangan: 'Isi dengan "guru" atau "admin". Jika dikosongkan akan otomatis menjadi "guru".',
    },
    {
      Kolom: 'NIP / NIPPPK',
      Wajib: 'Opsional',
      Keterangan: 'Format sel disarankan Teks agar angka NIP 18 digit tidak terpotong Excel.',
    },
    {
      Kolom: 'Mata Pelajaran',
      Wajib: 'Opsional',
      Keterangan: 'Nama mata pelajaran yang diampu.',
    },
    {
      Kolom: 'Konsentrasi Keahlian',
      Wajib: 'Opsional',
      Keterangan: `Pilihan SMKN 13 Bandung: ${KONSENTRASI_KEAHLIAN_SMKN13.join(' | ')}`,
    },
  ];

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 24 }, { wch: 24 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan_Pengisian');

  XLSX.writeFile(wb, 'Template_Import_Pengguna_SMKN13.xlsx');
}

export async function parseUserExcelFile(
  file: File,
  existingUsers: UserProfile[]
): Promise<ParsedExcelUserRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const preferredSheetName =
    wb.SheetNames.find((name) => name.toLowerCase() === 'data_pengguna') ??
    wb.SheetNames[0];

  if (!preferredSheetName) {
    throw new Error('File Excel tidak memiliki lembar kerja (sheet).');
  }

  const sheet = wb.Sheets[preferredSheetName];
  const rawObjects = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: '',
  });

  if (rawObjects.length === 0) {
    throw new Error(
      `Lembar "${preferredSheetName}" kosong. Pastikan baris header dan data pengguna terisi.`
    );
  }

  const existingUsernameSet = new Set(
    existingUsers
      .map((u) => (u.username || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const seenInFile = new Set<string>();

  const parsed: ParsedExcelUserRow[] = [];

  rawObjects.forEach((rawRow, idx) => {
    const rawUsername = pickField(rawRow, [
      'username',
      'user name',
      'username login',
      'id pengguna',
    ]);
    const rawPassword = pickField(rawRow, [
      'password',
      'password awal',
      'kata sandi',
      'sandi',
    ]);
    const rawDisplayName = pickField(rawRow, [
      'nama lengkap gelar',
      'nama lengkap',
      'nama',
      'nama guru',
      'displayname',
      'display name',
    ]);
    const rawRole = pickField(rawRow, ['peran', 'role', 'peran akses', 'hak akses']);
    const rawNip = pickField(rawRow, ['nip nipppk', 'nip', 'nipppk', 'nip nuptk']);
    const rawMapel = pickField(rawRow, [
      'mata pelajaran',
      'mapel',
      'mata pelajaran yang diampu',
    ]);
    const rawKonsentrasi = pickField(rawRow, [
      'konsentrasi keahlian',
      'konsentrasi',
      'jurusan',
      'kompetensi keahlian',
    ]);

    // Skip completely blank trailing rows
    if (
      !rawUsername &&
      !rawPassword &&
      !rawDisplayName &&
      !rawRole &&
      !rawNip &&
      !rawMapel &&
      !rawKonsentrasi
    ) {
      return;
    }

    const cleanUsername = normalizeUsername(rawUsername);
    const cleanPassword = rawPassword.trim();
    const cleanDisplayName = rawDisplayName.trim().slice(0, 150);
    const { role, error: roleError } = parseRoleValue(rawRole);

    const errors: string[] = [];
    if (cleanUsername.length < 3 || !/[a-z0-9]/.test(cleanUsername)) {
      errors.push('Username min. 3 karakter valid (memuat huruf/angka)');
    } else if (cleanUsername.length > 120) {
      errors.push('Username maks. 120 karakter');
    } else if (existingUsernameSet.has(cleanUsername)) {
      errors.push(`Username "${cleanUsername}" sudah terdaftar`);
    } else if (seenInFile.has(cleanUsername)) {
      errors.push(`Username "${cleanUsername}" duplikat di file Excel`);
    }

    if (cleanPassword.length < 6) {
      errors.push('Password min. 6 karakter');
    }
    if (!cleanDisplayName) {
      errors.push('Nama lengkap wajib diisi');
    }
    if (roleError) {
      errors.push(roleError);
    }

    if (cleanUsername) {
      seenInFile.add(cleanUsername);
    }

    const validationError = errors.length > 0 ? errors.join('; ') : null;

    parsed.push({
      rowNumber: idx + 2, // +1 for 1-index, +1 for header row
      username: cleanUsername || rawUsername.trim(),
      password: cleanPassword,
      displayName: cleanDisplayName,
      role,
      nip: rawNip.trim().slice(0, 50),
      mataPelajaran: rawMapel.trim().slice(0, 150),
      konsentrasiKeahlian: normalizeKonsentrasi(rawKonsentrasi),
      selected: validationError === null,
      validationError,
      importStatus: 'pending',
    });
  });

  if (parsed.length === 0) {
    throw new Error('Tidak ada baris data pengguna yang terbaca dari file Excel.');
  }

  return parsed;
}

export function exportImportResultCredentials(rows: ParsedExcelUserRow[]): void {
  const exportData = rows.map((r) => ({
    'Baris Excel': r.rowNumber,
    Username: r.username,
    Password: r.password,
    'Nama Lengkap & Gelar': r.displayName,
    Peran: r.role === 'admin' ? 'Admin / Supervisor' : 'Guru / Observant',
    'NIP / NIPPPK': r.nip || '-',
    'Mata Pelajaran': r.mataPelajaran || '-',
    'Konsentrasi Keahlian': r.konsentrasiKeahlian || '-',
    Status:
      r.importStatus === 'success'
        ? 'Berhasil Dibuat'
        : r.importStatus === 'error'
          ? 'Gagal'
          : r.validationError
            ? 'Tidak Valid'
            : 'Belum Diproses',
    Keterangan: r.importMessage || r.validationError || '-',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
    { wch: 20 },
    { wch: 22 },
    { wch: 26 },
    { wch: 30 },
    { wch: 18 },
    { wch: 36 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Hasil_Import_Pengguna');
  XLSX.writeFile(wb, 'Hasil_Import_Akun_SMKN13.xlsx');
}
