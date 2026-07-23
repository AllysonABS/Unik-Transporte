import type { AdminData } from '@/types/admin';

const TOKEN_KEY = 'narota_admin_token';
const ADMIN_KEY = 'narota_admin_data';

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredAdmin(): AdminData | null {
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminData;
  } catch {
    return null;
  }
}

export function setAdminAuth(token: string, admin: AdminData) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearAdminAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}
