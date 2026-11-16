import 'dotenv/config';
import express, { Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  createOrUpdateManagedUser,
  deleteUserByUid,
  deleteUsersByUids,
  findUserByUid,
  listAllUsers,
  listTeacherDirectory,
  updateUserProfileByUid,
  upsertBootstrapAdmin,
} from './src/db/users.ts';
import {
  deleteSupervisionById,
  getSupervisionById,
  listSupervisionsForUser,
  upsertSupervisionRecord,
} from './src/db/supervisions.ts';
import type { SupervisionRecord, UserProfile, UserRole } from './src/types/supervision.ts';

const BOOTSTRAP_ADMIN_EMAIL = 'sumpena.jaya@gmail.com';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resolveCallerProfile(req: AuthRequest): Promise<UserProfile | null> {
  const uid = req.user?.uid;
  if (!uid) return null;
  const email = (req.user?.email ?? '').trim().toLowerCase();
  const isBootstrap =
    email === BOOTSTRAP_ADMIN_EMAIL && req.user?.email_verified === true;

  if (isBootstrap) {
    return upsertBootstrapAdmin(
      uid,
      req.user?.email ?? email,
      String(req.user?.name || 'Admin Utama SMKN 13'),
      String(req.user?.picture || '')
    );
  }
  return findUserByUid(uid);
}

async function requireRegisteredUser(
  req: AuthRequest,
  res: Response
): Promise<UserProfile | null> {
  const caller = await resolveCallerProfile(req);
  if (!caller) {
    res.status(403).json({
      error:
        'Akun belum terdaftar di sistem SMKN 13 Bandung. Hubungi Admin untuk pembuatan username dan password.',
    });
    return null;
  }
  return caller;
}

async function requireAdmin(
  req: AuthRequest,
  res: Response
): Promise<UserProfile | null> {
  const caller = await requireRegisteredUser(req, res);
  if (!caller) return null;
  if (caller.role !== 'admin') {
    res.status(403).json({
      error: 'Akses ditolak: hanya Admin / Supervisor yang berwenang.',
    });
    return null;
  }
  return caller;
}

