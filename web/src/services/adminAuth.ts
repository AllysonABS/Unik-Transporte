import { adminApi } from '@/lib/adminApiClient';
import type { AdminData } from '@/types/admin';

interface LoginAdminResponse {
  success: boolean;
  token: string;
  admin: AdminData;
}

export function loginAdmin(email: string, senha: string) {
  return adminApi.post<LoginAdminResponse>('/api/login-admin', { email, senha });
}
