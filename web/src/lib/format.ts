import type { PedidoStatus } from '@/types/empresa';

export const STATUS_CONFIG: Record<PedidoStatus, { label: string; color: string; bg: string }> = {
  aguardando: { label: 'Aguardando', color: '#F59E0B', bg: '#451A03' },
  em_transito: { label: 'Em trânsito', color: '#00E676', bg: '#052E16' },
  entregue: { label: 'Entregue', color: '#86EFAC', bg: '#14532D' },
  cancelado: { label: 'Cancelado', color: '#FCA5A5', bg: '#7F1D1D' },
};

export function formatHora(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatData(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias}d`;
  return formatData(iso);
}
