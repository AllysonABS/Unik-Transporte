import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { atualizarClienteAdmin } from '@/services/admin';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { maskCpf, maskCnpj, maskTelefone } from '@/lib/mask';
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
import type { ClienteAdmin } from '@/types/admin';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: ClienteAdmin | null;
}

export default function ClienteFormDialog({ open, onOpenChange, cliente }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<ClienteAdmin>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open && cliente) {
      setForm(cliente);
      setServerError(null);
    }
  }, [open, cliente]);

  function update<K extends keyof ClienteAdmin>(key: K, value: ClienteAdmin[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: () => atualizarClienteAdmin(cliente!.id, form),
    onSuccess: () => {
      toast.success('Cliente atualizado.');
      queryClient.invalidateQueries({ queryKey: ['admin-clientes'] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao salvar cliente.');
    },
  });

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-clareza">Editar cliente</DialogTitle>
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
              <label className="block text-sm font-medium text-clareza mb-1.5">CNPJ</label>
              <Input value={form.cnpj ?? ''} onChange={e => update('cnpj', maskCnpj(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">E-mail</label>
              <Input type="email" value={form.email ?? ''} onChange={e => update('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Telefone</label>
              <Input value={form.telefone ?? ''} onChange={e => update('telefone', maskTelefone(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Cidade</label>
              <Input value={form.cidade ?? ''} onChange={e => update('cidade', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">UF</label>
              <Input maxLength={2} value={form.estado ?? ''} onChange={e => update('estado', e.target.value)} />
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
