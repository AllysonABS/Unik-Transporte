import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { atualizarEntregadorAdmin } from '@/services/admin';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { maskCpf, maskTelefone } from '@/lib/mask';
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
import type { EntregadorAdmin } from '@/types/admin';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregador: EntregadorAdmin | null;
}

export default function EntregadorFormDialog({ open, onOpenChange, entregador }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<EntregadorAdmin>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open && entregador) {
      setForm(entregador);
      setServerError(null);
    }
  }, [open, entregador]);

  function update<K extends keyof EntregadorAdmin>(key: K, value: EntregadorAdmin[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: () => atualizarEntregadorAdmin(entregador!.id, form),
    onSuccess: () => {
      toast.success('Entregador atualizado.');
      queryClient.invalidateQueries({ queryKey: ['admin-entregadores'] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao salvar entregador.');
    },
  });

  if (!entregador) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-clareza">Editar entregador</DialogTitle>
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
            <label className="block text-sm font-medium text-clareza mb-1.5">Nome</label>
            <Input value={form.nome ?? ''} onChange={e => update('nome', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">CPF</label>
              <Input value={form.cpf ?? ''} onChange={e => update('cpf', maskCpf(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Telefone</label>
              <Input value={form.telefone ?? ''} onChange={e => update('telefone', maskTelefone(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-clareza mb-1.5">Conta ativa</label>
            <Select value={form.ativo ? 'sim' : 'nao'} onValueChange={v => update('ativo', v === 'sim')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
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
