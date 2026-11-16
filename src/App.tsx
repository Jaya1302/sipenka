import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Eye,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiRequest } from './lib/api';
import { seedSampleSupervisions } from './lib/seedData';
import {
  SupervisionRecord,
  TeacherDirectoryEntry,
  createEmptySupervision,
} from './types/supervision';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { SupervisionFormWizard } from './components/SupervisionFormWizard';
import { RecapView } from './components/RecapView';
import { UsersRolesView } from './components/UsersRolesView';
import { ProfileModal } from './components/ProfileModal';

type NavTab = 'dashboard' | 'form' | 'recap' | 'users';

function generateSupervisionId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `ls_${Date.now()}_${rand}`;
}

function WorkspaceShell() {
  const {
    firebaseUser,
    profile,
    loading: authLoading,
    actualRole,
    effectiveRole,
    previewAsGuru,
    setPreviewAsGuru,
    signOut,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [records, setRecords] = useState<SupervisionRecord[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<
    TeacherDirectoryEntry[]
  >([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<{
    data: SupervisionRecord;
    isNew: boolean;
  } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const authUid = firebaseUser?.uid ?? '';
  const hasProfile = Boolean(profile);

  const refreshWorkspaceData = useCallback(async () => {
    if (!authUid || !hasProfile) {
      setRecords([]);
      setRegisteredUsers([]);
      setDataLoading(false);
      return;
    }

    try {
      const [supervisionList, directoryList] = await Promise.all([
        apiRequest<SupervisionRecord[]>('/api/supervisions'),
        apiRequest<TeacherDirectoryEntry[]>('/api/teacher-directory'),
      ]);
      setRecords(supervisionList);
      setRegisteredUsers(directoryList);
      setDataError(null);
    } catch (err) {
      setDataError(
        err instanceof Error
          ? err.message
          : 'Gagal menyinkronkan data dari database.'
      );
    } finally {
      setDataLoading(false);
    }
  }, [authUid, hasProfile]);

  useEffect(() => {
    if (!authUid || !hasProfile) {
      setRecords([]);
      setRegisteredUsers([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    void refreshWorkspaceData();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshWorkspaceData();
      }
    }, 20000);

    return () => {
      window.clearInterval(interval);
    };
  }, [authUid, hasProfile, refreshWorkspaceData]);

  const visibleRecords = useMemo(() => {
    if (actualRole === 'admin' && previewAsGuru && firebaseUser?.email) {
      const targetEmail = firebaseUser.email.toLowerCase();
      return records.filter(
        (r) =>
          r.teacherEmail.toLowerCase() === targetEmail ||
          r.createdByUid === firebaseUser.uid
      );
    }
    return records;
  }, [records, actualRole, previewAsGuru, firebaseUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-600">Memuat sesi aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !profile) {
    return <LoginView />;
  }

  const startNewSupervision = () => {
    const fresh = createEmptySupervision({
      id: generateSupervisionId(),
      createdByUid: firebaseUser.uid,
      teacherUid: '',
      teacherUsername: '',
      teacherEmail: '',
      teacherName: '',
      teacherNip: '',
      mataPelajaran: '',
      konsentrasiKeahlian: '',
      supervisorName:
        effectiveRole === 'admin'
          ? profile.displayName
          : 'Tim Supervisi Akademik SMKN 13 Bandung',
    });
    // Pengisi form adalah Observer yang sedang login
    fresh.form1.timObserver[0] = {
      nama: profile.displayName,
      jabatan: effectiveRole === 'admin' ? 'Supervisor / Observer' : 'Observer',
      tandaTangan: '',
    };
    fresh.form13.namaObserver = profile.displayName;
    fresh.form13.nipObserver = profile.nip ?? '';

    setEditingRecord({ data: fresh, isNew: true });
    setActiveTab('form');
    setMobileNavOpen(false);
  };

  const openExistingSupervision = (rec: SupervisionRecord) => {
    setEditingRecord({ data: rec, isNew: false });
    setActiveTab('form');
    setMobileNavOpen(false);
  };

  const handleSaveSupervision = async (
    updated: SupervisionRecord,
    isNew: boolean
  ) => {
    try {
      const saved = isNew
        ? await apiRequest<SupervisionRecord>('/api/supervisions', {
            method: 'POST',
            body: JSON.stringify(updated),
          })
        : await apiRequest<SupervisionRecord>(
            `/api/supervisions/${encodeURIComponent(updated.id)}`,
            {
              method: 'PUT',
              body: JSON.stringify(updated),
            }
          );

      setEditingRecord({ data: saved, isNew: false });
      setDataError(null);
      await refreshWorkspaceData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal menyimpan data supervisi.';
      setDataError(message);
      throw err;
    }
  };

  const handleDeleteSupervision = async (id: string) => {
    if (actualRole !== 'admin') return;
    try {
      await apiRequest(`/api/supervisions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (editingRecord?.data.id === id) {
        setEditingRecord(null);
        setActiveTab('recap');
      }
      setDataError(null);
      await refreshWorkspaceData();
    } catch (err) {
      setDataError(
        err instanceof Error ? err.message : 'Gagal menghapus data supervisi.'
      );
    }
  };

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
  }> = [
    { id: 'dashboard', label: 'Dashboard Real-Time', icon: LayoutDashboard },
    { id: 'form', label: 'Isi Instrumen (1–13)', icon: ClipboardList },
    { id: 'recap', label: 'Rekap & Ekspor', icon: FileSpreadsheet },
    {
      id: 'users',
      label: 'Pengguna & Peran',
      icon: Users,
      adminOnly: true,
    },
  ];

  const handleNavClick = (id: NavTab) => {
    if (id === 'form' && !editingRecord) {
      startNewSupervision();
      return;
    }
    setActiveTab(id);
    setMobileNavOpen(false);
  };

  const pageTitleMap: Record<NavTab, string> = {
    dashboard: 'Dashboard Nilai Rata-Rata',
    form: 'Instrumen Supervisi Lesson Study',
    recap: 'Rekapitulasi & Ekspor Laporan',
    users: 'Manajemen Pengguna & Peran',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 transition-transform duration-200 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-base font-bold tracking-tight text-white">
              SIPENKA LS
            </div>
            <div className="text-xs text-slate-400">SMK Negeri 13 Bandung</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            aria-label="Tutup Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || effectiveRole === 'admin')
            .map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-white truncate">
              {profile.displayName}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {effectiveRole === 'admin'
                ? 'Admin / Supervisor'
                : 'Guru / Observant'}
              {profile.nip ? ` · ${profile.nip}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="flex-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <UserCog className="w-3.5 h-3.5" />
              <span>Profil</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-red-900/60 hover:text-white rounded flex items-center justify-center gap-1.5 transition-colors"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              <span>SMKN 13 Bandung</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="font-semibold text-slate-900">
                {pageTitleMap[activeTab]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {actualRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  const nextPreview = !previewAsGuru;
                  setPreviewAsGuru(nextPreview);
                  if (nextPreview && activeTab === 'users') {
                    setActiveTab('dashboard');
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  previewAsGuru
                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>
                  {previewAsGuru ? 'Mode Pratinjau Guru (Aktif)' : 'Pratinjau Mode Guru'}
                </span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
          {dataError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 flex items-center justify-between gap-3"
            >
              <span>{dataError}</span>
              <button
                type="button"
                onClick={() => void refreshWorkspaceData()}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-red-300 rounded hover:bg-red-100 shrink-0"
              >
                Muat Ulang
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              records={visibleRecords}
              loading={dataLoading}
              role={effectiveRole}
              actualRole={actualRole}
              onCreateNew={startNewSupervision}
              onSelectRecord={openExistingSupervision}
              onOpenRecap={() => setActiveTab('recap')}
              onSeedSampleData={async () => {
                await seedSampleSupervisions(firebaseUser.uid);
                await refreshWorkspaceData();
              }}
            />
          )}

          {activeTab === 'form' && editingRecord && (
            <SupervisionFormWizard
              key={editingRecord.data.id}
              initialRecord={editingRecord.data}
              isNew={editingRecord.isNew}
              role={effectiveRole}
              currentUserEmail={firebaseUser.email ?? ''}
              registeredUsers={registeredUsers}
              onSave={handleSaveSupervision}
              onBack={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'recap' && (
            <RecapView
              records={visibleRecords}
              role={effectiveRole}
              onSelectRecord={openExistingSupervision}
              onDeleteRecord={handleDeleteSupervision}
            />
          )}

          {activeTab === 'users' && effectiveRole === 'admin' && (
            <UsersRolesView
              currentUserUid={firebaseUser.uid}
              onUsersChanged={() => void refreshWorkspaceData()}
            />
          )}
        </main>
      </div>

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceShell />
    </AuthProvider>
  );
}
