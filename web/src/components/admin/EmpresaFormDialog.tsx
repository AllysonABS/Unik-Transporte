import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { atualizarEmpresaAdmin, criarEmpresaAdmin } from '@/services/admin';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { maskCnpj, maskCpf, maskTelefone } from '@/lib/mask';
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
import type { EmpresaAdmin } from '@/types/admin';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // null = criando uma empresa nova; um EmpresaAdmin = editando essa empresa.
  empresa: EmpresaAdmin | null;
  modo: 'criar' | 'editar';
}

type FormState = Partial<EmpresaAdmin> & { senha?: string };

const FORM_VAZIO: FormState = {
  status_assinatura: 'ativa',
  ativa: true,
  plano: 'Cortesia',
  valor_plano: 0,
};

export default function EmpresaFormDialog({ open, onOpenChange, empresa, modo }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (empresa) {
      setForm({
        ...empresa,
        data_vencimento: empresa.data_vencimento ? empresa.data_vencimento.slice(0, 10) : '',
      });
    } else {
      setForm(FORM_VAZIO);
    }
    setServerError(null);
  }, [open, empresa]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: () => (modo === 'criar' ? criarEmpresaAdmin(form as FormState & { senha: string }) : atualizarEmpresaAdmin(empresa!.id, form)),
    onSuccess: () => {
      toast.success(modo === 'criar' ? 'Empresa criada — já com acesso liberado, sem cartão.' : 'Empresa atualizada.');
      queryClient.invalidateQueries({ queryKey: ['admin-empresas'] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao salvar empresa.');
    },
  });

  if (modo === 'editar' && !empresa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-clareza">{modo === 'criar' ? 'Criar empresa' : 'Editar empresa'}</DialogTitle>
        </DialogHeader>
        {modo === 'criar' && (
          <p className="text-xs text-gray -mt-2">
            Cria a empresa já com acesso liberado (status "Ativa"), sem passar pelo cartão de crédito — pra clientes
            que a gente decide não cobrar por enquanto. Cobrança pode ser configurada depois, se precisar.
          </p>
        )}
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            setServerError(null);
            mutation.mutate();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-clareza mb-1.5">Nome da empresa</label>
            <Input value={form.nome_empresa ?? ''} onChange={e => update('nome_empresa', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">CNPJ</label>
              <Input value={form.cnpj ?? ''} onChange={e => update('cnpj', maskCnpj(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">CPF</label>
              <Input value={form.cpf ?? ''} onChange={e => update('cpf', maskCpf(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Responsável</label>
              <Input value={form.nome_responsavel ?? ''} onChange={e => update('nome_responsavel', e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-gray -mt-2">Preencha pelo menos um dos dois (CNPJ ou CPF).</p>
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
          {modo === 'criar' && (
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Senha de acesso</label>
              <Input
                type="text"
                placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 número"
                value={form.senha ?? ''}
                onChange={e => update('senha', e.target.value)}
              />
              <p className="text-xs text-gray mt-1">Combine com o cliente e passe essa senha pra ele — dá pra trocar depois pela conta dele.</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-clareza mb-1.5">Endereço</label>
              <Input value={form.endereco ?? ''} onChange={e => update('endereco', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Número</label>
              <Input value={form.numero ?? ''} onChange={e => update('numero', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Bairro</label>
              <Input value={form.bairro ?? ''} onChange={e => update('bairro', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Cidade</label>
              <Input value={form.cidade ?? ''} onChange={e => update('cidade', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">UF</label>
              <Input maxLength={2} value={form.estado ?? ''} onChange={e => update('estado', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Plano</label>
              <Input value={form.plano ?? ''} onChange={e => update('plano', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Valor do plano</label>
              <Input
                type="number"
                step="0.01"
                value={form.valor_plano ?? ''}
                onChange={e => update('valor_plano', parseFloat(e.target.value))}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-clareza mb-1.5">Status da assinatura</label>
              <Select
                value={form.status_assinatura ?? 'ativa'}
                onValueChange={v => update('status_assinatura', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {modo === 'editar' && (
              <div>
                <label className="block text-sm font-medium text-clareza mb-1.5">Empresa ativa (login)</label>
                <Select
                  value={form.ativa ? 'sim' : 'nao'}
                  onValueChange={v => update('ativa', v === 'sim')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : modo === 'criar' ? 'Criar empresa' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
