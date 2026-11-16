# Security Specification — Instrumen Supervisi Akademik SMKN 13 Bandung

## 1. Data Invariants
1. **Identity Integrity**: No user may create a `/users/{uid}` document with `uid != request.auth.uid`.
2. **No Self-Assigned Admin Role**: A non-admin user creating their own `/users/{uid}` profile MUST have `role == 'guru'` unless a trusted `/role_assignments/{emailKey}` document explicitly grants `'admin'` or their email matches the verified bootstrap admin (`sumpena.jaya@gmail.com` with `email_verified == true`).
3. **Immutable Ownership & Timestamps**: `createdAt` and `createdByUid` are immutable after document creation. All `createdAt`/`updatedAt` timestamps must equal `request.time`.
4. **PII Isolation**: Only the profile owner (`uid == request.auth.uid`) or an `isAdmin()` may `get` a user profile; only `isAdmin()` may `list` `/users`.
5. **Terminal State Locking**: Once a supervision record reaches `status == 'finalized'`, only `isAdmin()` may modify or re-open it. Guru users cannot alter finalized records.
6. **Role-Scoped Field Updates**: Non-admin Guru users may only update their own reflection and planning fields (`form1`, `form2`, `form6`, identity metadata, `updatedAt`) on non-finalized supervisions assigned to them; they can NEVER modify `form9` scores, `totalNilai`, `kategori`, or `status`.
7. **Strict Key & Size Boundaries**: All document creations enforce `hasAll` and `hasOnly`, all document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and every string and list enforces upper bounds to prevent Denial of Wallet attacks.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Privilege Escalation (User Create)**: Non-admin sets `role: "admin"` when creating `/users/{uid}`. -> `PERMISSION_DENIED`
2. **Ghost Field Injection (Shadow Update)**: Client appends `isSuperAdmin: true` on supervision create/update. -> `PERMISSION_DENIED`
3. **Identity Spoofing (Creator UID Mismatch)**: Guru creates supervision with `createdByUid: "other-uid"`. -> `PERMISSION_DENIED`
4. **Email Spoofing Without Verification**: Auth token has `email: "sumpena.jaya@gmail.com"` but `email_verified: false`. -> `PERMISSION_DENIED`
5. **Score Tampering by Guru**: Guru attempts `updateDoc` on `form9` or `totalNilai: 100` on their own supervision. -> `PERMISSION_DENIED`
6. **Terminal State Bypass**: Guru attempts to edit `form6` after supervision `status == "finalized"`. -> `PERMISSION_DENIED`
7. **Blanket User PII Scraping**: Guru calls `getDocs(collection(db, 'users'))`. -> `PERMISSION_DENIED`
8. **Cross-Teacher Supervision Read**: Guru A tries to read Guru B's supervision record (`teacherEmail != auth.email`). -> `PERMISSION_DENIED`
9. **Resource Poisoning (1MB ID)**: Client attempts write to `/supervisions/<2000-char-id>`. -> `PERMISSION_DENIED`
10. **Timestamp Spoofing**: Client sets `createdAt: Timestamp.fromDate(new Date('2020-01-01'))`. -> `PERMISSION_DENIED`
11. **Value Poisoning (Out-of-range score)**: Client sets `totalNilai: 999` or `totalNilai: "100"` (string). -> `PERMISSION_DENIED`
12. **Admin Registry Tampering**: Non-admin attempts to write to `/admins/{uid}` or `/role_assignments/{id}`. -> `PERMISSION_DENIED`
