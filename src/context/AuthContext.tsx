import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  EmailAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updatePassword,
} from 'firebase/auth';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  auth,
  getSecondaryAuth,
  googleProvider,
  normalizeUsername,
  usernameToAuthEmail,
} from '../lib/firebase';
import { ApiError, apiRequest } from '../lib/api';
import { UserProfile, UserRole } from '../types/supervision';

export interface CreateAccountInput {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  nip: string;
  mataPelajaran: string;
  konsentrasiKeahlian: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  actualRole: UserRole;
  effectiveRole: UserRole;
  previewAsGuru: boolean;
  setPreviewAsGuru: (val: boolean) => void;
  signInWithUsernamePassword: (
    username: string,
    password: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  createManagedAccount: (input: CreateAccountInput) => Promise<UserProfile>;
  changeMyPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  updateMyProfile: (updates: {
    displayName: string;
    nip: string;
    mataPelajaran: string;
    konsentrasiKeahlian: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Provider Email/Password di Firebase Authentication belum diaktifkan. Aktifkan terlebih dahulu di Firebase Console → Authentication → Sign-in method → Email/Password.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Username atau password salah. Pastikan akun Anda sudah dibuat oleh Admin.';
    case 'auth/email-already-in-use':
      return 'Username tersebut sudah digunakan oleh akun lain.';
    case 'auth/weak-password':
      return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login. Silakan tunggu beberapa saat lalu coba lagi.';
    case 'auth/popup-closed-by-user':
      return 'Jendela login Google ditutup sebelum selesai.';
    default:
      return err instanceof Error
        ? err.message
        : 'Terjadi kesalahan saat memproses otentikasi.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [previewAsGuru, setPreviewAsGuru] = useState(false);

  const resolveUserProfile = useCallback(async (user: User) => {
    const email = (user.email ?? '').trim().toLowerCase();
    const isBootstrap = email === BOOTSTRAP_ADMIN_EMAIL && user.emailVerified;

    try {
      const dbProfile = await apiRequest<UserProfile>('/api/auth/me');
      setProfile({
        ...dbProfile,
        role: isBootstrap ? 'admin' : dbProfile.role,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        await firebaseSignOut(auth);
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setAuthError(null);
      if (!user) {
        setFirebaseUser(null);
        setProfile(null);
        setPreviewAsGuru(false);
        setLoading(false);
        return;
      }

      setFirebaseUser(user);
      try {
        await resolveUserProfile(user);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Gagal memuat profil pengguna dari server.';
        setAuthError(message);
        setFirebaseUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [resolveUserProfile]);

  const signInWithUsernamePassword = useCallback(
    async (username: string, password: string) => {
      setAuthError(null);
      const clean = normalizeUsername(username);
      if (!clean || clean.length < 3 || !/[a-z0-9]/.test(clean)) {
        setAuthError(
          'Username minimal 3 karakter (huruf kecil, angka, @, titik, garis bawah, atau strip).'
        );
        return;
      }
      if (!password) {
        setAuthError('Password wajib diisi.');
        return;
      }

      try {
        await signInWithEmailAndPassword(
          auth,
          usernameToAuthEmail(clean),
          password
        );
      } catch (err) {
        setAuthError(mapFirebaseAuthError(err));
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    }
  }, []);

  const signOut = useCallback(async () => {
    setPreviewAsGuru(false);
    await firebaseSignOut(auth);
  }, []);

  const createManagedAccount = useCallback(
    async (input: CreateAccountInput): Promise<UserProfile> => {
      if (!firebaseUser || profile?.role !== 'admin') {
        throw new Error('Hanya Admin yang berwenang membuat akun pengguna.');
      }

      const cleanUsername = normalizeUsername(input.username).slice(0, 120);
      if (cleanUsername.length < 3 || !/[a-z0-9]/.test(cleanUsername)) {
        throw new Error(
          'Username minimal 3 karakter (huruf kecil, angka, @, titik, garis bawah, atau strip).'
        );
      }
      if (input.password.length < 6) {
        throw new Error('Password minimal 6 karakter.');
      }

      const internalEmail = usernameToAuthEmail(cleanUsername);
      const secondaryAuth = getSecondaryAuth();
      let newUid = '';

      try {
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth,
          internalEmail,
          input.password
        );
        newUid = cred.user.uid;
      } catch (err) {
        throw new Error(mapFirebaseAuthError(err));
      } finally {
        await firebaseSignOut(secondaryAuth).catch(() => {});
      }

      const newProfile: UserProfile = {
        uid: newUid,
        username: cleanUsername,
        email: internalEmail,
        displayName: (input.displayName.trim() || cleanUsername).slice(0, 150),
        role: input.role,
        nip: input.nip.trim().slice(0, 50),
        mataPelajaran: input.mataPelajaran.trim().slice(0, 150),
        konsentrasiKeahlian: input.konsentrasiKeahlian.trim().slice(0, 150),
        photoURL: '',
      };

      const saved = await apiRequest<UserProfile>('/api/users', {
        method: 'POST',
        body: JSON.stringify(newProfile),
      });

      return saved;
    },
    [firebaseUser, profile]
  );

  const changeMyPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('Sesi pengguna tidak ditemukan.');
      }
      if (newPassword.length < 6) {
        throw new Error('Password baru minimal 6 karakter.');
      }
      try {
        const credential = EmailAuthProvider.credential(
          firebaseUser.email,
          currentPassword
        );
        await reauthenticateWithCredential(firebaseUser, credential);
        await updatePassword(firebaseUser, newPassword);
      } catch (err) {
        throw new Error(mapFirebaseAuthError(err));
      }
    },
    [firebaseUser]
  );

  const updateMyProfile = useCallback(
    async (updates: {
      displayName: string;
      nip: string;
      mataPelajaran: string;
      konsentrasiKeahlian: string;
    }) => {
      if (!firebaseUser || !profile) return;
      const updated = await apiRequest<UserProfile>('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          displayName:
            updates.displayName.trim().slice(0, 150) || profile.displayName,
          nip: updates.nip.trim().slice(0, 50),
          mataPelajaran: updates.mataPelajaran.trim().slice(0, 150),
          konsentrasiKeahlian: updates.konsentrasiKeahlian.trim().slice(0, 150),
        }),
      });
      setProfile(updated);
    },
    [firebaseUser, profile]
  );

  const actualRole: UserRole = profile?.role ?? 'guru';
  const effectiveRole: UserRole =
    actualRole === 'admin' && previewAsGuru ? 'guru' : actualRole;

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      authError,
      actualRole,
      effectiveRole,
      previewAsGuru,
      setPreviewAsGuru,
      signInWithUsernamePassword,
      signInWithGoogle,
      signOut,
      createManagedAccount,
      changeMyPassword,
      updateMyProfile,
    }),
    [
      firebaseUser,
      profile,
      loading,
      authError,
      actualRole,
      effectiveRole,
      previewAsGuru,
      signInWithUsernamePassword,
      signInWithGoogle,
      signOut,
      createManagedAccount,
      changeMyPassword,
      updateMyProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
