import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  Check,
  Lock,
  Plus,
  Printer,
  Save,
  Trash2,
} from 'lucide-react';
import {
  FORM10_BENTUK_TINDAK_LANJUT,
  FORM12_KESIMPULAN_MONITORING,
  FORM2_FOKUS_PENGAMATAN,
  FORM2_IDENTIFIKASI_ASPEK,
  FORM3_KOMPONEN_MODUL,
  FORM4_INTI,
  FORM4_PENDAHULUAN,
  FORM4_PENUTUP,
  FORM6_PERTANYAAN_REFLEKTIF,
  FORM7_PERTANYAAN_OBSERVER,
  FORM9_KATEGORI_RULES,
  KONSENTRASI_KEAHLIAN_SMKN13,
  ScoredIndicatorEntry,
  SupervisionRecord,
  SupervisionStatus,
  TahapLessonStudy,
  TeacherDirectoryEntry,
  UserRole,
  calculateForm3Stats,
  calculateForm4Stats,
  computeAutoForm9,
  recalculateManualForm9,
} from '../types/supervision';
import { normalizeUsername, usernameToAuthEmail } from '../lib/firebase';
import { exportSupervisionToPdf } from '../lib/exportReports';

interface SupervisionFormWizardProps {
  initialRecord: SupervisionRecord;
  isNew: boolean;
  role: UserRole;
  currentUserEmail: string;
  registeredUsers: TeacherDirectoryEntry[];
  onSave: (record: SupervisionRecord, isNew: boolean) => Promise<void>;
  onBack: () => void;
}

type SectionTab =
  | 'form1'
  | 'form2'
  | 'form3'
  | 'form4'
  | 'form5'
  | 'form678'
  | 'form9_13';

const TABS: Array<{ id: SectionTab; label: string; sub: string }> = [
  { id: 'form1', label: 'Form 1', sub: 'Identitas' },
  { id: 'form2', label: 'Form 2', sub: 'Plan' },
  { id: 'form3', label: 'Form 3', sub: 'Modul Ajar' },
  { id: 'form4', label: 'Form 4', sub: 'Pelaksanaan' },
  { id: 'form5', label: 'Form 5', sub: 'Peserta Didik' },
  { id: 'form678', label: 'Form 6–8', sub: 'Refleksi SEE' },
  { id: 'form9_13', label: 'Form 9–13', sub: 'Nilai & BA' },
];

