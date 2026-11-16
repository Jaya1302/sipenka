import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { KONSENTRASI_KEAHLIAN_SMKN13 } from '../types/supervision';

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { firebaseUser, profile, updateMyProfile, changeMyPassword } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [nip, setNip] = useState(profile?.nip ?? '');
  const [mataPelajaran, setMataPelajaran] = useState(
    profile?.mataPelajaran ?? ''
  );
  const [konsentrasiKeahlian, setKonsentrasiKeahlian] = useState(
    profile?.konsentrasiKeahlian ?? ''
  );
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isUsernameAccount = Boolean(
    firebaseUser?.providerData?.some((p) => p.providerId === 'password')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyProfile({
        displayName,
        nip,
        mataPelajaran,
        konsentrasiKeahlian,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFeedback(null);
    setPwdSaving(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPwdFeedback({
        type: 'success',
        text: 'Password berhasil diperbarui.',
      });
    } catch (err) {
      setPwdFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengubah password.',
      });
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Profil Identitas &amp; Keamanan
            </h2>
            {profile?.username && (
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Username: {profile.username}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Lengkap &amp; Gelar
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              NIP / NIPPPK
            </label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Contoh: 198603182014021002"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Mata Pelajaran Utama
            </label>
            <input
              type="text"
              value={mataPelajaran}
              onChange={(e) => setMataPelajaran(e.target.value)}
              placeholder="Contoh: Kimia Analisis Instrumen"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Konsentrasi Keahlian
            </label>
            <select
              value={konsentrasiKeahlian}
              onChange={(e) => setKonsentrasiKeahlian(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Pilih Konsentrasi Keahlian</option>
              {KONSENTRASI_KEAHLIAN_SMKN13.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </form>

        {isUsernameAccount && (
          <form
            onSubmit={handlePasswordChange}
            className="pt-5 border-t border-slate-200 space-y-3"
          >
            <h3 className="text-sm font-semibold text-slate-900">
              Ubah Password Login
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Password saat ini"
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password baru (min. 6)"
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {pwdFeedback && (
              <p
                className={`text-xs font-medium ${
                  pwdFeedback.type === 'success'
                    ? 'text-emerald-700'
                    : 'text-red-700'
                }`}
              >
                {pwdFeedback.text}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pwdSaving}
                className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-60"
              >
                {pwdSaving ? 'Memperbarui...' : 'Perbarui Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
