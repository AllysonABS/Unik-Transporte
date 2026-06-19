import { api } from '@/lib/apiClient';

export function solicitarRecuperacao(doc: string) {
  return api.post<{ success: boolean; message: string; email_hint?: string }>(
    '/api/recuperar-senha/solicitar',
    { doc },
  );
}

export function verificarCodigoRecuperacao(doc: string, codigo: string) {
  return api.post<{ success: boolean; reset_token: string }>('/api/recuperar-senha/verificar', {
    doc,
    codigo,
  });
}

export function redefinirSenha(resetToken: string, novaSenha: string) {
  return api.post<{ success: boolean }>('/api/recuperar-senha/redefinir', {
    reset_token: resetToken,
    nova_senha: novaSenha,
  });
}
