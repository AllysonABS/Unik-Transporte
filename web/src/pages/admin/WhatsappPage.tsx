import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageCircle, Smartphone, Power } from 'lucide-react';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import {
  buscarStatusWhatsapp,
  criarInstanciaWhatsapp,
  conectarWhatsapp,
  desconectarWhatsapp,
} from '@/services/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/apiClient';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  connected: { label: 'Conectado', className: 'bg-success/10 text-success hover:bg-success/10' },
  connecting: { label: 'Conectando...', className: 'bg-warning/10 text-warning hover:bg-warning/10' },
  disconnected: { label: 'Desconectado', className: 'bg-destructive/10 text-destructive hover:bg-destructive/10' },
};

function qrSrc(qrcode: string) {
  return qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`;
}

export default function AdminWhatsappPage() {
  useSetPageHeader('WhatsApp', 'Conecte o número da plataforma para notificar clientes na entrega');
  const queryClient = useQueryClient();
  const [instanceName, setInstanceName] = useState('na-rota');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-whatsapp-status'],
    queryFn: buscarStatusWhatsapp,
    refetchInterval: query => (query.state.data?.config?.status === 'connecting' ? 3000 : false),
  });

  const config = data?.config ?? null;

  const criarMutation = useMutation({
    mutationFn: () => criarInstanciaWhatsapp(instanceName),
    onSuccess: () => {
      toast.success('Instância criada.');
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-status'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao criar instância.');
    },
  });

  const conectarMutation = useMutation({
    mutationFn: () => conectarWhatsapp(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-status'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao conectar.');
    },
  });

  const desconectarMutation = useMutation({
    mutationFn: () => desconectarWhatsapp(),
    onSuccess: () => {
      toast.success('WhatsApp desconectado.');
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-status'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao desconectar.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl">
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-pulso/10">
            <MessageCircle className="h-5 w-5 text-pulso" />
          </div>
          <div>
            <p className="font-semibold text-clareza">Nenhuma instância configurada</p>
            <p className="text-sm text-gray">Crie a instância para conectar o WhatsApp da plataforma</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-clareza mb-1.5">Nome da instância</label>
          <Input value={instanceName} onChange={e => setInstanceName(e.target.value)} />
        </div>
        <Button onClick={() => criarMutation.mutate()} disabled={criarMutation.isPending || !instanceName.trim()}>
          {criarMutation.isPending ? 'Criando...' : 'Criar instância'}
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_LABEL[config.status] ?? { label: config.status, className: '' };

  return (
    <div className="max-w-md rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-pulso/10">
            <Smartphone className="h-5 w-5 text-pulso" />
          </div>
          <div>
            <p className="font-semibold text-clareza">{config.instance_name}</p>
            {config.profile_name && <p className="text-sm text-gray">{config.profile_name}</p>}
            {config.numero_conectado && <p className="text-xs text-gray">+{config.numero_conectado}</p>}
          </div>
        </div>
        <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
      </div>

      {config.status === 'connected' ? (
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={() => desconectarMutation.mutate()}
          disabled={desconectarMutation.isPending}
        >
          <Power className="h-4 w-4" />
          {desconectarMutation.isPending ? 'Desconectando...' : 'Desconectar'}
        </Button>
      ) : (
        <div className="space-y-4">
          {config.qrcode ? (
            <div className="flex flex-col items-center gap-2">
              <img src={qrSrc(config.qrcode)} alt="QR Code do WhatsApp" className="h-56 w-56 rounded-lg border border-border" />
              <p className="text-xs text-gray text-center">
                Abra o WhatsApp no celular do número da plataforma → Aparelhos conectados → Conectar um aparelho
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray">Clique em conectar para gerar o QR Code.</p>
          )}
          <Button className="w-full" onClick={() => conectarMutation.mutate()} disabled={conectarMutation.isPending}>
            {conectarMutation.isPending ? 'Gerando QR Code...' : 'Conectar'}
          </Button>
        </div>
      )}
    </div>
  );
}
