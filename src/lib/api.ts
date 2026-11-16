import { auth } from './firebase';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError('Sesi autentikasi belum aktif.', 401);
  }
  const token = await user.getIdToken();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let msg = `Permintaan gagal (${res.status})`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody?.error) {
        msg = errBody.error;
      }
    } catch {
      // Ignore non-JSON error body
    }
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as T;
}
