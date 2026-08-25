import type { PedidoStatus } from '@/types/empresa';

// Cores das pills de status (StatusBadge). Fundo claro + texto escuro
// legível — antes era o inverso (fundo escuro sólido + texto pastel claro),
// pensado pro tema escuro antigo; no fundo branco isso lia mal (chip escuro
// destoando do resto, e em "aguardando" o amarelo pastel quase sumia).
export const STATUS_CONFIG: Record<PedidoStatus, { label: string; color: string; bg: string }> = {
  aguardando: { label: 'Aguardando', color: '#B45309', bg: '#FEF3C7' },
  em_transito: { label: 'Em trânsito', color: '#0E7490', bg: '#DBEAFE' },
  entregue: { label: 'Entregue', color: '#059669', bg: '#D1FAE5' },
  cancelado: { label: 'Cancelado', color: '#DC2626', bg: '#FEE2E2' },
};

// O banco retorna timestamps sem indicador de timezone (armazenados em UTC).
// Forçamos a interpretação como UTC e exibimos sempre no fuso do Brasil,
// independente do fuso configurado na máquina de quem está vendo a tela.
function parseUTC(iso: string): Date {
  const d = iso.includes('Z') || iso.includes('+') ? iso : iso.replace(' ', 'T') + 'Z';
  return new Date(d);
}

export function formatHora(iso: string | null): string {
  if (!iso) return '';
  return parseUTC(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

export function formatData(iso: string | null | undefined): string {
  if (!iso) return '—';
  return parseUTC(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return parseUTC(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
}

export function formatRelativo(iso: string): string {
  const diffMs = Date.now() - parseUTC(iso).getTime();
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias}d`;
  return formatData(iso);
}
