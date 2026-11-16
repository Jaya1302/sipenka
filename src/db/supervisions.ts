import { desc, eq, or } from 'drizzle-orm';
import { db } from './index.ts';
import { supervisions } from './schema.ts';
import type {
  PerformanceCategory,
  SupervisionRecord,
  SupervisionStatus,
  TahapLessonStudy,
} from '../types/supervision.ts';

function toSupervisionRecord(
  row: typeof supervisions.$inferSelect
): SupervisionRecord {
  return {
    id: row.id,
    createdByUid: row.createdByUid,
    teacherUid: row.teacherUid || undefined,
    teacherUsername: row.teacherUsername || undefined,
    teacherEmail: row.teacherEmail,
    teacherName: row.teacherName,
    teacherNip: row.teacherNip || '',
    mataPelajaran: row.mataPelajaran,
    konsentrasiKeahlian: row.konsentrasiKeahlian || '',
    kelasSemester: row.kelasSemester || '',
    tanggal: row.tanggal || '',
    tahap: (row.tahap as TahapLessonStudy) || 'PLAN',
    status: (row.status as SupervisionStatus) || 'draft',
    totalNilai: Number(row.totalNilai ?? 0),
    kategori: (row.kategori as PerformanceCategory) || 'Perlu Perbaikan',
    form1: row.form1,
    form2: row.form2,
    form3: row.form3,
    form4: row.form4,
    form5: row.form5,
    form6: row.form6,
    form7: row.form7,
    form8: row.form8,
    form9: row.form9,
    form10: row.form10,
    form12: row.form12,
    form13: row.form13,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSupervisionsForUser(params: {
  uid: string;
  email: string;
  isAdmin: boolean;
}): Promise<SupervisionRecord[]> {
  try {
    const rows = params.isAdmin
      ? await db
          .select()
          .from(supervisions)
          .orderBy(desc(supervisions.tanggal), desc(supervisions.updatedAt))
      : await db
          .select()
          .from(supervisions)
          .where(
            or(
              eq(supervisions.createdByUid, params.uid),
              eq(supervisions.teacherUid, params.uid),
              eq(supervisions.teacherEmail, params.email)
            )
          )
          .orderBy(desc(supervisions.tanggal), desc(supervisions.updatedAt));

    return rows.map(toSupervisionRecord);
  } catch (error) {
    console.error('Database query failed (listSupervisionsForUser):', error);
    throw new Error('Gagal memuat data supervisi dari database.', {
      cause: error,
    });
  }
}

export async function getSupervisionById(
  id: string
): Promise<SupervisionRecord | null> {
  try {
    const rows = await db
      .select()
      .from(supervisions)
      .where(eq(supervisions.id, id))
      .limit(1);
    return rows[0] ? toSupervisionRecord(rows[0]) : null;
  } catch (error) {
    console.error('Database query failed (getSupervisionById):', error);
    throw new Error('Gagal mengambil detail supervisi dari database.', {
      cause: error,
    });
  }
}

export async function upsertSupervisionRecord(
  record: SupervisionRecord
): Promise<SupervisionRecord> {
  try {
    const now = new Date();
    const values = {
      id: record.id.slice(0, 128),
      createdByUid: record.createdByUid.slice(0, 128),
      teacherUid: (record.teacherUid ?? '').slice(0, 128),
      teacherUsername: (record.teacherUsername ?? '').slice(0, 120),
      teacherEmail: (record.teacherEmail ?? '').slice(0, 200),
      teacherName: record.teacherName.slice(0, 150),
      teacherNip: (record.teacherNip ?? '').slice(0, 50),
      mataPelajaran: record.mataPelajaran.slice(0, 150),
      konsentrasiKeahlian: (record.konsentrasiKeahlian ?? '').slice(0, 150),
      kelasSemester: (record.kelasSemester ?? '').slice(0, 80),
      tanggal: (record.tanggal ?? '').slice(0, 40),
      tahap: record.tahap,
      status: record.status,
      totalNilai: Number(record.totalNilai ?? 0),
      kategori: record.kategori,
      form1: record.form1,
      form2: record.form2,
      form3: record.form3,
      form4: record.form4,
      form5: record.form5,
      form6: record.form6,
      form7: record.form7,
      form8: record.form8,
      form9: record.form9,
      form10: record.form10,
      form12: record.form12,
      form13: record.form13,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db
      .insert(supervisions)
      .values(values)
      .onConflictDoUpdate({
        target: supervisions.id,
        set: {
          teacherUid: values.teacherUid,
          teacherUsername: values.teacherUsername,
          teacherEmail: values.teacherEmail,
          teacherName: values.teacherName,
          teacherNip: values.teacherNip,
          mataPelajaran: values.mataPelajaran,
          konsentrasiKeahlian: values.konsentrasiKeahlian,
          kelasSemester: values.kelasSemester,
          tanggal: values.tanggal,
          tahap: values.tahap,
          status: values.status,
          totalNilai: values.totalNilai,
          kategori: values.kategori,
          form1: values.form1,
          form2: values.form2,
          form3: values.form3,
          form4: values.form4,
          form5: values.form5,
          form6: values.form6,
          form7: values.form7,
          form8: values.form8,
          form9: values.form9,
          form10: values.form10,
          form12: values.form12,
          form13: values.form13,
          updatedAt: now,
        },
      })
      .returning();

    return toSupervisionRecord(result[0]);
  } catch (error) {
    console.error('Database query failed (upsertSupervisionRecord):', error);
    throw new Error('Gagal menyimpan data supervisi ke database.', {
      cause: error,
    });
  }
}

export async function deleteSupervisionById(id: string): Promise<void> {
  try {
    await db.delete(supervisions).where(eq(supervisions.id, id));
  } catch (error) {
    console.error('Database query failed (deleteSupervisionById):', error);
    throw new Error('Gagal menghapus data supervisi dari database.', {
      cause: error,
    });
  }
}
