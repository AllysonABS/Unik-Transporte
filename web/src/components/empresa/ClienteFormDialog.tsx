import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { cadastrarClienteManual, atualizarVinculoCliente } from '@/services/clientes';
import { buscarCep } from '@/lib/cep';
import { maskCpf, maskCnpj, maskTelefone, maskCep } from '@/lib/mask';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { ClienteVinculo } from '@/types/empresa';

const schema = z
  .object({
    nome: z.string().min(1, 'Informe o nome'),
    cpf: z.string().optional(),
    cnpj: z.string().optional(),
    rg: z.string().optional(),
    telefone: z.string().min(1, 'Informe o telefone'),
    email: z.string().optional(),
    data_nascimento: z.string().optional(),
    cep: z.string().optional(),
    endereco: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    observacoes: z.string().optional(),
  })
  .refine(data => !!data.cpf || !!data.cnpj, {
    message: 'Informe ao menos CPF ou CNPJ',
    path: ['cpf'],
  });

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  nome: '',
  cpf: '',
  cnpj: '',
  rg: '',
  telefone: '',
  email: '',
  data_nascimento: '',
  cep: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  observacoes: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: ClienteVinculo | null;
}

export default function ClienteFormDialog({ open, onOpenChange, cliente }: Props) {
  const { empresa } = useEmpresaAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!cliente;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(cliente ? { ...emptyValues, ...cliente } : emptyValues);
      setServerError(null);
    }
  }, [open, cliente, form]);

  async function handleCepBlur(cep: string) {
    const resultado = await buscarCep(cep);
    if (resultado) {
      form.setValue('endereco', resultado.logradouro);
      form.setValue('bairro', resultado.bairro);
      form.setValue('cidade', resultado.cidade);
      form.setValue('estado', resultado.estado);
    }
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit
        ? atualizarVinculoCliente(cliente!.vinculo_id, values)
        : cadastrarClienteManual(empresa!.id, values),
    onSuccess: () => {
      toast.success(isEdit ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      queryClient.invalidateQueries({ queryKey: ['clientes', empresa?.id] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao salvar cliente.');
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    mutation.mutate({
      ...values,
      cpf: values.cpf ? values.cpf.replace(/\D/g, '') : values.cpf,
      cnpj: values.cnpj ? values.cnpj.replace(/\D/g, '') : values.cnpj,
      telefone: values.telefone.replace(/\D/g, ''),
      cep: values.cep ? values.cep.replace(/\D/g, '') : values.cep,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-clareza">
            {isEdit ? 'Editar cliente' : 'Novo cliente'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={e => field.onChange(maskCpf(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={e => field.onChange(maskCnpj(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RG</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={e => field.onChange(maskTelefone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="cep"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={e => field.onChange(maskCep(e.target.value))}
                      onBlur={e => {
                        field.onBlur();
                        handleCepBlur(e.target.value);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <FormControl>
                      <Input maxLength={2} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
