import { getToken, clearAuth } from '@/lib/authStorage';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 402) {
    // Assinatura inativa — o middleware `auth` barra qualquer rota fora de
    // /cobranca e /logout nesse caso. Avisa a UI pra redirecionar a empresa
    // pra tela de cobrança em vez de deixar a página quebrada.
    window.dispatchEvent(new CustomEvent('assinatura-inativa', { detail: { status_assinatura: data.status_assinatura } }));
  }

  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'Erro inesperado. Tente novamente.');
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