function ScoreScaleSelector({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (score: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4].map((num) => {
        const active = value === num;
        return (
          <button
            key={num}
            type="button"
            disabled={disabled}
            onClick={() => onChange(active ? 0 : num)}
            className={`w-8 h-8 rounded text-xs font-mono font-semibold transition-colors border ${
              active
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={`Skor ${num}`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}

export function SupervisionFormWizard({
  initialRecord,
  isNew,
  role,
  currentUserEmail,
  registeredUsers,
  onSave,
  onBack,
}: SupervisionFormWizardProps) {
  const [record, setRecord] = useState<SupervisionRecord>(initialRecord);
  const [activeTab, setActiveTab] = useState<SectionTab>('form1');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isAdmin = role === 'admin';
  const isFinalizedForGuru = !isAdmin && record.status === 'finalized';
  const canEditIdentityAndReflection = isAdmin || !isFinalizedForGuru;
  const canEditObserverForms = isAdmin || !isFinalizedForGuru;

  const form3Stats = useMemo(
    () => calculateForm3Stats(record.form3),
    [record.form3]
  );
  const form4Stats = useMemo(
    () => calculateForm4Stats(record.form4),
    [record.form4]
  );

  const syncWithAutoForm9 = (next: SupervisionRecord): SupervisionRecord => {
    if (!next.form9.autoCalculated) return next;
    const computed = computeAutoForm9(
      next.form3,
      next.form4,
      next.form5,
      next.form6,
      next.form7,
      next.form8
    );
    return {
      ...next,
      form9: computed,
      totalNilai: computed.totalNilai,
      kategori: computed.kategori,
    };
  };

  const handleSaveClick = async (overrideStatus?: SupervisionStatus) => {
    setFeedback(null);
    const teacherName = (record.form1.namaGuru || record.teacherName).trim();
    const mataPelajaran = (
      record.form1.mataPelajaran || record.mataPelajaran
    ).trim();

    if (!teacherName || !mataPelajaran) {
      setFeedback({
        type: 'error',
        text: 'Nama Guru/Observant dan Mata Pelajaran pada Form 1 wajib diisi sebelum menyimpan.',
      });
      setActiveTab('form1');
      return;
    }

    const cleanUsername = normalizeUsername(record.teacherUsername ?? '');
    const resolvedTeacherEmail = cleanUsername
      ? usernameToAuthEmail(cleanUsername)
      : record.teacherEmail.trim().toLowerCase().slice(0, 200);

    const synced = syncWithAutoForm9({
      ...record,
      teacherName: teacherName.slice(0, 150),
      teacherNip: (record.form1.nip || record.teacherNip).trim().slice(0, 50),
      teacherUsername: cleanUsername.slice(0, 60),
      teacherEmail: resolvedTeacherEmail,
      mataPelajaran: mataPelajaran.slice(0, 150),
      konsentrasiKeahlian: (
        record.form1.konsentrasiKeahlian || record.konsentrasiKeahlian
      )
        .trim()
        .slice(0, 150),
      kelasSemester: (record.form1.kelasSemester || record.kelasSemester)
        .trim()
        .slice(0, 80),
      tanggal: (record.form1.hariTanggal || record.tanggal).trim().slice(0, 40),
      tahap: record.form1.tahap,
      status: isAdmin && overrideStatus ? overrideStatus : record.status,
    });

    setSaving(true);
    try {
      await onSave(synced, isNew);
      setRecord(synced);
      setFeedback({
        type: 'success',
        text:
          overrideStatus === 'finalized'
            ? 'Penilaian supervisi telah difinalisasi dan disimpan ke database.'
            : 'Perubahan instrumen supervisi berhasil disimpan ke Firestore.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Gagal menyimpan data supervisi.',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateForm3Item = (
    idx: string,
    patch: Partial<ScoredIndicatorEntry>
  ) => {
    setRecord((prev) => {
      const next: SupervisionRecord = {
        ...prev,
        form3: {
          ...prev.form3,
          items: {
            ...prev.form3.items,
            [idx]: { ...(prev.form3.items[idx] ?? { skor: 0, catatan: '' }), ...patch },
          },
        },
      };
      return syncWithAutoForm9(next);
    });
  };

  const updateForm4Item = (
    section: 'pendahuluan' | 'inti' | 'penutup',
    idx: string,
    patch: Partial<ScoredIndicatorEntry>
  ) => {
    setRecord((prev) => {
      const next: SupervisionRecord = {
        ...prev,
        form4: {
          ...prev.form4,
          [section]: {
            ...prev.form4[section],
            [idx]: {
              ...(prev.form4[section][idx] ?? { skor: 0, catatan: '' }),
              ...patch,
            },
          },
        },
      };
      return syncWithAutoForm9(next);
    });
  };

  const handleAutoPopulateBeritaAcara = () => {
    const praktik1 =
      record.form8.praktikBaik[0]?.praktikBaik ||
      record.form6.halDipertahankan ||
      '';
    const praktik2 = record.form8.praktikBaik[1]?.praktikBaik || '';
    const perb1 =
      record.form8.perluDiperbaiki[0]?.masalah ||
      record.form6.halDiperbaiki ||
      '';
    const perb2 = record.form8.perluDiperbaiki[1]?.masalah || '';
    const rtl1 = record.form10.rows[0]?.tindakanPerbaikan || '';
    const rtl2 = record.form10.rows[1]?.tindakanPerbaikan || '';

    setRecord((prev) => ({
      ...prev,
      form13: {
        ...prev.form13,
        namaGuru: prev.form1.namaGuru || prev.teacherName,
        nipGuru: prev.form1.nip || prev.teacherNip,
        namaSupervisor: prev.form1.supervisor || prev.form13.namaSupervisor,
        namaObserver:
          prev.form1.timObserver[0]?.nama || prev.form13.namaObserver,
        praktikBaik: [
          praktik1 || prev.form13.praktikBaik[0],
          praktik2 || prev.form13.praktikBaik[1],
        ],
        halPerluDiperbaiki: [
          perb1 || prev.form13.halPerluDiperbaiki[0],
          perb2 || prev.form13.halPerluDiperbaiki[1],
        ],
        rencanaTindakLanjut: [
          rtl1 || prev.form13.rencanaTindakLanjut[0],
          rtl2 || prev.form13.rencanaTindakLanjut[1],
        ],
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isNew
                ? 'Instrumen Supervisi Akademik Baru'
                : record.form1.namaGuru || record.teacherName || 'Detail Supervisi'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {record.form1.mataPelajaran || record.mataPelajaran || 'Belum diisi'} ·{' '}
              Tahap {record.form1.tahap} ·{' '}
              {record.status === 'finalized'
                ? 'Status: Final'
                : record.status === 'in_progress'
                  ? 'Status: Proses'
                  : 'Status: Draft'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportSupervisionToPdf(record)}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Ekspor PDF</span>
          </button>

          {canEditIdentityAndReflection && (
            <button
              type="button"
              onClick={() => handleSaveClick()}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          )}

          {isAdmin && record.status !== 'finalized' && (
            <button
              type="button"
              onClick={() => handleSaveClick('finalized')}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>Finalisasi Nilai</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Score Summary Strip */}
      <div className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-500 block">Telaah Modul (Form 3)</span>
          <span className="text-base font-bold font-mono tabular-nums text-slate-900">
            {form3Stats.totalSkor} / {form3Stats.maxSkor}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Observasi (Form 4)</span>
          <span className="text-base font-bold font-mono tabular-nums text-slate-900">
            {form4Stats.totalSkor} / {form4Stats.maxSkor}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Nilai Akhir Form 9</span>
          <span className="text-base font-bold font-mono tabular-nums text-blue-700">
            {record.form9.totalNilai.toFixed(2)} / 100
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Kategori Kinerja</span>
          <span className="text-sm font-bold text-slate-900">
            {record.form9.kategori}
          </span>
        </div>
      </div>

      {isFinalizedForGuru && (
        <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-2.5 text-sm text-slate-700">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            Dokumen supervisi ini sudah berstatus <strong>Final</strong> oleh Supervisor/Admin. Anda dapat melihat seluruh hasil penilaian dan mengunduh PDF Berita Acara.
          </span>
        </div>
      )}

      {!isAdmin && !isFinalizedForGuru && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          <strong>Mode Observer (Guru Penilai):</strong> Anda bertindak sebagai <strong>Observer</strong> yang menilai guru model (<strong>Observant</strong>). Isi data guru yang dinilai pada Form 1 serta lengkapi instrumen Form 2 s.d. Form 13 selama dokumen belum berstatus <strong>Final</strong> oleh Admin/Supervisor.
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-lg border text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Segmented Navigation Tabs */}
      <div className="bg-slate-100 p-1 rounded-lg flex flex-wrap gap-1">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="font-semibold">{t.label}</span>
              <span className="text-slate-400">·</span>
              <span>{t.sub}</span>
            </button>
          );
        })}
      </div>

      {/* FORM 1 */}
      {activeTab === 'form1' && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              FORM 1. IDENTITAS PELAKSANAAN LESSON STUDY
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              SMKN 13 Bandung — Data guru model (observant), mata pelajaran, waktu, dan tim observer
            </p>
          </div>

          {canEditIdentityAndReflection && registeredUsers.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Akun Guru Terdaftar (Isi Otomatis Identitas &amp; Tautkan Akun)
              </label>
              <select
                value={record.teacherUid || ''}
                onChange={(e) => {
                  const chosen = registeredUsers.find(
                    (u) => u.uid === e.target.value
                  );
                  if (!chosen) return;
                  const chosenEmail = chosen.username
                    ? usernameToAuthEmail(chosen.username)
                    : '';
                  setRecord((prev) => ({
                    ...prev,
                    teacherUid: chosen.uid,
                    teacherUsername: chosen.username || '',
                    teacherEmail: chosenEmail,
                    teacherName: chosen.displayName,
                    teacherNip: chosen.nip || '',
                    mataPelajaran: chosen.mataPelajaran || prev.mataPelajaran,
                    konsentrasiKeahlian:
                      chosen.konsentrasiKeahlian || prev.konsentrasiKeahlian,
                    form1: {
                      ...prev.form1,
                      namaGuru: chosen.displayName,
                      nip: chosen.nip || '',
                      mataPelajaran:
                        chosen.mataPelajaran || prev.form1.mataPelajaran,
                      konsentrasiKeahlian:
                        chosen.konsentrasiKeahlian ||
                        prev.form1.konsentrasiKeahlian,
                    },
                  }));
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- Pilih guru dari daftar akun --</option>
                {registeredUsers.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName}
                    {u.username
                      ? ` (${u.username.includes('@') ? u.username : `@${u.username}`})`
                      : ''}
                    {u.mataPelajaran ? ` — ${u.mataPelajaran}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Guru / Observant *
              </label>
              <input
                type="text"
                disabled={!canEditIdentityAndReflection}
                value={record.form1.namaGuru}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    teacherName: e.target.value,
                    form1: { ...prev.form1, namaGuru: e.target.value },
                  }))
                }
                placeholder="Nama lengkap beserta gelar"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NIP / NIPPPK
              </label>
              <input
                type="text"
                disabled={!canEditIdentityAndReflection}
                value={record.form1.nip}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    teacherNip: e.target.value,
                    form1: { ...prev.form1, nip: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mata Pelajaran *
              </label>
              <input
                type="text"
                disabled={!canEditIdentityAndReflection}
                value={record.form1.mataPelajaran}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    mataPelajaran: e.target.value,
                    form1: { ...prev.form1, mataPelajaran: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Konsentrasi Keahlian
              </label>
              <select
                disabled={!canEditIdentityAndReflection}
                value={record.form1.konsentrasiKeahlian}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    konsentrasiKeahlian: e.target.value,
                    form1: {
                      ...prev.form1,
                      konsentrasiKeahlian: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
              >
                <option value="">Pilih Konsentrasi Keahlian</option>
                {KONSENTRASI_KEAHLIAN_SMKN13.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kelas / Semester
              </label>
              <input
                type="text"
                disabled={!canEditIdentityAndReflection}
                value={record.form1.kelasSemester}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    kelasSemester: e.target.value,
                    form1: { ...prev.form1, kelasSemester: e.target.value },
                  }))
                }
                placeholder="Contoh: XI KA 2 / Ganjil"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Fase
              </label>
              <input
                type="text"
                disabled={!canEditIdentityAndReflection}
                value={record.form1.fase}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    form1: { ...prev.form1, fase: e.target.value },
                  }))
                }
                placeholder="Contoh: E / F"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Materi / Topik
              </label>
              <input
                type="text"
                disabled={!canEditIdentityAndReflection}
                value={record.form1.materiTopik}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    form1: { ...prev.form1, materiTopik: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hari / Tanggal
              </label>
              <input
                type="date"
                disabled={!canEditIdentityAndReflection}
                value={record.form1.hariTanggal}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    tanggal: e.target.value,
                    form1: { ...prev.form1, hariTanggal: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Waktu
              </label>
              <input
                type="text"
                disabled={!canEditIdentityAndReflection}
                value={record.form1.waktu}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    form1: { ...prev.form1, waktu: e.target.value },
                  }))
                }
                placeholder="07.30 - 09.00 WIB"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ruang / Laboratorium
              </label>
              <input
                type="text"
                disabled={!canEditIdentityAndReflection}
                value={record.form1.ruangLab}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    form1: { ...prev.form1, ruangLab: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tahap Lesson Study
              </label>
              <select
                disabled={!canEditIdentityAndReflection}
                value={record.form1.tahap}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    tahap: e.target.value as TahapLessonStudy,
                    form1: {
                      ...prev.form1,
                      tahap: e.target.value as TahapLessonStudy,
                    },
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
              >
                <option value="PLAN">PLAN</option>
                <option value="DO">DO</option>
                <option value="SEE">SEE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Supervisor
              </label>
              <input
                type="text"
                disabled={!canEditIdentityAndReflection}
                value={record.form1.supervisor}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    form1: { ...prev.form1, supervisor: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>

            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status Dokumen
                </label>
                <select
                  value={record.status}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      status: e.target.value as SupervisionStatus,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="in_progress">Proses Berjalan</option>
                  <option value="finalized">Final</option>
                </select>
              </div>
            )}
          </div>

          {/* Tim Observer */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Tim Observer
              </h3>
              {canEditIdentityAndReflection &&
                record.form1.timObserver.length < 10 && (
                  <button
                    type="button"
                    onClick={() =>
                      setRecord((prev) => ({
                        ...prev,
                        form1: {
                          ...prev.form1,
                          timObserver: [
                            ...prev.form1.timObserver,
                            { nama: '', jabatan: '', tandaTangan: '' },
                          ],
                        },
                      }))
                    }
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Observer</span>
                  </button>
                )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2 px-3 w-12 text-center">No.</th>
                    <th className="py-2 px-3">Nama Observer</th>
                    <th className="py-2 px-3">Jabatan / Peran</th>
                    <th className="py-2 px-3">Tanda Tangan / Paraf</th>
                    {canEditIdentityAndReflection && <th className="w-12" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.form1.timObserver.map((obs, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-center font-mono text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          disabled={!canEditIdentityAndReflection}
                          value={obs.nama}
                          onChange={(e) => {
                            const updated = [...record.form1.timObserver];
                            updated[idx] = { ...obs, nama: e.target.value };
                            setRecord((prev) => ({
                              ...prev,
                              form1: { ...prev.form1, timObserver: updated },
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          disabled={!canEditIdentityAndReflection}
                          value={obs.jabatan}
                          onChange={(e) => {
                            const updated = [...record.form1.timObserver];
                            updated[idx] = { ...obs, jabatan: e.target.value };
                            setRecord((prev) => ({
                              ...prev,
                              form1: { ...prev.form1, timObserver: updated },
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          disabled={!canEditIdentityAndReflection}
                          value={obs.tandaTangan}
                          onChange={(e) => {
                            const updated = [...record.form1.timObserver];
                            updated[idx] = {
                              ...obs,
                              tandaTangan: e.target.value,
                            };
                            setRecord((prev) => ({
                              ...prev,
                              form1: { ...prev.form1, timObserver: updated },
                            }));
                          }}
                          placeholder="Hadir / Tertanda"
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                        />
                      </td>
                      {canEditIdentityAndReflection && (
                        <td className="py-2 px-2 text-center">
                          {record.form1.timObserver.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = record.form1.timObserver.filter(
                                  (_, i) => i !== idx
                                );
                                setRecord((prev) => ({
                                  ...prev,
                                  form1: { ...prev.form1, timObserver: updated },
                                }));
                              }}
                              className="p-1 text-slate-400 hover:text-red-600"
                              aria-label="Hapus observer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* FORM 2 */}
      {activeTab === 'form2' && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              FORM 2. PERENCANAAN LESSON STUDY – PLAN
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              A. Identifikasi Permasalahan Pembelajaran (Diisi bersama oleh observant dan tim Lesson Study)
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-3 w-12 text-center">No.</th>
                  <th className="py-2.5 px-3 w-1/3">Aspek</th>
                  <th className="py-2.5 px-3">Hasil Identifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FORM2_IDENTIFIKASI_ASPEK.map((aspek, idx) => {
                  const k = String(idx + 1);
                  return (
                    <tr key={k}>
                      <td className="py-2 px-3 text-center font-mono text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {aspek}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          disabled={!canEditIdentityAndReflection}
                          value={record.form2.identifikasi[k] ?? ''}
                          onChange={(e) =>
                            setRecord((prev) => ({
                              ...prev,
                              form2: {
                                ...prev.form2,
                                identifikasi: {
                                  ...prev.form2.identifikasi,
                                  [k]: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              B. Tujuan Lesson Study
            </h3>
            <textarea
              rows={3}
              disabled={!canEditIdentityAndReflection}
              value={record.form2.tujuanLessonStudy}
              onChange={(e) =>
                setRecord((prev) => ({
                  ...prev,
                  form2: {
                    ...prev.form2,
                    tujuanLessonStudy: e.target.value,
                  },
                }))
              }
              placeholder="Tuliskan tujuan yang ingin dicapai..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                C. Fokus Pengamatan
              </h3>
              <p className="text-xs text-slate-500">
                Observer diarahkan <strong>mengamati proses belajar peserta didik</strong>, bukan mencari kesalahan guru.
              </p>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-3 w-1/3">Fokus Pengamatan</th>
                    <th className="py-2.5 px-3">Indikator yang Diamati</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {FORM2_FOKUS_PENGAMATAN.map((fokus, idx) => {
                    const k = String(idx + 1);
                    return (
                      <tr key={k}>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {fokus}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={!canEditIdentityAndReflection}
                            value={record.form2.fokusPengamatan[k] ?? ''}
                            onChange={(e) =>
                              setRecord((prev) => ({
                                ...prev,
                                form2: {
                                  ...prev.form2,
                                  fokusPengamatan: {
                                    ...prev.form2.fokusPengamatan,
                                    [k]: e.target.value,
                                  },
                                },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* FORM 3 */}
      {activeTab === 'form3' && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                FORM 3. TELAAH MODUL AJAR / RPP
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Diisi oleh Observer sebelum pelaksanaan pembelajaran · Skala: 4 = Sangat Baik | 3 = Baik | 2 = Cukup | 1 = Perlu Perbaikan
              </p>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-sm font-bold text-slate-900">
                Jumlah Skor: {form3Stats.totalSkor} / {form3Stats.maxSkor}
              </div>
              <div className="text-xs text-slate-500">
                Rata-rata capaian: {form3Stats.persentase.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-3 w-10 text-center">No.</th>
                  <th className="py-2.5 px-3">Komponen yang Ditelaah</th>
                  <th className="py-2.5 px-3 text-center w-40">Skala (1–4)</th>
                  <th className="py-2.5 px-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FORM3_KOMPONEN_MODUL.map((label, idx) => {
                  const k = String(idx + 1);
                  const entry = record.form3.items[k] ?? { skor: 0, catatan: '' };
                  return (
                    <tr key={k} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{label}</td>
                      <td className="py-2.5 px-3 text-center">
                        <ScoreScaleSelector
                          value={entry.skor}
                          disabled={!canEditObserverForms}
                          onChange={(skor) => updateForm3Item(k, { skor })}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          disabled={!canEditObserverForms}
                          value={entry.catatan}
                          onChange={(e) =>
                            updateForm3Item(k, { catatan: e.target.value })
                          }
                          placeholder="Catatan telaah..."
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-900">
              Catatan Umum Observer
            </label>
            <textarea
              rows={3}
              disabled={!canEditObserverForms}
              value={record.form3.catatanUmum}
              onChange={(e) =>
                setRecord((prev) => ({
                  ...prev,
                  form3: { ...prev.form3, catatanUmum: e.target.value },
                }))
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
            />
          </div>
        </section>
      )}

      {/* FORM 4 */}
      {activeTab === 'form4' && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                FORM 4. LEMBAR OBSERVASI PELAKSANAAN PEMBELAJARAN
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Skala: 4 = Sangat Baik | 3 = Baik | 2 = Cukup | 1 = Perlu Perbaikan
              </p>
            </div>
            <div className="text-right font-mono tabular-nums text-xs text-slate-600">
              <div className="text-sm font-bold text-slate-900">
                Total: {form4Stats.totalSkor} / {form4Stats.maxSkor} ({form4Stats.persentase.toFixed(1)}%)
              </div>
              <div>
                Pendahuluan: {form4Stats.pendahuluanSkor}/28 · Inti: {form4Stats.intiSkor}/64 · Penutup: {form4Stats.penutupSkor}/24
              </div>
            </div>
          </div>

          {(
            [
              {
                key: 'pendahuluan',
                title: 'A. Kegiatan Pendahuluan',
                items: FORM4_PENDAHULUAN,
              },
              { key: 'inti', title: 'B. Kegiatan Inti', items: FORM4_INTI },
              { key: 'penutup', title: 'C. Kegiatan Penutup', items: FORM4_PENUTUP },
            ] as const
          ).map((sec) => (
            <div key={sec.key} className="space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2 px-3 w-10 text-center">No.</th>
                      <th className="py-2 px-3">Indikator</th>
                      <th className="py-2 px-3 text-center w-40">Skala (1–4)</th>
                      <th className="py-2 px-3">Bukti / Fakta yang Diamati</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sec.items.map((label, idx) => {
                      const k = String(idx + 1);
                      const entry = record.form4[sec.key][k] ?? {
                        skor: 0,
                        catatan: '',
                      };
                      return (
                        <tr key={k} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-mono text-xs text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 text-slate-800">{label}</td>
                          <td className="py-2 px-3 text-center">
                            <ScoreScaleSelector
                              value={entry.skor}
                              disabled={!canEditObserverForms}
                              onChange={(skor) =>
                                updateForm4Item(sec.key, k, { skor })
                              }
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              disabled={!canEditObserverForms}
                              value={entry.catatan}
                              onChange={(e) =>
                                updateForm4Item(sec.key, k, {
                                  catatan: e.target.value,
                                })
                              }
                              placeholder="Tuliskan fakta/bukti objektif..."
                              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* FORM 5 */}
      {activeTab === 'form5' && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                FORM 5. LEMBAR OBSERVASI PESERTA DIDIK
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Ini menjadi instrumen utama Lesson Study. Observer tidak hanya menilai guru, tetapi mencatat bagaimana peserta didik belajar.
              </p>
            </div>
            {canEditObserverForms && record.form5.rows.length < 40 && (
              <button
                type="button"
                onClick={() =>
                  setRecord((prev) => ({
                    ...prev,
                    form5: {
                      rows: [
                        ...prev.form5.rows,
                        {
                          namaInisial: '',
                          aktivitas: false,
                          fokusPerhatian: false,
                          bertanya: false,
                          berdiskusi: false,
                          memahami: false,
                          kesulitan: false,
                          catatan: '',
                        },
                      ],
                    },
                  }))
                }
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Peserta Didik</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-2.5 text-center w-10">No.</th>
                  <th className="py-2.5 px-2.5 min-w-[150px]">
                    Nama / Inisial Peserta Didik
                  </th>
                  <th className="py-2.5 px-2 text-center">Aktivitas</th>
                  <th className="py-2.5 px-2 text-center">Fokus/Perhatian</th>
                  <th className="py-2.5 px-2 text-center">Bertanya</th>
                  <th className="py-2.5 px-2 text-center">Berdiskusi</th>
                  <th className="py-2.5 px-2 text-center">Memahami</th>
                  <th className="py-2.5 px-2 text-center">Kesulitan</th>
                  <th className="py-2.5 px-2.5 min-w-[220px]">Catatan Fakta</th>
                  {canEditObserverForms && <th className="w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {record.form5.rows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2.5 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        disabled={!canEditObserverForms}
                        value={row.namaInisial}
                        onChange={(e) => {
                          const rows = [...record.form5.rows];
                          rows[idx] = { ...row, namaInisial: e.target.value };
                          setRecord((prev) =>
                            syncWithAutoForm9({ ...prev, form5: { rows } })
                          );
                        }}
                        placeholder="Inisial / PD-01"
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded disabled:bg-slate-50"
                      />
                    </td>
                    {(
                      [
                        'aktivitas',
                        'fokusPerhatian',
                        'bertanya',
                        'berdiskusi',
                        'memahami',
                        'kesulitan',
                      ] as const
                    ).map((field) => (
                      <td key={field} className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          disabled={!canEditObserverForms}
                          checked={row[field]}
                          onChange={(e) => {
                            const rows = [...record.form5.rows];
                            rows[idx] = { ...row, [field]: e.target.checked };
                            setRecord((prev) =>
                              syncWithAutoForm9({ ...prev, form5: { rows } })
                            );
                          }}
                          className="w-4 h-4 accent-blue-700"
                        />
                      </td>
                    ))}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        disabled={!canEditObserverForms}
                        value={row.catatan}
                        onChange={(e) => {
                          const rows = [...record.form5.rows];
                          rows[idx] = { ...row, catatan: e.target.value };
                          setRecord((prev) => ({ ...prev, form5: { rows } }));
                        }}
                        placeholder="Pukul 09.15, PD melihat LKPD ±3 menit..."
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded disabled:bg-slate-50"
                      />
                    </td>
                    {canEditObserverForms && (
                      <td className="py-2 px-1 text-center">
                        {record.form5.rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const rows = record.form5.rows.filter(
                                (_, i) => i !== idx
                              );
                              setRecord((prev) =>
                                syncWithAutoForm9({ ...prev, form5: { rows } })
                              );
                            }}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Catatan penting:</p>
            <p>
              Observer mencatat <strong>fakta yang terlihat</strong>, misalnya: &ldquo;Pukul 09.15, peserta didik A melihat LKPD selama ±3 menit tetapi belum mengerjakan.&rdquo; Bukan: &ldquo;Peserta didik A malas.&rdquo;
            </p>
          </div>
        </section>
      )}

      {/* FORM 6, 7, 8 */}
      {activeTab === 'form678' && (
        <div className="space-y-6">
          {/* FORM 6 */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                FORM 6. REFLEKSI DIRI OBSERVANT
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Diisi guru model segera setelah pembelajaran
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-3 w-1/3">Pertanyaan Reflektif</th>
                    <th className="py-2.5 px-3">Jawaban Observant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {FORM6_PERTANYAAN_REFLEKTIF.map((q, idx) => {
                    const k = String(idx + 1);
                    return (
                      <tr key={k}>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {q}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={!canEditIdentityAndReflection}
                            value={record.form6.jawabanReflektif[k] ?? ''}
                            onChange={(e) =>
                              setRecord((prev) =>
                                syncWithAutoForm9({
                                  ...prev,
                                  form6: {
                                    ...prev.form6,
                                    jawabanReflektif: {
                                      ...prev.form6.jawabanReflektif,
                                      [k]: e.target.value,
                                    },
                                  },
                                })
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Hal yang saya pertahankan
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditIdentityAndReflection}
                  value={record.form6.halDipertahankan}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form6: { ...prev.form6, halDipertahankan: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Hal yang perlu saya perbaiki
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditIdentityAndReflection}
                  value={record.form6.halDiperbaiki}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form6: { ...prev.form6, halDiperbaiki: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Hal yang ingin saya coba pada pembelajaran berikutnya
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditIdentityAndReflection}
                  value={record.form6.halDicobaBerikutnya}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form6: {
                        ...prev.form6,
                        halDicobaBerikutnya: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
                />
              </div>
            </div>
          </section>

          {/* FORM 7 */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                FORM 7. REFLEKSI OBSERVER
              </h2>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-3 w-10 text-center">No.</th>
                    <th className="py-2.5 px-3 w-1/3">Pertanyaan</th>
                    <th className="py-2.5 px-3">Hasil Pengamatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {FORM7_PERTANYAAN_OBSERVER.map((q, idx) => {
                    const k = String(idx + 1);
                    return (
                      <tr key={k}>
                        <td className="py-2 px-3 text-center font-mono text-xs text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {q}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={!canEditObserverForms}
                            value={record.form7.hasilPengamatan[k] ?? ''}
                            onChange={(e) =>
                              setRecord((prev) =>
                                syncWithAutoForm9({
                                  ...prev,
                                  form7: {
                                    hasilPengamatan: {
                                      ...prev.form7.hasilPengamatan,
                                      [k]: e.target.value,
                                    },
                                  },
                                })
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* FORM 8 */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                FORM 8. DISKUSI REFLEKSI / SEE
              </h2>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                A. Temuan Utama
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2 px-3 w-10 text-center">No.</th>
                      <th className="py-2 px-3">Temuan</th>
                      <th className="py-2 px-3">Bukti / Fakta</th>
                      <th className="py-2 px-3">Dampak terhadap Pembelajaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {record.form8.temuanUtama.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-center font-mono text-xs text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={!canEditObserverForms}
                            value={row.temuan}
                            onChange={(e) => {
                              const arr = [...record.form8.temuanUtama];
                              arr[idx] = { ...row, temuan: e.target.value };
                              setRecord((prev) =>
                                syncWithAutoForm9({
                                  ...prev,
                                  form8: { ...prev.form8, temuanUtama: arr },
                                })
                              );
                            }}
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={!canEditObserverForms}
                            value={row.buktiFakta}
                            onChange={(e) => {
                              const arr = [...record.form8.temuanUtama];
                              arr[idx] = { ...row, buktiFakta: e.target.value };
                              setRecord((prev) => ({
                                ...prev,
                                form8: { ...prev.form8, temuanUtama: arr },
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={!canEditObserverForms}
                            value={row.dampak}
                            onChange={(e) => {
                              const arr = [...record.form8.temuanUtama];
                              arr[idx] = { ...row, dampak: e.target.value };
                              setRecord((prev) => ({
                                ...prev,
                                form8: { ...prev.form8, temuanUtama: arr },
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                B. Praktik Baik
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2 px-3 w-10 text-center">No.</th>
                      <th className="py-2 px-3 w-2/3">
                        Praktik Baik yang Ditemukan
                      </th>
                      <th className="py-2 px-3">Bukti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {record.form8.praktikBaik.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-center font-mono text-xs text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={!canEditObserverForms}
                            value={row.praktikBaik}
                            onChange={(e) => {
                              const arr = [...record.form8.praktikBaik];
                              arr[idx] = {
                                ...row,
                                praktikBaik: e.target.value,
                              };
                              setRecord((prev) =>
                                syncWithAutoForm9({
                                  ...prev,
                                  form8: { ...prev.form8, praktikBaik: arr },
                                })
                              );
                            }}
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={!canEditObserverForms}
                            value={row.bukti}
                            onChange={(e) => {
                              const arr = [...record.form8.praktikBaik];
                              arr[idx] = { ...row, bukti: e.target.value };
                              setRecord((prev) => ({
                                ...prev,
                                form8: { ...prev.form8, praktikBaik: arr },
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                C. Hal yang Perlu Diperbaiki
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2 px-3 w-10 text-center">No.</th>
                      <th className="py-2 px-3">Aspek</th>
                      <th className="py-2 px-3">Masalah</th>
                      <th className="py-2 px-3">Penyebab</th>
                      <th className="py-2 px-3">Solusi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {record.form8.perluDiperbaiki.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-center font-mono text-xs text-slate-500">
                          {idx + 1}
                        </td>
                        {(
                          ['aspek', 'masalah', 'penyebab', 'solusi'] as const
                        ).map((field) => (
                          <td key={field} className="py-2 px-2">
                            <input
                              type="text"
                              disabled={!canEditObserverForms}
                              value={row[field]}
                              onChange={(e) => {
                                const arr = [...record.form8.perluDiperbaiki];
                                arr[idx] = { ...row, [field]: e.target.value };
                                setRecord((prev) => ({
                                  ...prev,
                                  form8: {
                                    ...prev.form8,
                                    perluDiperbaiki: arr,
                                  },
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* FORM 9, 10, 12, 13 */}
      {activeTab === 'form9_13' && (
        <div className="space-y-6">
          {/* FORM 9 */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  FORM 9. PENILAIAN SUPERVISI AKADEMIK (REKAPITULASI)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mode saat ini:{' '}
                  <strong>
                    {record.form9.autoCalculated
                      ? 'Otomatis dari Form 3–8'
                      : 'Input Manual Supervisor'}
                  </strong>
                </p>
              </div>
              {canEditObserverForms && (
                <button
                  type="button"
                  onClick={() => {
                    const auto = computeAutoForm9(
                      record.form3,
                      record.form4,
                      record.form5,
                      record.form6,
                      record.form7,
                      record.form8
                    );
                    setRecord((prev) => ({
                      ...prev,
                      form9: auto,
                      totalNilai: auto.totalNilai,
                      kategori: auto.kategori,
                    }));
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Hitung Otomatis dari Instrumen</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Komponen</th>
                    <th className="py-2.5 px-4 text-center">Bobot</th>
                    <th className="py-2.5 px-4 text-right w-40">
                      Skor (0–100)
                    </th>
                    <th className="py-2.5 px-4 text-right w-32">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.form9.komponen.map((comp, idx) => (
                    <tr key={comp.key}>
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        {comp.label}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono tabular-nums text-slate-600">
                        {comp.bobot}%
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          disabled={!canEditObserverForms}
                          value={comp.skor}
                          onChange={(e) => {
                            const nextKomp = [...record.form9.komponen];
                            nextKomp[idx] = {
                              ...comp,
                              skor: Number(e.target.value),
                            };
                            const recalc = recalculateManualForm9(nextKomp);
                            setRecord((prev) => ({
                              ...prev,
                              form9: recalc,
                              totalNilai: recalc.totalNilai,
                              kategori: recalc.kategori,
                            }));
                          }}
                          className="w-28 px-2.5 py-1.5 text-right font-mono tabular-nums text-sm border border-slate-300 rounded disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {comp.nilai.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                    <td className="py-3 px-4">TOTAL</td>
                    <td className="py-3 px-4 text-center font-mono">100%</td>
                    <td className="py-3 px-4 text-right text-xs font-normal text-slate-500">
                      Kategori: {record.form9.kategori}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-base text-blue-700">
                      {record.form9.totalNilai.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <th className="py-2 px-3">Rentang</th>
                      <th className="py-2 px-3">Kategori</th>
                      <th className="py-2 px-3">Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {FORM9_KATEGORI_RULES.map((rule) => {
                      const active = record.form9.kategori === rule.kategori;
                      return (
                        <tr
                          key={rule.kategori}
                          className={active ? 'bg-blue-50 font-semibold' : ''}
                        >
                          <td className="py-2 px-3 font-mono">{rule.rentang}</td>
                          <td className="py-2 px-3">{rule.kategori}</td>
                          <td className="py-2 px-3">{rule.tindakLanjut}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex flex-col justify-center space-y-2">
                <p className="font-semibold text-slate-900">Catatan:</p>
                <p className="leading-relaxed">
                  Nilai tidak digunakan semata-mata untuk &ldquo;menghakimi&rdquo; guru, tetapi menjadi dasar peningkatan kualitas pembelajaran.
                </p>
                <p className="pt-1 font-medium text-blue-800">
                  Rekomendasi Otomatis: {record.form9.tindakLanjut}
                </p>
              </div>
            </div>
          </section>

          {/* FORM 10 */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                FORM 10. RENCANA TINDAK LANJUT
              </h2>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <th className="py-2 px-2.5 w-10 text-center">No.</th>
                    <th className="py-2 px-2.5">Temuan</th>
                    <th className="py-2 px-2.5">Tindakan Perbaikan</th>
                    <th className="py-2 px-2.5">Penanggung Jawab</th>
                    <th className="py-2 px-2.5">Waktu</th>
                    <th className="py-2 px-2.5">Indikator Keberhasilan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.form10.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2.5 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      {(
                        [
                          'temuan',
                          'tindakanPerbaikan',
                          'penanggungJawab',
                          'waktu',
                          'indikatorKeberhasilan',
                        ] as const
                      ).map((field) => (
                        <td key={field} className="py-2 px-1.5">
                          <input
                            type="text"
                            disabled={!canEditObserverForms}
                            value={row[field]}
                            onChange={(e) => {
                              const rows = [...record.form10.rows];
                              rows[idx] = { ...row, [field]: e.target.value };
                              setRecord((prev) => ({
                                ...prev,
                                form10: { ...prev.form10, rows },
                              }));
                            }}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded disabled:bg-slate-50"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Bentuk Tindak Lanjut
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {FORM10_BENTUK_TINDAK_LANJUT.map((item) => {
                  const checked =
                    record.form10.bentukTindakLanjut.includes(item);
                  return (
                    <label
                      key={item}
                      className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        disabled={!canEditObserverForms}
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...record.form10.bentukTindakLanjut, item]
                            : record.form10.bentukTindakLanjut.filter(
                                (v) => v !== item
                              );
                          setRecord((prev) => ({
                            ...prev,
                            form10: { ...prev.form10, bentukTindakLanjut: next },
                          }));
                        }}
                        className="w-4 h-4 accent-blue-700"
                      />
                      <span>{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>

          {/* FORM 12 */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                FORM 12. MONITORING TINDAK LANJUT
              </h2>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <th className="py-2 px-2.5 w-10 text-center">No.</th>
                    <th className="py-2 px-2.5">Rekomendasi</th>
                    <th className="py-2 px-2.5 text-center">
                      Sudah Dilaksanakan
                    </th>
                    <th className="py-2 px-2.5 text-center">Belum</th>
                    <th className="py-2 px-2.5">Bukti</th>
                    <th className="py-2 px-2.5">Hasil Monitoring</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.form12.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2.5 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-1.5">
                        <input
                          type="text"
                          disabled={!canEditObserverForms}
                          value={row.rekomendasi}
                          onChange={(e) => {
                            const rows = [...record.form12.rows];
                            rows[idx] = { ...row, rekomendasi: e.target.value };
                            setRecord((prev) => ({
                              ...prev,
                              form12: { ...prev.form12, rows },
                            }));
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="radio"
                          name={`f12-status-${idx}`}
                          disabled={!canEditObserverForms}
                          checked={row.statusPelaksanaan === 'sudah'}
                          onChange={() => {
                            const rows = [...record.form12.rows];
                            rows[idx] = { ...row, statusPelaksanaan: 'sudah' };
                            setRecord((prev) => ({
                              ...prev,
                              form12: { ...prev.form12, rows },
                            }));
                          }}
                          className="w-4 h-4 accent-blue-700"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="radio"
                          name={`f12-status-${idx}`}
                          disabled={!canEditObserverForms}
                          checked={row.statusPelaksanaan === 'belum'}
                          onChange={() => {
                            const rows = [...record.form12.rows];
                            rows[idx] = { ...row, statusPelaksanaan: 'belum' };
                            setRecord((prev) => ({
                              ...prev,
                              form12: { ...prev.form12, rows },
                            }));
                          }}
                          className="w-4 h-4 accent-blue-700"
                        />
                      </td>
                      <td className="py-2 px-1.5">
                        <input
                          type="text"
                          disabled={!canEditObserverForms}
                          value={row.bukti}
                          onChange={(e) => {
                            const rows = [...record.form12.rows];
                            rows[idx] = { ...row, bukti: e.target.value };
                            setRecord((prev) => ({
                              ...prev,
                              form12: { ...prev.form12, rows },
                            }));
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded disabled:bg-slate-50"
                        />
                      </td>
                      <td className="py-2 px-1.5">
                        <input
                          type="text"
                          disabled={!canEditObserverForms}
                          value={row.hasilMonitoring}
                          onChange={(e) => {
                            const rows = [...record.form12.rows];
                            rows[idx] = {
                              ...row,
                              hasilMonitoring: e.target.value,
                            };
                            setRecord((prev) => ({
                              ...prev,
                              form12: { ...prev.form12, rows },
                            }));
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded disabled:bg-slate-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Kesimpulan Monitoring
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FORM12_KESIMPULAN_MONITORING.map((item) => {
                  const checked =
                    record.form12.kesimpulanMonitoring.includes(item);
                  return (
                    <label
                      key={item}
                      className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        disabled={!canEditObserverForms}
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...record.form12.kesimpulanMonitoring, item]
                            : record.form12.kesimpulanMonitoring.filter(
                                (v) => v !== item
                              );
                          setRecord((prev) => ({
                            ...prev,
                            form12: {
                              ...prev.form12,
                              kesimpulanMonitoring: next,
                            },
                          }));
                        }}
                        className="w-4 h-4 accent-blue-700"
                      />
                      <span>{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>

          {/* FORM 13 */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  FORM 13. BERITA ACARA HASIL LESSON STUDY
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dokumen resmi hasil supervisi akademik berbasis Lesson Study (PLAN → DO → SEE → TINDAK LANJUT)
                </p>
              </div>
              {canEditObserverForms && (
                <button
                  type="button"
                  onClick={handleAutoPopulateBeritaAcara}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Salin Ringkasan dari Form 1, 8 &amp; 10
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hari
                </label>
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.hari}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: { ...prev.form13, hari: e.target.value },
                    }))
                  }
                  placeholder="Rabu"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal
                </label>
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.tanggal}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: { ...prev.form13, tanggal: e.target.value },
                    }))
                  }
                  placeholder="15"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Bulan
                </label>
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.bulan}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: { ...prev.form13, bulan: e.target.value },
                    }))
                  }
                  placeholder="November"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tahun
                </label>
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.tahun}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: { ...prev.form13, tahun: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Praktik Baik (1 &amp; 2)
                </label>
                {[0, 1].map((i) => (
                  <input
                    key={i}
                    type="text"
                    disabled={!canEditObserverForms}
                    value={record.form13.praktikBaik[i]}
                    onChange={(e) => {
                      const next: [string, string] = [
                        ...record.form13.praktikBaik,
                      ] as [string, string];
                      next[i] = e.target.value;
                      setRecord((prev) => ({
                        ...prev,
                        form13: { ...prev.form13, praktikBaik: next },
                      }));
                    }}
                    placeholder={`Praktik baik ${i + 1}`}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
                  />
                ))}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Hal yang Perlu Diperbaiki (1 &amp; 2)
                </label>
                {[0, 1].map((i) => (
                  <input
                    key={i}
                    type="text"
                    disabled={!canEditObserverForms}
                    value={record.form13.halPerluDiperbaiki[i]}
                    onChange={(e) => {
                      const next: [string, string] = [
                        ...record.form13.halPerluDiperbaiki,
                      ] as [string, string];
                      next[i] = e.target.value;
                      setRecord((prev) => ({
                        ...prev,
                        form13: { ...prev.form13, halPerluDiperbaiki: next },
                      }));
                    }}
                    placeholder={`Perbaikan ${i + 1}`}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
                  />
                ))}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Rencana Tindak Lanjut (1 &amp; 2)
                </label>
                {[0, 1].map((i) => (
                  <input
                    key={i}
                    type="text"
                    disabled={!canEditObserverForms}
                    value={record.form13.rencanaTindakLanjut[i]}
                    onChange={(e) => {
                      const next: [string, string] = [
                        ...record.form13.rencanaTindakLanjut,
                      ] as [string, string];
                      next[i] = e.target.value;
                      setRecord((prev) => ({
                        ...prev,
                        form13: { ...prev.form13, rencanaTindakLanjut: next },
                      }));
                    }}
                    placeholder={`Tindak lanjut ${i + 1}`}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Guru / Observant
                </label>
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.namaGuru}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: { ...prev.form13, namaGuru: e.target.value },
                    }))
                  }
                  placeholder="Nama Guru"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded mb-1.5 disabled:bg-slate-50"
                />
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.nipGuru}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: { ...prev.form13, nipGuru: e.target.value },
                    }))
                  }
                  placeholder="NIP."
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Observer
                </label>
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.namaObserver}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: { ...prev.form13, namaObserver: e.target.value },
                    }))
                  }
                  placeholder="Nama Observer"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded mb-1.5 disabled:bg-slate-50"
                />
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.nipObserver}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: { ...prev.form13, nipObserver: e.target.value },
                    }))
                  }
                  placeholder="NIP."
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supervisor
                </label>
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.namaSupervisor}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: {
                        ...prev.form13,
                        namaSupervisor: e.target.value,
                      },
                    }))
                  }
                  placeholder="Nama Supervisor"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded mb-1.5 disabled:bg-slate-50"
                />
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.nipSupervisor}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: {
                        ...prev.form13,
                        nipSupervisor: e.target.value,
                      },
                    }))
                  }
                  placeholder="NIP."
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ketua Tim Lesson Study
                </label>
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.namaKetuaTim}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: { ...prev.form13, namaKetuaTim: e.target.value },
                    }))
                  }
                  placeholder="Nama Ketua Tim"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded mb-1.5 disabled:bg-slate-50"
                />
                <input
                  type="text"
                  disabled={!canEditObserverForms}
                  value={record.form13.nipKetuaTim}
                  onChange={(e) =>
                    setRecord((prev) => ({
                      ...prev,
                      form13: { ...prev.form13, nipKetuaTim: e.target.value },
                    }))
                  }
                  placeholder="NIP."
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded disabled:bg-slate-50"
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
