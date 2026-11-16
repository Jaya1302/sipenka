import { asc, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';
import type {
  TeacherDirectoryEntry,
  UserProfile,
  UserRole,
} from '../types/supervision.ts';

function toUserProfile(row: typeof users.$inferSelect): UserProfile {
  return {
    uid: row.uid,
    username: row.username || undefined,
    email: row.email,
    displayName: row.displayName,
    role: row.role === 'admin' ? 'admin' : 'guru',
    nip: row.nip || '',
    mataPelajaran: row.mataPelajaran || '',
    konsentrasiKeahlian: row.konsentrasiKeahlian || '',
    photoURL: row.photoURL || '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findUserByUid(uid: string): Promise<UserProfile | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] ? toUserProfile(rows[0]) : null;
  } catch (error) {
    console.error('Database query failed (findUserByUid):', error);
    throw new Error('Gagal membaca profil pengguna dari database.', {
      cause: error,
    });
  }
}

export async function upsertBootstrapAdmin(
  uid: string,
  email: string,
  displayName: string,
  photoURL: string
): Promise<UserProfile> {
  try {
    const now = new Date();
    const result = await db
      .insert(users)
      .values({
        uid,
        username: 'admin.utama',
        email,
        displayName: (displayName || 'Admin Utama SMKN 13').slice(0, 150),
        role: 'admin',
        nip: '',
        mataPelajaran: '',
        konsentrasiKeahlian: '',
        photoURL: (photoURL || '').slice(0, 500),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          role: 'admin',
          updatedAt: now,
        },
      })
      .returning();

    return toUserProfile(result[0]);
  } catch (error) {
    console.error('Database query failed (upsertBootstrapAdmin):', error);
    throw new Error('Gagal menginisialisasi akun admin utama.', {
      cause: error,
    });
  }
}

export async function listAllUsers(): Promise<UserProfile[]> {
  try {
    const rows = await db
      .select()
      .from(users)
      .orderBy(asc(users.displayName));
    return rows.map(toUserProfile);
  } catch (error) {
    console.error('Database query failed (listAllUsers):', error);
    throw new Error('Gagal memuat daftar pengguna dari database.', {
      cause: error,
    });
  }
}

export async function listTeacherDirectory(): Promise<TeacherDirectoryEntry[]> {
  try {
    const rows = await db
      .select({
        uid: users.uid,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        nip: users.nip,
        mataPelajaran: users.mataPelajaran,
        konsentrasiKeahlian: users.konsentrasiKeahlian,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(asc(users.displayName));

    return rows.map((r) => ({
      uid: r.uid,
      username: r.username || '',
      displayName: r.displayName,
      role: r.role === 'admin' ? 'admin' : 'guru',
      nip: r.nip || '',
      mataPelajaran: r.mataPelajaran || '',
      konsentrasiKeahlian: r.konsentrasiKeahlian || '',
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Database query failed (listTeacherDirectory):', error);
    throw new Error('Gagal memuat direktori guru dari database.', {
      cause: error,
    });
  }
}

export async function createOrUpdateManagedUser(input: {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  nip: string;
  mataPelajaran: string;
  konsentrasiKeahlian: string;
}): Promise<UserProfile> {
  try {
    const now = new Date();
    const result = await db
      .insert(users)
      .values({
        uid: input.uid,
        username: input.username.slice(0, 120),
        email: input.email.slice(0, 200),
        displayName: input.displayName.slice(0, 150),
        role: input.role === 'admin' ? 'admin' : 'guru',
        nip: input.nip.slice(0, 50),
        mataPelajaran: input.mataPelajaran.slice(0, 150),
        konsentrasiKeahlian: input.konsentrasiKeahlian.slice(0, 150),
        photoURL: '',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          username: input.username.slice(0, 120),
          email: input.email.slice(0, 200),
          displayName: input.displayName.slice(0, 150),
          role: input.role === 'admin' ? 'admin' : 'guru',
          nip: input.nip.slice(0, 50),
          mataPelajaran: input.mataPelajaran.slice(0, 150),
          konsentrasiKeahlian: input.konsentrasiKeahlian.slice(0, 150),
          updatedAt: now,
        },
      })
      .returning();

    return toUserProfile(result[0]);
  } catch (error) {
    console.error('Database query failed (createOrUpdateManagedUser):', error);
    throw new Error('Gagal menyimpan data pengguna ke database.', {
      cause: error,
    });
  }
}

export async function updateUserProfileByUid(
  uid: string,
  updates: {
    displayName?: string;
    role?: UserRole;
    nip?: string;
    mataPelajaran?: string;
    konsentrasiKeahlian?: string;
  }
): Promise<UserProfile | null> {
  try {
    const payload: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (updates.displayName !== undefined) {
      payload.displayName = updates.displayName.slice(0, 150);
    }
    if (updates.role !== undefined) {
      payload.role = updates.role === 'admin' ? 'admin' : 'guru';
    }
    if (updates.nip !== undefined) {
      payload.nip = updates.nip.slice(0, 50);
    }
    if (updates.mataPelajaran !== undefined) {
      payload.mataPelajaran = updates.mataPelajaran.slice(0, 150);
    }
    if (updates.konsentrasiKeahlian !== undefined) {
      payload.konsentrasiKeahlian = updates.konsentrasiKeahlian.slice(0, 150);
    }

    const result = await db
      .update(users)
      .set(payload)
      .where(eq(users.uid, uid))
      .returning();

    return result[0] ? toUserProfile(result[0]) : null;
  } catch (error) {
    console.error('Database query failed (updateUserProfileByUid):', error);
    throw new Error('Gagal memperbarui profil pengguna di database.', {
      cause: error,
    });
  }
}

export async function deleteUserByUid(uid: string): Promise<void> {
  try {
    await db.delete(users).where(eq(users.uid, uid));
  } catch (error) {
    console.error('Database query failed (deleteUserByUid):', error);
    throw new Error('Gagal menghapus pengguna dari database.', {
      cause: error,
    });
  }
}

export async function deleteUsersByUids(uids: string[]): Promise<void> {
  if (uids.length === 0) return;
  try {
    await db.delete(users).where(inArray(users.uid, uids));
  } catch (error) {
    console.error('Database query failed (deleteUsersByUids):', error);
    throw new Error('Gagal menghapus daftar pengguna dari database.', {
      cause: error,
    });
  }
}
