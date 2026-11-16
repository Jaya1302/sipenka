import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app =
  getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const BOOTSTRAP_ADMIN_EMAIL = 'sumpena.jaya@gmail.com';
export const INTERNAL_USERNAME_DOMAIN = 'smkn13.local';

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._@-]/g, '');
}

export function usernameToAuthEmail(username: string): string {
  const clean = normalizeUsername(username);
  const atParts = clean.split('@');
  if (
    atParts.length === 2 &&
    atParts[0].length > 0 &&
    !atParts[0].startsWith('.') &&
    !atParts[0].endsWith('.') &&
    !atParts[0].includes('..') &&
    atParts[1].includes('.') &&
    !atParts[1].startsWith('.') &&
    !atParts[1].endsWith('.') &&
    !atParts[1].includes('..')
  ) {
    return clean;
  }
  const encodedLocal =
    clean.replace(/@/g, '_at_').replace(/^\.+|\.+$/g, '') || 'user';
  return `${encodedLocal}@${INTERNAL_USERNAME_DOMAIN}`;
}

export function getSecondaryAuth() {
  const secondaryApp =
    getApps().find((a) => a.name === 'admin-provisioning') ??
    initializeApp(firebaseConfig, 'admin-provisioning');
  return getAuth(secondaryApp);
}
