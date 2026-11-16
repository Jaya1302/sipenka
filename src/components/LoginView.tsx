import React, { useState } from 'react';
import {
  BookOpenCheck,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  LineChart,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginView() {
  const {
    signInWithUsernamePassword,
    signInWithGoogle,
    authError,
    loading,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signInWithUsernamePassword(username, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            SIPENKA LS
          </span>
          <span className="text-sm text-slate-500 hidden sm:inline whitespace-nowrap shrink-0">
            SMK Negeri 13 Bandung
          </span>
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
            Portal Supervisi Akademik
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
        <section className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-blue-700">
              Instrumen Supervisi Akademik Berbasis Lesson Study
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight [text-wrap:balance]">
              Penilaian Kinerja Guru &amp; Rekapitulasi Real-Time SMKN 13 Bandung
            </h1>
            <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
              Platform terpadu untuk pengisian Form 1 hingga Form 13 (PLAN, DO, SEE, hingga Berita Acara), pemantauan rata-rata nilai secara langsung, dan ekspor laporan resmi dalam format PDF serta Excel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm">
                <BookOpenCheck className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Instrumen Lengkap Form 1–13</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Mencakup Identitas, Perencanaan PLAN, Telaah Modul Ajar, Observasi Guru &amp; Peserta Didik, Refleksi SEE, Penilaian Berbobot, RTL, dan Berita Acara.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm">
                <LineChart className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Dashboard Nilai Real-Time</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Pantau rata-rata nilai akhir, skor per 6 komponen pembobotan, dan distribusi kategori kinerja secara langsung saat data disimpan.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm">
                <FileSpreadsheet className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Ekspor PDF &amp; Excel Resmi</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Unduh rekapitulasi nilai dalam format Excel (.xlsx) multi-sheet serta PDF siap cetak lengkap dengan Berita Acara tanda tangan.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Akun Terkelola oleh Admin</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Login menggunakan Username dan Password yang dibuatkan oleh Admin sekolah untuk peran Admin/Supervisor maupun Guru/Observant.
              </p>
            </div>
          </div>
        </section>

        <aside className="lg:col-span-5 flex flex-col justify-center">
          <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900">
                Masuk ke Sistem Supervisi
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Masukkan <strong>Username</strong> dan <strong>Password</strong> yang telah dibuatkan oleh Admin SMKN 13 Bandung.
              </p>
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 leading-relaxed"
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: ratna.kusuma"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    aria-label={
                      showPassword ? 'Sembunyikan password' : 'Lihat password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm transition-colors disabled:opacity-60"
              >
                {submitting || loading ? 'Memverifikasi...' : 'Masuk'}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>Admin utama belum membuat akun username?</span>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={loading || submitting}
                  className="font-semibold text-slate-800 hover:text-blue-700 hover:underline whitespace-nowrap shrink-0"
                >
                  Masuk Admin Utama (Google)
                </button>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed">
                Akun Guru dan Admin dibuat melalui menu <strong>Akun Pengguna</strong> oleh Admin setelah masuk.
              </div>
            </div>
          </div>
        </aside>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>SMK Negeri 13 Bandung — Supervisi Akademik Berbasis Lesson Study</span>
          <span>Tahun Pelajaran 2026</span>
        </div>
      </footer>
    </div>
  );
}
