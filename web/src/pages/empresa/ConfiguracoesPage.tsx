import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { buscarEmpresa, atualizarEmpresa } from '@/services/empresaPerfil';
import { buscarCep } from '@/lib/cep';
import { ApiError } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const schema = z.object({
  nome_empresa: z.string().min(1, 'Informe o nome da empresa'),
  telefone: z.string().min(1, 'Informe o telefone'),
  email: z.string().email('E-mail inválido'),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  horario_funcionamento: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ConfiguracoesPage() {
  const { empresa, updateEmpresa } = useEmpresaAuth();
  useSetPageHeader('Configurações', 'Dados e preferências da empresa');
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['empresa-perfil', empresa?.id],
    queryFn: () => buscarEmpresa(empresa!.id),
    enabled: !!empresa?.id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome_empresa: '',
      telefone: '',
      email: '',
      cep: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      horario_funcionamento: '',
    },
  });

  useEffect(() => {
    if (data?.empresa) {
      form.reset({
        nome_empresa: data.empresa.nome_empresa,
        telefone: data.empresa.telefone,
        email: data.empresa.email,
        cep: data.empresa.cep ?? '',
        endereco: data.empresa.endereco ?? '',
        numero: data.empresa.numero ?? '',
        bairro: data.empresa.bairro ?? '',
        cidade: data.empresa.cidade ?? '',
        estado: data.empresa.estado ?? '',
        horario_funcionamento: data.empresa.horario_funcionamento ?? '',
      });
    }
  }, [data, form]);

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
    mutationFn: (values: FormValues) => atualizarEmpresa(empresa!.id, values),
    onSuccess: (_res, values) => {
      toast.success('Dados atualizados.');
      updateEmpresa(values);
      queryClient.invalidateQueries({ queryKey: ['empresa-perfil', empresa?.id] });
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    mutation.mutate(values);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-clareza text-base">Dados da empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="nome_empresa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da empresa</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={data?.empresa.cnpj ?? ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input value={data?.empresa.nome_responsavel ?? ''} disabled />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-clareza text-base">Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
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
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-clareza text-base">Funcionamento</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="horario_funcionamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de funcionamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Seg-Sex: 07:00-18:00 | Sáb: 07:00-12:00" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