function isAssignedToSupervision(
  existing: SupervisionRecord,
  caller: UserProfile
): boolean {
  if (existing.createdByUid === caller.uid) return true;
  if (existing.teacherUid && existing.teacherUid === caller.uid) return true;
  if (
    existing.teacherEmail &&
    existing.teacherEmail.toLowerCase() === caller.email.toLowerCase()
  ) {
    return true;
  }
  return false;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Current authenticated user profile
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const caller = await requireRegisteredUser(req, res);
      if (!caller) return;
      res.json(caller);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal memuat profil.';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const caller = await requireRegisteredUser(req, res);
      if (!caller) return;

      const body = req.body as Partial<UserProfile>;
      const updated = await updateUserProfileByUid(caller.uid, {
        displayName:
          String(body.displayName ?? caller.displayName).trim() ||
          caller.displayName,
        nip: String(body.nip ?? ''),
        mataPelajaran: String(body.mataPelajaran ?? ''),
        konsentrasiKeahlian: String(body.konsentrasiKeahlian ?? ''),
      });
      res.json(updated ?? caller);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal menyimpan profil.';
      res.status(500).json({ error: message });
    }
  });

  // Non-PII Teacher Directory (for Form 1 dropdown)
  app.get(
    '/api/teacher-directory',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const caller = await requireRegisteredUser(req, res);
        if (!caller) return;
        const directory = await listTeacherDirectory();
        res.json(directory);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Gagal memuat direktori guru.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Admin User Management
  app.get('/api/users', requireAuth, async (req: AuthRequest, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const list = await listAllUsers();
      res.json(list);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal memuat daftar pengguna.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/users', requireAuth, async (req: AuthRequest, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const body = req.body as Partial<UserProfile>;
      if (!body.uid || !body.email || !body.displayName) {
        return res
          .status(400)
          .json({ error: 'Data pengguna tidak lengkap (uid, email, nama).' });
      }

      const created = await createOrUpdateManagedUser({
        uid: String(body.uid),
        username: String(body.username ?? ''),
        email: String(body.email),
        displayName: String(body.displayName),
        role: body.role === 'admin' ? 'admin' : 'guru',
        nip: String(body.nip ?? ''),
        mataPelajaran: String(body.mataPelajaran ?? ''),
        konsentrasiKeahlian: String(body.konsentrasiKeahlian ?? ''),
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal membuat akun pengguna.';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/users/:uid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const targetUid = String(req.params.uid);
      const target = await findUserByUid(targetUid);
      if (!target) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      }

      const body = req.body as {
        displayName?: string;
        role?: UserRole;
        nip?: string;
        mataPelajaran?: string;
        konsentrasiKeahlian?: string;
      };

      const isRoot = target.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
      const isSelf = target.uid === admin.uid;

      const nextRole: UserRole =
        isRoot || isSelf
          ? target.role
          : body.role === 'admin' || body.role === 'guru'
            ? body.role
            : target.role;

      const updated = await updateUserProfileByUid(targetUid, {
        displayName:
          body.displayName !== undefined
            ? String(body.displayName).trim() || target.displayName
            : undefined,
        role: nextRole,
        nip: body.nip !== undefined ? String(body.nip) : undefined,
        mataPelajaran:
          body.mataPelajaran !== undefined
            ? String(body.mataPelajaran)
            : undefined,
        konsentrasiKeahlian:
          body.konsentrasiKeahlian !== undefined
            ? String(body.konsentrasiKeahlian)
            : undefined,
      });

      res.json(updated);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal memperbarui pengguna.';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/users/:uid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const targetUid = String(req.params.uid);
      const target = await findUserByUid(targetUid);
      if (!target) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      }
      if (
        target.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL ||
        target.uid === admin.uid
      ) {
        return res.status(403).json({
          error: 'Admin Utama atau sesi aktif Anda tidak dapat dihapus.',
        });
      }

      await deleteUserByUid(targetUid);
      res.json({ ok: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal menghapus pengguna.';
      res.status(500).json({ error: message });
    }
  });

  app.post(
    '/api/users/bulk-delete',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;

        const { uids } = req.body as { uids?: unknown };
        if (!Array.isArray(uids) || uids.length === 0) {
          return res.status(400).json({ error: 'Daftar UID kosong.' });
        }

        const allUsers = await listAllUsers();
        const protectedSet = new Set(
          allUsers
            .filter(
              (u) =>
                u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL ||
                u.uid === admin.uid
            )
            .map((u) => u.uid)
        );

        const safeUids = uids
          .map((id) => String(id))
          .filter((id) => id.length > 0 && !protectedSet.has(id));

        await deleteUsersByUids(safeUids);
        res.json({ ok: true, deletedCount: safeUids.length });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Gagal menghapus pengguna secara massal.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Supervisions CRUD
  app.get('/api/supervisions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const caller = await requireRegisteredUser(req, res);
      if (!caller) return;

      const list = await listSupervisionsForUser({
        uid: caller.uid,
        email: caller.email,
        isAdmin: caller.role === 'admin',
      });
      res.json(list);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal memuat data supervisi.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/supervisions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const caller = await requireRegisteredUser(req, res);
      if (!caller) return;

      const record = req.body as SupervisionRecord;
      if (!record?.id || !record?.teacherName || !record?.mataPelajaran) {
        return res
          .status(400)
          .json({ error: 'Data supervisi wajib tidak lengkap.' });
      }

      const sanitized: SupervisionRecord = {
        ...record,
        createdByUid: caller.uid,
        status:
          caller.role === 'admin'
            ? record.status
            : record.status === 'finalized'
              ? 'in_progress'
              : record.status,
      };

      const saved = await upsertSupervisionRecord(sanitized);
      res.status(201).json(saved);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal menyimpan supervisi.';
      res.status(500).json({ error: message });
    }
  });

  app.put(
    '/api/supervisions/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const caller = await requireRegisteredUser(req, res);
        if (!caller) return;

        const id = String(req.params.id);
        const existing = await getSupervisionById(id);
        if (!existing) {
          return res
            .status(404)
            .json({ error: 'Dokumen supervisi tidak ditemukan.' });
        }

        const isAdmin = caller.role === 'admin';
        if (!isAdmin) {
          if (!isAssignedToSupervision(existing, caller)) {
            return res
              .status(403)
              .json({ error: 'Anda tidak memiliki akses ke supervisi ini.' });
          }
          if (existing.status === 'finalized') {
            return res.status(403).json({
              error: 'Supervisi yang sudah difinalisasi tidak dapat diubah.',
            });
          }
        }

        const incoming = req.body as SupervisionRecord;
        const sanitized: SupervisionRecord = {
          ...incoming,
          id: existing.id,
          createdByUid: existing.createdByUid,
          teacherEmail:
            !isAdmin && existing.createdByUid !== caller.uid
              ? existing.teacherEmail
              : incoming.teacherEmail,
          status: isAdmin
            ? incoming.status
            : incoming.status === 'finalized'
              ? 'in_progress'
              : incoming.status,
        };

        const updated = await upsertSupervisionRecord(sanitized);
        res.json(updated);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Gagal memperbarui supervisi.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.delete(
    '/api/supervisions/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;

        const id = String(req.params.id);
        await deleteSupervisionById(id);
        res.json({ ok: true });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Gagal menghapus supervisi.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.post(
    '/api/supervisions/seed',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;

        const { records } = req.body as { records?: SupervisionRecord[] };
        if (!Array.isArray(records) || records.length === 0) {
          return res
            .status(400)
            .json({ error: 'Data sampel supervisi tidak valid.' });
        }

        const saved: SupervisionRecord[] = [];
        for (const item of records) {
          const rec = await upsertSupervisionRecord({
            ...item,
            createdByUid: admin.uid,
          });
          saved.push(rec);
        }
        res.json({ ok: true, count: saved.length });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Gagal mengisi data contoh supervisi.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Vite middleware for dev or static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

void startServer();
