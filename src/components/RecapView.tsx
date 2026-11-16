import React, { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import {
  KONSENTRASI_KEAHLIAN_SMKN13,
  PerformanceCategory,
  SupervisionRecord,
  SupervisionStatus,
  TahapLessonStudy,
  UserRole,
} from '../types/supervision';
import {
  exportRecapToExcel,
  exportRecapToPdf,
  exportSupervisionToPdf,
} from '../lib/exportReports';

interface RecapViewProps {
  records: SupervisionRecord[];
  role: UserRole;
  onSelectRecord: (record: SupervisionRecord) => void;
  onDeleteRecord: (id: string) => Promise<void>;
}

function getCategoryClass(kat: PerformanceCategory): string {
  switch (kat) {
    case 'Sangat Baik':
      return 'text-emerald-700 font-semibold';
    case 'Baik':
      return 'text-blue-700 font-semibold';
    case 'Cukup':
      return 'text-amber-700 font-semibold';
    case 'Perlu Perbaikan':
      return 'text-red-700 font-semibold';
  }
}

export function RecapView({
  records,
  role,
  onSelectRecord,
  onDeleteRecord,
}: RecapViewProps) {
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('ALL');
  const [filterTahap, setFilterTahap] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterKonsentrasi, setFilterKonsentrasi] = useState<string>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (filterKategori !== 'ALL' && r.kategori !== filterKategori) return false;
      if (filterTahap !== 'ALL' && r.tahap !== (filterTahap as TahapLessonStudy))
        return false;
      if (filterStatus !== 'ALL' && r.status !== (filterStatus as SupervisionStatus))
        return false;
      if (
        filterKonsentrasi !== 'ALL' &&
        r.konsentrasiKeahlian !== filterKonsentrasi
      )
        return false;
      if (!q) return true;
      return (
        r.teacherName.toLowerCase().includes(q) ||
        r.teacherNip.toLowerCase().includes(q) ||
        r.teacherEmail.toLowerCase().includes(q) ||
        r.mataPelajaran.toLowerCase().includes(q) ||
        r.konsentrasiKeahlian.toLowerCase().includes(q)
      );
    });
  }, [
    records,
    search,
    filterKategori,
    filterTahap,
    filterStatus,
    filterKonsentrasi,
  ]);

  const averages = useMemo(() => {
    const n = filtered.length;
    if (n === 0) {
      return {
        perencanaan: 0,
        pelaksanaan: 0,
        aktivitas: 0,
        asesmen: 0,
        refleksi: 0,
        smk: 0,
        total: 0,
      };
    }
    const avgKey = (key: string) =>
      filtered.reduce(
        (sum, r) =>
          sum + (r.form9.komponen.find((c) => c.key === key)?.nilai ?? 0),
        0
      ) / n;

    return {
      perencanaan: avgKey('perencanaan'),
      pelaksanaan: avgKey('pelaksanaan'),
      aktivitas: avgKey('aktivitasPesertaDidik'),
      asesmen: avgKey('asesmen'),
      refleksi: avgKey('refleksiTindakLanjut'),
      smk: avgKey('karakteristikSmkK3'),
      total: filtered.reduce((sum, r) => sum + r.totalNilai, 0) / n,
    };
  }, [filtered]);

  const handleConfirmDelete = async (id: string) => {
    setDeleting(true);
    try {
      await onDeleteRecord(id);
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Rekapitulasi Penilaian Supervisi Akademik
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Rekapitulasi skor Form 9 (Bobot 20% / 30% / 25% / 10% / 10% / 5%) serta ekspor laporan PDF dan Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportRecapToExcel(filtered)}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => exportRecapToPdf(filtered)}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>Ekspor Rekap PDF</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama guru, NIP, mata pelajaran..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <select
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          aria-label="Filter Kategori"
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">Semua Kategori</option>
          <option value="Sangat Baik">Sangat Baik (91–100)</option>
          <option value="Baik">Baik (81–90)</option>
          <option value="Cukup">Cukup (71–80)</option>
          <option value="Perlu Perbaikan">Perlu Perbaikan (≤70)</option>
        </select>

        <select
          value={filterKonsentrasi}
          onChange={(e) => setFilterKonsentrasi(e.target.value)}
          aria-label="Filter Konsentrasi Keahlian"
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">Semua Konsentrasi</option>
          {KONSENTRASI_KEAHLIAN_SMKN13.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            value={filterTahap}
            onChange={(e) => setFilterTahap(e.target.value)}
            aria-label="Filter Tahap"
            className="flex-1 px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">Tahap</option>
            <option value="PLAN">PLAN</option>
            <option value="DO">DO</option>
            <option value="SEE">SEE</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter Status"
            className="flex-1 px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">Status</option>
            <option value="draft">Draft</option>
            <option value="in_progress">Proses</option>
            <option value="finalized">Final</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-3 text-center">No</th>
                <th className="py-3 px-3">Guru / NIP</th>
                <th className="py-3 px-3">Mapel / Konsentrasi</th>
                <th className="py-3 px-2.5 text-right">Renc (20%)</th>
                <th className="py-3 px-2.5 text-right">Laks (30%)</th>
                <th className="py-3 px-2.5 text-right">Aktv (25%)</th>
                <th className="py-3 px-2.5 text-right">Ases (10%)</th>
                <th className="py-3 px-2.5 text-right">Refl (10%)</th>
                <th className="py-3 px-2.5 text-right">SMK (5%)</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3">Kategori &amp; Tindak Lanjut</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="py-10 px-4 text-center text-sm text-slate-500"
                  >
                    Tidak ada data supervisi yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((rec, idx) => {
                  const getNilai = (k: string) =>
                    rec.form9.komponen.find((c) => c.key === k)?.nilai ?? 0;
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => onSelectRecord(rec)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 text-sm">
                          {rec.teacherName}
                        </div>
                        <div className="text-slate-500 font-mono tabular-nums">
                          {rec.teacherNip || '-'} · {rec.tanggal || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium">
                          {rec.mataPelajaran}
                        </div>
                        <div className="text-slate-500">
                          {rec.konsentrasiKeahlian || '-'} · {rec.tahap}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                        {getNilai('perencanaan').toFixed(2)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                        {getNilai('pelaksanaan').toFixed(2)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                        {getNilai('aktivitasPesertaDidik').toFixed(2)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                        {getNilai('asesmen').toFixed(2)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                        {getNilai('refleksiTindakLanjut').toFixed(2)}
                      </td>
                      <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                        {getNilai('karakteristikSmkK3').toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-sm font-bold text-slate-900">
                        {rec.totalNilai.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <div className={getCategoryClass(rec.kategori)}>
                          {rec.kategori}
                        </div>
                        <div className="text-slate-500 line-clamp-1 max-w-[200px]">
                          {rec.form9.tindakLanjut}
                        </div>
                      </td>
                      <td
                        className="py-3 px-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => exportSupervisionToPdf(rec)}
                            title="Cetak PDF Instrumen & Berita Acara"
                            className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(rec.id)}
                              title="Hapus Data Supervisi"
                              className="p-1.5 text-red-600 hover:text-red-800 border border-slate-200 rounded hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 text-xs font-bold text-slate-900">
                  <td colSpan={3} className="py-3 px-3 text-right">
                    RATA-RATA ({filtered.length} DATA):
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                    {averages.perencanaan.toFixed(2)}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                    {averages.pelaksanaan.toFixed(2)}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                    {averages.aktivitas.toFixed(2)}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                    {averages.asesmen.toFixed(2)}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                    {averages.refleksi.toFixed(2)}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                    {averages.smk.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-sm text-blue-700">
                    {averages.total.toFixed(2)}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-slate-600 font-normal">
                    Skala Terbobot 0–100
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Inline Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Hapus Data Supervisi?
            </h3>
            <p className="text-sm text-slate-600">
              Tindakan ini akan menghapus seluruh isian Form 1–13 untuk sesi supervisi tersebut secara permanen dari Firestore.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(confirmDeleteId)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
