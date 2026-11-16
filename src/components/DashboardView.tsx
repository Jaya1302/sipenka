import React, { useMemo, useState } from 'react';
import {
  Database,
  Download,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react';
import {
  FORM9_WEIGHT_TEMPLATE,
  PerformanceCategory,
  SupervisionRecord,
  UserRole,
  getCategoryAndFollowUp,
} from '../types/supervision';
import { exportRecapToExcel, exportRecapToPdf, exportSupervisionToPdf } from '../lib/exportReports';

interface DashboardViewProps {
  records: SupervisionRecord[];
  loading: boolean;
  role: UserRole;
  actualRole: UserRole;
  onCreateNew: () => void;
  onSelectRecord: (record: SupervisionRecord) => void;
  onOpenRecap: () => void;
  onSeedSampleData: () => Promise<void>;
}

const CATEGORY_ORDER: PerformanceCategory[] = [
  'Sangat Baik',
  'Baik',
  'Cukup',
  'Perlu Perbaikan',
];

function getCategoryBarColor(kat: PerformanceCategory): string {
  switch (kat) {
    case 'Sangat Baik':
      return 'bg-emerald-600';
    case 'Baik':
      return 'bg-blue-700';
    case 'Cukup':
      return 'bg-amber-600';
    case 'Perlu Perbaikan':
      return 'bg-red-600';
  }
}

function getCategoryTextColor(kat: PerformanceCategory): string {
  switch (kat) {
    case 'Sangat Baik':
      return 'text-emerald-700';
    case 'Baik':
      return 'text-blue-700';
    case 'Cukup':
      return 'text-amber-700';
    case 'Perlu Perbaikan':
      return 'text-red-700';
  }
}

export function DashboardView({
  records,
  loading,
  role,
  actualRole,
  onCreateNew,
  onSelectRecord,
  onOpenRecap,
  onSeedSampleData,
}: DashboardViewProps) {
  const [seeding, setSeeding] = useState(false);

  const stats = useMemo(() => {
    const count = records.length;
    const finalizedCount = records.filter((r) => r.status === 'finalized').length;
    const avgScore =
      count > 0
        ? Math.round(
            (records.reduce((sum, r) => sum + (Number(r.totalNilai) || 0), 0) /
              count) *
              100
          ) / 100
        : 0;
    const goodOrBetterCount = records.filter((r) => r.totalNilai >= 81).length;
    const goodOrBetterPct =
      count > 0 ? Math.round((goodOrBetterCount / count) * 1000) / 10 : 0;

    const uniqueTeachers = new Set(
      records.map((r) => (r.teacherEmail || r.teacherName).toLowerCase())
    ).size;

    const componentAverages = FORM9_WEIGHT_TEMPLATE.map((tpl) => {
      const avgSkor =
        count > 0
          ? Math.round(
              (records.reduce((sum, r) => {
                const comp = r.form9?.komponen?.find((c) => c.key === tpl.key);
                return sum + (comp?.skor ?? 0);
              }, 0) /
                count) *
                10
            ) / 10
          : 0;
      const avgNilai =
        count > 0
          ? Math.round(
              (records.reduce((sum, r) => {
                const comp = r.form9?.komponen?.find((c) => c.key === tpl.key);
                return sum + (comp?.nilai ?? 0);
              }, 0) /
                count) *
                100
            ) / 100
          : 0;
      return {
        ...tpl,
        avgSkor,
        avgNilai,
      };
    });

    const categoryCounts = CATEGORY_ORDER.map((kat) => {
      const total = records.filter((r) => r.kategori === kat).length;
      const pct = count > 0 ? Math.round((total / count) * 1000) / 10 : 0;
      return { kategori: kat, total, pct };
    });

    const byConcentrationMap = new Map<
      string,
      { label: string; sum: number; count: number }
    >();
    records.forEach((r) => {
      const key = r.konsentrasiKeahlian || 'Umum / Lainnya';
      const cur = byConcentrationMap.get(key) ?? { label: key, sum: 0, count: 0 };
      cur.sum += Number(r.totalNilai) || 0;
      cur.count += 1;
      byConcentrationMap.set(key, cur);
    });
    const byConcentration = Array.from(byConcentrationMap.values())
      .map((item) => ({
        label: item.label,
        avg: Math.round((item.sum / item.count) * 100) / 100,
        count: item.count,
      }))
      .sort((a, b) => b.avg - a.avg);

    const overallMeta = getCategoryAndFollowUp(avgScore);

    return {
      count,
      finalizedCount,
      avgScore,
      goodOrBetterPct,
      uniqueTeachers,
      componentAverages,
      categoryCounts,
      byConcentration,
      overallCategory: count > 0 ? overallMeta.kategori : '-',
    };
  }, [records]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeedSampleData();
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-white border border-slate-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
        <div className="h-72 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {role === 'admin'
              ? 'Dashboard Pemantauan Kinerja Guru'
              : 'Dashboard Observasi & Penilaian'}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {role === 'admin'
              ? 'Pemantauan rata-rata nilai supervisi akademik berbasis Lesson Study secara real-time.'
              : 'Ringkasan hasil observasi yang Anda nilai sebagai Observer serta hasil supervisi terhadap Anda.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {records.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => exportRecapToExcel(records)}
                className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Ekspor Excel</span>
              </button>
              <button
                type="button"
                onClick={() => exportRecapToPdf(records)}
                className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4 text-red-700" />
                <span>Ekspor PDF</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>{role === 'admin' ? 'Input Supervisi Baru' : 'Input Penilaian Observant'}</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">
            Rata-Rata Nilai Kinerja
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {stats.avgScore.toFixed(2)}
            </span>
            <span className="text-xs font-medium text-slate-600">
              {stats.overallCategory}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Skala 0–100 terbobot Form 9
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">
            Total Instrumen Supervisi
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {stats.count}
            </span>
            <span className="text-xs font-medium text-slate-600 font-mono tabular-nums">
              {stats.finalizedCount} Final
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Siklus PLAN · DO · SEE tersimpan
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">
            Kategori Baik &amp; Sangat Baik
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {stats.goodOrBetterPct.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-slate-600">
              Skor ≥ 81
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Standar mutu pembelajaran SMKN 13
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">
            {role === 'admin' ? 'Guru / Observant Dinilai' : 'Status Pembaruan'}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {role === 'admin' ? stats.uniqueTeachers : stats.finalizedCount}
            </span>
            <span className="text-xs font-medium text-slate-600">
              {role === 'admin' ? 'Guru Aktif' : 'Dokumen Final'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Sinkronisasi langsung dengan Firestore
          </p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-4">
          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Belum Ada Data Supervisi Akademik
            </h2>
            <p className="text-sm text-slate-600">
              {role === 'admin'
                ? 'Mulai dengan mengisi instrumen supervisi Lesson Study baru atau muat 5 data contoh guru SMKN 13 Bandung untuk menguji grafik real-time dan ekspor laporan.'
                : 'Belum ada data observasi. Klik tombol di bawah untuk mulai menilai guru model (Observant) menggunakan instrumen Form 1 s.d. Form 13.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCreateNew}
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Buat Supervisi Pertama</span>
            </button>
            {actualRole === 'admin' && (
              <button
                type="button"
                onClick={handleSeed}
                disabled={seeding}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                <Database className="w-4 h-4 text-slate-600" />
                <span>
                  {seeding
                    ? 'Memuat Data Contoh...'
                    : 'Isi 5 Data Contoh SMKN 13 Bandung'}
                </span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 6 Components Average Chart */}
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Rata-Rata Skor per Komponen Form 9
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Skor komponen (skala 0–100) beserta kontribusi nilai terbobotnya
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  Bobot Total 100%
                </span>
              </div>

              <div className="space-y-4">
                {stats.componentAverages.map((comp) => (
                  <div key={comp.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-800 truncate">
                        {comp.label}{' '}
                        <span className="text-slate-400 font-mono text-xs">
                          ({comp.bobot}%)
                        </span>
                      </span>
                      <div className="flex items-center gap-3 font-mono tabular-nums shrink-0 text-xs">
                        <span className="text-slate-600">
                          Skor: <strong className="text-slate-900">{comp.avgSkor.toFixed(1)}</strong>
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-blue-700 font-semibold">
                          Nilai: {comp.avgNilai.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, comp.avgSkor))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Category Distribution & Concentration Breakdown */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-6">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-semibold text-slate-900">
                    Distribusi Kategori Kinerja
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Klasifikasi berdasarkan rentang nilai akhir Form 9
                  </p>
                </div>

                <div className="space-y-3">
                  {stats.categoryCounts.map((item) => (
                    <div key={item.kategori} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${getCategoryTextColor(item.kategori)}`}>
                          {item.kategori}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600">
                          {item.total} guru ({item.pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getCategoryBarColor(item.kategori)}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {stats.byConcentration.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Rata-Rata per Konsentrasi Keahlian
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {stats.byConcentration.map((item) => (
                      <div
                        key={item.label}
                        className="py-2 flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="text-slate-700 truncate">{item.label}</span>
                        <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                          <span className="text-slate-400">n={item.count}</span>
                          <span className="font-semibold text-slate-900">
                            {item.avg.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Live Recent Table */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Daftar Supervisi Terbaru
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik baris untuk membuka atau melengkapi instrumen Form 1–13
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenRecap}
                className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline whitespace-nowrap shrink-0"
              >
                Lihat Rekapitulasi Lengkap →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Guru / Observant</th>
                    <th className="py-2.5 px-4">Mata Pelajaran &amp; Konsentrasi</th>
                    <th className="py-2.5 px-4">Tanggal</th>
                    <th className="py-2.5 px-4">Tahap</th>
                    <th className="py-2.5 px-4 text-right">Nilai Akhir</th>
                    <th className="py-2.5 px-4">Kategori</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {records.slice(0, 8).map((rec) => (
                    <tr
                      key={rec.id}
                      onClick={() => onSelectRecord(rec)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">
                          {rec.teacherName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          {rec.teacherNip || rec.teacherEmail || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="text-slate-800">{rec.mataPelajaran}</div>
                        <div className="text-xs text-slate-500">
                          {rec.konsentrasiKeahlian || '-'}
                          {rec.kelasSemester ? ` · ${rec.kelasSemester}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {rec.tanggal || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {rec.tahap} ·{' '}
                        {rec.status === 'finalized'
                          ? 'Final'
                          : rec.status === 'in_progress'
                            ? 'Proses'
                            : 'Draft'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {rec.totalNilai.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold whitespace-nowrap">
                        <span className={getCategoryTextColor(rec.kategori)}>
                          {rec.kategori}
                        </span>
                      </td>
                      <td
                        className="py-2.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => exportSupervisionToPdf(rec)}
                          title="Unduh PDF Instrumen & Berita Acara"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {actualRole === 'admin' && records.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 py-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {seeding ? 'Menambahkan data contoh...' : 'Muat ulang 5 data contoh SMKN 13 Bandung'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
