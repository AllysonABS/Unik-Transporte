import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { atualizarAssinaturaAdmin } from '@/services/admin';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AssinaturaAdmin } from '@/types/admin';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assinatura: AssinaturaAdmin | null;
}

export default function AssinaturaFormDialog({ open, onOpenChange, assinatura }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<AssinaturaAdmin>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open && assinatura) {
      setForm({
        ...assinatura,
        data_vencimento: assinatura.data_vencimento ? assinatura.data_vencimento.slice(0, 10) : '',
      });
      setServerError(null);
    }
  }, [open, assinatura]);

  function update<K extends keyof AssinaturaAdmin>(key: K, value: AssinaturaAdmin[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: () => atualizarAssinaturaAdmin(assinatura!.id, form),
    onSuccess: () => {
      toast.success('Assinatura atualizada.');
      queryClient.invalidateQueries({ queryKey: ['admin-assinaturas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao salvar assinatura.');
    },
  });

  if (!assinatura) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-clareza">Editar assinatura — {assinatura.nome_empresa}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            setServerError(null);
            mutation.mutate();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-clareza mb-1.5">Status</label>
            <Select value={form.status ?? 'ativa'} onValueChange={v => update('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="suspensa">Suspensa</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Valor</label>
              <Input
                type="number"
                step="0.01"
                value={form.valor ?? ''}
                onChange={e => update('valor', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Vencimento</label>
              <Input
                type="date"
                value={form.data_vencimento ?? ''}
                onChange={e => update('data_vencimento', e.target.value)}
              />
            </div>
          </div>
          {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
