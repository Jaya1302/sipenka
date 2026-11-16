import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Loader2,
  Pencil,
  ShieldAlert,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  normalizeUsername,
} from '../lib/firebase';
import {
  ParsedExcelUserRow,
  downloadUserImportTemplate,
  exportImportResultCredentials,
  parseUserExcelFile,
} from '../lib/userExcelImport';
import {
  KONSENTRASI_KEAHLIAN_SMKN13,
  UserProfile,
  UserRole,
} from '../types/supervision';

interface UsersRolesViewProps {
  currentUserUid: string;
  onUsersChanged?: () => void;
}

export function UsersRolesView({
  currentUserUid,
  onUsersChanged,
}: UsersRolesViewProps) {
  const { createManagedAccount } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [nip, setNip] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [konsentrasiKeahlian, setKonsentrasiKeahlian] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdCredential, setCreatedCredential] = useState<{
    username: string;
    password: string;
    displayName: string;
    role: UserRole;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('guru');
  const [editNip, setEditNip] = useState('');
  const [editMataPelajaran, setEditMataPelajaran] = useState('');
  const [editKonsentrasi, setEditKonsentrasi] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Multi-select Bulk Delete State
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{
    done: number;
    total: number;
  }>({ done: 0, total: 0 });
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  // Excel Bulk Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [excelRows, setExcelRows] = useState<ParsedExcelUserRow[]>([]);
  const [excelParseError, setExcelParseError] = useState<string | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [bulkFinished, setBulkFinished] = useState(false);

  const refreshUsers = useCallback(async () => {
    try {
      const list = await apiRequest<UserProfile[]>('/api/users');
      setUsers(list);
      const deletableSet = new Set(
        list
          .filter(
            (u) =>
              u.email.toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL &&
              u.uid !== currentUserUid
          )
          .map((u) => u.uid)
      );
      setSelectedUids((prev) => prev.filter((id) => deletableSet.has(id)));
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.'
      );
    }
  }, [currentUserUid]);

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  const deletableUsers = users.filter(
    (u) =>
      u.email.toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL &&
      u.uid !== currentUserUid
  );
  const allDeletableSelected =
    deletableUsers.length > 0 &&
    deletableUsers.every((u) => selectedUids.includes(u.uid));
  const someDeletableSelected =
    selectedUids.length > 0 && !allDeletableSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someDeletableSelected;
    }
  }, [someDeletableSelected]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCreatedCredential(null);
    setCopied(false);

    const cleanUsername = normalizeUsername(username);
    if (cleanUsername.length < 3 || !/[a-z0-9]/.test(cleanUsername)) {
      setErrorMsg(
        'Username minimal 3 karakter (huruf kecil, angka, @, titik, garis bawah, atau strip).'
      );
      return;
    }

    if (users.some((u) => (u.username || '').toLowerCase() === cleanUsername)) {
      setErrorMsg(`Username "${cleanUsername}" sudah digunakan.`);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password minimal 6 karakter.');
      return;
    }

    setSaving(true);
    try {
      const created = await createManagedAccount({
        username: cleanUsername,
        password,
        displayName,
        role,
        nip,
        mataPelajaran,
        konsentrasiKeahlian,
      });

      setCreatedCredential({
        username: created.username || cleanUsername,
        password,
        displayName: created.displayName,
        role: created.role,
      });

      setUsername('');
      setPassword('');
      setDisplayName('');
      setNip('');
      setMataPelajaran('');
      setKonsentrasiKeahlian('');
      setRole('guru');
      await refreshUsers();
      onUsersChanged?.();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal membuat akun baru.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserRole = async (target: UserProfile) => {
    if (target.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL) return;
    const nextRole: UserRole = target.role === 'admin' ? 'guru' : 'admin';

    try {
      await apiRequest(`/api/users/${encodeURIComponent(target.uid)}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      await refreshUsers();
      onUsersChanged?.();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal mengubah peran pengguna.'
      );
    }
  };

  const handleDeleteUserDoc = async (uid: string) => {
    try {
      await apiRequest(`/api/users/${encodeURIComponent(uid)}`, {
        method: 'DELETE',
      });
      setSelectedUids((prev) => prev.filter((id) => id !== uid));
      setConfirmDeleteUid(null);
      await refreshUsers();
      onUsersChanged?.();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menghapus pengguna.'
      );
    }
  };

  const handleToggleSelectAllUsers = () => {
    if (allDeletableSelected) {
      setSelectedUids([]);
    } else {
      setSelectedUids(deletableUsers.map((u) => u.uid));
    }
  };

  const handleToggleSelectUser = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleBulkDeleteUsers = async () => {
    const targets = selectedUids.filter((uid) =>
      deletableUsers.some((u) => u.uid === uid)
    );
    if (targets.length === 0) {
      setConfirmBulkDelete(false);
      return;
    }

    setBulkDeleting(true);
    setBulkDeleteProgress({ done: 0, total: targets.length });

    try {
      await apiRequest('/api/users/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ uids: targets }),
      });
      setBulkDeleteProgress({ done: targets.length, total: targets.length });
      setSelectedUids([]);
      setConfirmBulkDelete(false);
      await refreshUsers();
      onUsersChanged?.();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus pengguna secara massal.'
      );
      setConfirmBulkDelete(false);
    } finally {
      setBulkDeleting(false);
    }
  };

  const openEditUserModal = (target: UserProfile) => {
    setEditingUser(target);
    setEditDisplayName(target.displayName);
    setEditRole(target.role);
    setEditNip(target.nip ?? '');
    setEditMataPelajaran(target.mataPelajaran ?? '');
    setEditKonsentrasi(target.konsentrasiKeahlian ?? '');
    setEditError(null);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const cleanName = editDisplayName.trim().slice(0, 150);
    if (!cleanName) {
      setEditError('Nama lengkap wajib diisi.');
      return;
    }

    const isRootAdmin =
      editingUser.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
    const isSelf = editingUser.uid === currentUserUid;
    const finalRole: UserRole =
      isRootAdmin || isSelf ? editingUser.role : editRole;

    const cleanNip = editNip.trim().slice(0, 50);
    const cleanMapel = editMataPelajaran.trim().slice(0, 150);
    const cleanKonsentrasi = editKonsentrasi.trim().slice(0, 150);

    setEditSaving(true);
    setEditError(null);

    try {
      await apiRequest(`/api/users/${encodeURIComponent(editingUser.uid)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: cleanName,
          role: finalRole,
          nip: cleanNip,
          mataPelajaran: cleanMapel,
          konsentrasiKeahlian: cleanKonsentrasi,
        }),
      });
      setEditingUser(null);
      await refreshUsers();
      onUsersChanged?.();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Gagal memperbarui data pengguna.'
      );
    } finally {
      setEditSaving(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdCredential) return;
    const text = `Akun SIPENKA LS SMKN 13 Bandung\nNama: ${createdCredential.displayName}\nPeran: ${createdCredential.role === 'admin' ? 'Admin / Supervisor' : 'Guru / Observant'}\nUsername: ${createdCredential.username}\nPassword: ${createdCredential.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleExcelFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelParseError(null);
    setBulkFinished(false);
    setBulkProgress({ done: 0, total: 0 });

    try {
      const parsed = await parseUserExcelFile(file, users);
      setExcelFileName(file.name);
      setExcelRows(parsed);
    } catch (err) {
      setExcelFileName(null);
      setExcelRows([]);
      setExcelParseError(
        err instanceof Error
          ? err.message
          : 'Gagal membaca file Excel. Pastikan format sesuai template.'
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleToggleExcelRowSelection = (rowNumber: number) => {
    if (bulkImporting || bulkFinished) return;
    setExcelRows((prev) =>
      prev.map((row) =>
        row.rowNumber === rowNumber && row.validationError === null
          ? { ...row, selected: !row.selected }
          : row
      )
    );
  };

  const handleClearExcelImport = () => {
    if (bulkImporting) return;
    setExcelFileName(null);
    setExcelRows([]);
    setExcelParseError(null);
    setBulkFinished(false);
    setBulkProgress({ done: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcessBulkImport = async () => {
    const targets = excelRows.filter(
      (r) =>
        r.selected &&
        r.validationError === null &&
        r.importStatus !== 'success'
    );
    if (targets.length === 0) return;

    setBulkImporting(true);
    setBulkFinished(false);
    setBulkProgress({ done: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      setExcelRows((prev) =>
        prev.map((r) =>
          r.rowNumber === target.rowNumber
            ? { ...r, importStatus: 'processing', importMessage: undefined }
            : r
        )
      );

      try {
        await createManagedAccount({
          username: target.username,
          password: target.password,
          displayName: target.displayName,
          role: target.role,
          nip: target.nip,
          mataPelajaran: target.mataPelajaran,
          konsentrasiKeahlian: target.konsentrasiKeahlian,
        });

        setExcelRows((prev) =>
          prev.map((r) =>
            r.rowNumber === target.rowNumber
              ? {
                  ...r,
                  importStatus: 'success',
                  importMessage: 'Akun aktif & siap digunakan',
                }
              : r
          )
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Gagal membuat akun.';
        setExcelRows((prev) =>
          prev.map((r) =>
            r.rowNumber === target.rowNumber
              ? {
                  ...r,
                  importStatus: 'error',
                  importMessage: msg,
                }
              : r
          )
        );
      }

      setBulkProgress({ done: i + 1, total: targets.length });
    }

    setBulkImporting(false);
    setBulkFinished(true);
  };

  const validSelectedCount = excelRows.filter(
    (r) => r.selected && r.validationError === null && r.importStatus !== 'success'
  ).length;
  const invalidRowCount = excelRows.filter(
    (r) => r.validationError !== null
  ).length;
  const successRowCount = excelRows.filter(
    (r) => r.importStatus === 'success'
  ).length;
  const failedRowCount = excelRows.filter(
    (r) => r.importStatus === 'error'
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Manajemen Akun Username &amp; Peran
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Buat akun login berbasis Username dan Password untuk Admin/Supervisor maupun Guru/Observant tanpa memerlukan email pribadi.
        </p>
      </div>

      {/* Bulk Upload from Excel Template */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Import Massal Pengguna dari Template Excel</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              Unduh template Excel resmi, isi daftar akun guru atau admin beserta password awalnya, lalu unggah kembali untuk membuat banyak akun sekaligus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={downloadUserImportTemplate}
              disabled={bulkImporting}
              className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Unduh Template Excel (.xlsx)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelFileChange}
              className="hidden"
              id="excel-user-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkImporting}
              className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              <span>Upload File Excel</span>
            </button>
          </div>
        </div>

        <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
          Kolom yang dibaca: <strong className="text-slate-800">Username</strong>,{' '}
          <strong className="text-slate-800">Password</strong> (min. 6 karakter),{' '}
          <strong className="text-slate-800">Nama Lengkap &amp; Gelar</strong>,{' '}
          <span className="text-slate-700">Peran</span> (<code>guru</code>/<code>admin</code>),{' '}
          <span className="text-slate-700">NIP / NIPPPK</span>,{' '}
          <span className="text-slate-700">Mata Pelajaran</span>, dan{' '}
          <span className="text-slate-700">Konsentrasi Keahlian</span>.
        </div>

        {excelParseError && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{excelParseError}</span>
          </div>
        )}

        {excelRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                <span className="font-medium text-slate-900">
                  File: <span className="font-mono">{excelFileName}</span>
                </span>
                <span className="text-slate-600 tabular-nums">
                  Total baris: <strong>{excelRows.length}</strong>
                </span>
                <span className="text-emerald-700 tabular-nums">
                  Siap dibuat: <strong>{validSelectedCount}</strong>
                </span>
                {invalidRowCount > 0 && (
                  <span className="text-red-700 tabular-nums">
                    Perlu perbaikan: <strong>{invalidRowCount}</strong>
                  </span>
                )}
                {successRowCount > 0 && (
                  <span className="text-blue-700 tabular-nums">
                    Berhasil: <strong>{successRowCount}</strong>
                  </span>
                )}
                {failedRowCount > 0 && (
                  <span className="text-red-700 tabular-nums">
                    Gagal: <strong>{failedRowCount}</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleClearExcelImport}
                disabled={bulkImporting}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup Pratinjau</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2 px-3 w-10 text-center">Pilih</th>
                    <th className="py-2 px-3">Baris</th>
                    <th className="py-2 px-3">Username</th>
                    <th className="py-2 px-3">Password</th>
                    <th className="py-2 px-3">Nama Lengkap</th>
                    <th className="py-2 px-3">Peran</th>
                    <th className="py-2 px-3">NIP &amp; Mapel</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {excelRows.map((row) => {
                    const isInvalid = row.validationError !== null;
                    return (
                      <tr
                        key={row.rowNumber}
                        className={
                          row.importStatus === 'success'
                            ? 'bg-emerald-50/40'
                            : isInvalid || row.importStatus === 'error'
                              ? 'bg-red-50/40'
                              : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={
                              isInvalid ||
                              bulkImporting ||
                              row.importStatus === 'success'
                            }
                            onChange={() =>
                              handleToggleExcelRowSelection(row.rowNumber)
                            }
                            aria-label={`Pilih baris ${row.rowNumber}`}
                            className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-xs text-slate-500">
                          {row.rowNumber}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs font-semibold text-slate-900">
                          {row.username || '-'}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs text-slate-700">
                          {row.password ? '••••••' : '-'}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          {row.displayName || '-'}
                        </td>
                        <td className="py-2 px-3 text-xs font-medium text-slate-700">
                          {row.role === 'admin' ? 'Admin' : 'Guru'}
                        </td>
                        <td className="py-2 px-3 text-xs text-slate-600">
                          <div className="font-mono tabular-nums">
                            {row.nip || '-'}
                          </div>
                          <div className="text-slate-500">
                            {row.mataPelajaran || '-'}
                            {row.konsentrasiKeahlian
                              ? ` · ${row.konsentrasiKeahlian}`
                              : ''}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {row.importStatus === 'processing' && (
                            <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Membuat...
                            </span>
                          )}
                          {row.importStatus === 'success' && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Berhasil
                            </span>
                          )}
                          {row.importStatus === 'error' && (
                            <span className="text-red-700 font-medium">
                              Gagal: {row.importMessage}
                            </span>
                          )}
                          {row.importStatus === 'pending' &&
                            (isInvalid ? (
                              <span className="text-red-700">
                                {row.validationError}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">
                                Siap dibuat
                              </span>
                            ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-600 tabular-nums">
                {bulkImporting ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-blue-700">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Memproses {bulkProgress.done} dari {bulkProgress.total} akun...
                  </span>
                ) : bulkFinished ? (
                  <span className="font-medium text-emerald-800">
                    Proses selesai: {successRowCount} akun berhasil dibuat
                    {failedRowCount > 0 ? `, ${failedRowCount} gagal` : ''}.
                  </span>
                ) : (
                  <span>
                    Centang baris valid yang ingin dibuatkan akun secara massal.
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {bulkFinished && (
                  <button
                    type="button"
                    onClick={() => exportImportResultCredentials(excelRows)}
                    className="px-3.5 py-2 text-xs sm:text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Laporan Kredensial (.xlsx)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleProcessBulkImport}
                  disabled={bulkImporting || validSelectedCount === 0}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {bulkImporting
                    ? `Memproses (${bulkProgress.done}/${bulkProgress.total})...`
                    : `Buat ${validSelectedCount} Akun Valid`}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Create Username/Password Account Form */}
      <form
        onSubmit={handleCreateUser}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
      >
        <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <UserPlus className="w-4 h-4 text-blue-700" />
          <span>Buat Akun Pengguna Baru</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Username Login *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              placeholder="Contoh: ratna.kusuma"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <span className="text-xs text-slate-400">
              Huruf kecil, angka, @, titik, garis bawah, atau strip
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Password Awal (min. 6 karakter) *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-3 pr-9 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                aria-label="Lihat/sembunyikan password"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Peran Akses *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="guru">Guru / Observant</option>
              <option value="admin">Admin / Supervisor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Lengkap &amp; Gelar *
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Contoh: Dra. Ratna Kusumawati, M.Pd."
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
              placeholder="197204151998022003"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Mata Pelajaran
            </label>
            <input
              type="text"
              value={mataPelajaran}
              onChange={(e) => setMataPelajaran(e.target.value)}
              placeholder="Contoh: Kimia Analisis Instrumen"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
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
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800"
          >
            {errorMsg}
          </div>
        )}

        {createdCredential && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 text-xs sm:text-sm text-emerald-900">
              <div className="font-semibold">
                Akun berhasil dibuat untuk {createdCredential.displayName} (
                {createdCredential.role === 'admin' ? 'Admin' : 'Guru'})
              </div>
              <div className="font-mono tabular-nums">
                Username: <strong>{createdCredential.username}</strong> · Password:{' '}
                <strong>{createdCredential.password}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-emerald-300 text-emerald-800 rounded-lg hover:bg-emerald-100 flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Disalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Kredensial</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <span className="text-xs text-slate-500">
            Sesi Admin Anda tetap aktif saat membuat akun baru untuk guru maupun admin lain.
          </span>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60"
          >
            {saving ? 'Membuat Akun...' : 'Buat Akun Sekarang'}
          </button>
        </div>
      </form>

      {/* Registered Users Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-slate-900">
              Daftar Akun Pengguna ({users.length})
            </h2>
            {deletableUsers.length > 0 && (
              <p className="text-xs text-slate-500">
                Gunakan ceklis pada header atau baris tabel untuk memilih dan menghapus banyak pengguna sekaligus.
              </p>
            )}
          </div>

          {deletableUsers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 select-none">
                <input
                  type="checkbox"
                  checked={allDeletableSelected}
                  onChange={handleToggleSelectAllUsers}
                  className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>
                  {allDeletableSelected
                    ? `Semua Dipilih (${deletableUsers.length})`
                    : `Pilih Semua (${deletableUsers.length})`}
                </span>
              </label>

              {selectedUids.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-1.5 tabular-nums"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih ({selectedUids.length})</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 w-10 text-center">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={allDeletableSelected}
                    disabled={deletableUsers.length === 0}
                    onChange={handleToggleSelectAllUsers}
                    aria-label="Pilih semua pengguna yang dapat dihapus"
                    title="Pilih semua pengguna"
                    className="rounded border-slate-300 text-blue-700 focus:ring-blue-600 disabled:opacity-40"
                  />
                </th>
                <th className="py-2.5 px-4">Username</th>
                <th className="py-2.5 px-4">Nama Lengkap</th>
                <th className="py-2.5 px-4">NIP / NIPPPK</th>
                <th className="py-2.5 px-4">Mapel &amp; Konsentrasi</th>
                <th className="py-2.5 px-4">Peran</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map((u) => {
                const isRootAdmin =
                  u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
                const isSelf = u.uid === currentUserUid;
                const canDelete = !isRootAdmin && !isSelf;
                const isChecked = selectedUids.includes(u.uid);

                return (
                  <tr
                    key={u.uid}
                    className={
                      isChecked ? 'bg-red-50/40' : 'hover:bg-slate-50'
                    }
                  >
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!canDelete}
                        onChange={() => handleToggleSelectUser(u.uid)}
                        aria-label={`Pilih ${u.displayName}`}
                        className="rounded border-slate-300 text-blue-700 focus:ring-blue-600 disabled:opacity-30"
                      />
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-900">
                      {u.username || u.email}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {u.displayName}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-600">
                      {u.nip || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600">
                      <div>{u.mataPelajaran || '-'}</div>
                      <div className="text-slate-400">
                        {u.konsentrasiKeahlian || '-'}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-semibold">
                      <span
                        className={
                          u.role === 'admin' ? 'text-blue-700' : 'text-slate-700'
                        }
                      >
                        {u.role === 'admin'
                          ? 'Admin / Supervisor'
                          : 'Guru / Observant'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditUserModal(u)}
                          title="Edit profil pengguna"
                          className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-white border border-slate-300 rounded hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {isRootAdmin || isSelf ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 pl-1">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {isRootAdmin ? 'Admin Utama' : 'Sesi Anda'}
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleUserRole(u)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                            >
                              {u.role === 'admin'
                                ? 'Jadikan Guru'
                                : 'Jadikan Admin'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteUid(u.uid)}
                              title="Cabut akses akun"
                              className="p-1.5 text-red-600 border border-slate-200 rounded hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit User Modal */}
      {editingUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSaveEditUser}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Edit Data Pengguna
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  Username: {editingUser.username || editingUser.email}
                </p>
              </div>
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar *
                </label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    NIP / NIPPPK
                  </label>
                  <input
                    type="text"
                    value={editNip}
                    onChange={(e) => setEditNip(e.target.value)}
                    placeholder="197204151998022003"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Peran Akses
                  </label>
                  <select
                    value={editRole}
                    disabled={
                      editingUser.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL ||
                      editingUser.uid === currentUserUid
                    }
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="guru">Guru / Observant</option>
                    <option value="admin">Admin / Supervisor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={editMataPelajaran}
                  onChange={(e) => setEditMataPelajaran(e.target.value)}
                  placeholder="Contoh: Kimia Analisis Instrumen"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Konsentrasi Keahlian
                </label>
                <select
                  value={editKonsentrasi}
                  onChange={(e) => setEditKonsentrasi(e.target.value)}
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
            </div>

            {editError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
              >
                {editError}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60"
              >
                {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Single Delete Modal */}
      {confirmDeleteUid && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Hapus Akses Pengguna?
            </h3>
            <p className="text-sm text-slate-600">
              Profil pengguna akan dihapus dari sistem sehingga akun tersebut tidak lagi dapat mengakses data supervisi SMKN 13 Bandung.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUid(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUserDoc(confirmDeleteUid)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Hapus Akses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {confirmBulkDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Hapus {selectedUids.length} Akun Pengguna?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Seluruh profil pengguna yang dicentang akan dihapus dari sistem dan direktori guru sehingga tidak lagi dapat mengakses aplikasi. Akun Admin Utama serta sesi Anda saat ini tetap aman.
            </p>

            {bulkDeleting && (
              <div className="text-xs font-medium text-red-700 inline-flex items-center gap-2 tabular-nums">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Menghapus {bulkDeleteProgress.done} dari {bulkDeleteProgress.total} akun...
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setConfirmBulkDelete(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDeleteUsers}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                {bulkDeleting
                  ? 'Menghapus...'
                  : `Ya, Hapus ${selectedUids.length} Akun`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
