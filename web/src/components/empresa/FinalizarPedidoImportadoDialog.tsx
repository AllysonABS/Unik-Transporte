import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { listarEntregadores } from '@/services/entregadores';
import { listarExcursoes } from '@/services/excursoes';
import { finalizarPedidoImportado, ignorarPedidoImportado, type PedidoImportado } from '@/services/pedidosImportados';
import { maskTelefone } from '@/lib/mask';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import SearchSelect from '@/components/ui/search-select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

function criarSchema(precisaTelefone: boolean) {
  return z.object({
    entregador_id: z.string().min(1, 'Selecione o entregador'),
    excursao_id: z.string().min(1, 'Selecione a excursão'),
    volumes: z
      .string()
      .min(1, 'Informe ao menos 1 volume')
      .refine(v => Number.isInteger(Number(v)) && Number(v) >= 1, 'Informe ao menos 1 volume'),
    descricao: z.string().optional(),
    cliente_telefone: precisaTelefone
      ? z.string().min(14, 'Informe o telefone do cliente')
      : z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof criarSchema>>;

interface Props {
  pedido: PedidoImportado | null;
  onOpenChange: (open: boolean) => void;
}

export default function FinalizarPedidoImportadoDialog({ pedido, onOpenChange }: Props) {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const open = !!pedido;
  const precisaTelefone = open && !pedido?.cliente_telefone;
  const schema = useMemo(() => criarSchema(precisaTelefone), [precisaTelefone]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: pedido
      ? {
          entregador_id: '',
          excursao_id: '',
          volumes: String(pedido.volumes),
          descricao: '',
          cliente_telefone: '',
        }
      : undefined,
  });

  const { data: entregadoresData } = useQuery({
    queryKey: ['entregadores-picker', empresa?.id],
    queryFn: () => listarEntregadores(empresa!.id),
    enabled: open && !!empresa?.id,
  });
  const { data: excursoesData } = useQuery({
    queryKey: ['excursoes-picker', empresa?.id],
    queryFn: () => listarExcursoes(empresa!.id),
    enabled: open && !!empresa?.id,
  });

  const entregadores = entregadoresData?.entregadores ?? [];
  const excursoes = excursoesData?.excursoes ?? [];

  const finalizarMutation = useMutation({
    mutationFn: (values: FormValues) =>
      finalizarPedidoImportado(empresa!.id, pedido!.id, {
        entregador_id: values.entregador_id,
        excursao_id: values.excursao_id,
        volumes: Number(values.volumes),
        descricao: values.descricao,
        cliente_telefone: values.cliente_telefone ? values.cliente_telefone.replace(/\D/g, '') : undefined,
      }),
    onSuccess: () => {
      toast.success(`Pedido nº ${pedido!.numero_pedido} liberado pro entregador.`);
      queryClient.invalidateQueries({ queryKey: ['pedidos-importados', empresa?.id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos', empresa?.id] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao finalizar pedido.');
    },
  });

  const ignorarMutation = useMutation({
    mutationFn: () => ignorarPedidoImportado(empresa!.id, pedido!.id),
    onSuccess: () => {
      toast.success('Pedido ignorado.');
      queryClient.invalidateQueries({ queryKey: ['pedidos-importados', empresa?.id] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao ignorar pedido.');
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    finalizarMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onOpenChange(false)}>
      <DialogContent className="bg-card border-border" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-clareza">
            Finalizar pedido nº {pedido?.numero_pedido}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-background/40 p-3 text-sm space-y-1">
          <p><span className="text-gray">Cliente:</span> <span className="text-clareza font-medium">{pedido?.cliente_nome}</span></p>
        </div>

        {precisaTelefone && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>Esse cliente não tem telefone cadastrado. Sem ele, não dá pra avisar por WhatsApp quando o pedido for entregue — informe abaixo antes de continuar.</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {precisaTelefone && (
              <FormField
                control={form.control}
                name="cliente_telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone do cliente</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        {...field}
                        onChange={e => field.onChange(maskTelefone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="entregador_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entregador</FormLabel>
                  <FormControl>
                    <SearchSelect
                      placeholder="Buscar entregador"
                      value={field.value}
                      onChange={field.onChange}
                      items={entregadores.map(d => ({ id: d.id, label: d.nome, sublabel: d.telefone }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="excursao_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Excursão</FormLabel>
                  <FormControl>
                    <SearchSelect
                      placeholder="Buscar excursão"
                      value={field.value}
                      onChange={field.onChange}
                      items={excursoes.map(e => ({ id: e.id, label: e.nome, sublabel: `${e.setor} · Vaga ${e.vaga}` }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="volumes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Volumes</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={ignorarMutation.isPending || finalizarMutation.isPending}
                onClick={() => ignorarMutation.mutate()}
              >
                Ignorar pedido
              </Button>
              <Button type="submit" disabled={finalizarMutation.isPending}>
                {finalizarMutation.isPending ? 'Enviando...' : 'Enviar pro entregador'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
