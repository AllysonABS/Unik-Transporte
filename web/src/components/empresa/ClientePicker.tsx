import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { listarClientesEmpresa } from '@/services/clientes';
import type { ClienteVinculo } from '@/types/empresa';

const LIMITE_RESULTADOS = 20;

interface Props {
  empresaId: string;
  value: ClienteVinculo | null;
  onChange: (cliente: ClienteVinculo | null) => void;
  disabled?: boolean;
}

// Campo de cliente com busca no servidor, em vez de um <select> com todos os
// clientes carregados de uma vez — com base de milhares de clientes isso
// trava o navegador e não escala. Digitar dispara a busca (debounced); sem
// digitar nada, mostra os clientes vinculados mais recentemente.
export default function ClientePicker({ empresaId, value, onChange, disabled }: Props) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [termoDebounced, setTermoDebounced] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setTermoDebounced(termo.trim()), 300);
    return () => clearTimeout(timer);
  }, [termo]);

  const { data, isFetching } = useQuery({
    queryKey: ['clientes-busca', empresaId, termoDebounced],
    queryFn: () => listarClientesEmpresa(empresaId, termoDebounced, LIMITE_RESULTADOS),
    enabled: aberto && !!empresaId,
  });
  const resultados = data?.clientes ?? [];

  useEffect(() => {
    function fecharAoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', fecharAoClicarFora);
    return () => document.removeEventListener('mousedown', fecharAoClicarFora);
  }, []);

  function selecionar(cliente: ClienteVinculo) {
    onChange(cliente);
    setTermo('');
    setAberto(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {value && !aberto ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAberto(true)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate text-left text-clareza">
            {value.nome}
            {value.telefone && <span className="text-gray"> · {value.telefone}</span>}
          </span>
          <X
            className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={e => {
              e.stopPropagation();
              onChange(null);
            }}
          />
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Buscar cliente por nome, telefone ou CPF/CNPJ"
            value={termo}
            disabled={disabled}
            autoFocus={aberto}
            onFocus={() => setAberto(true)}
            onChange={e => setTermo(e.target.value)}
          />
        </div>
      )}

      {aberto && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {isFetching ? (
            <p className="px-3 py-2 text-sm text-gray">Buscando...</p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray">
              {termoDebounced ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
            </p>
          ) : (
            <>
              {!termoDebounced && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray">
                  Vinculados recentemente
                </p>
              )}
              {resultados.map(c => (
                <button
                  key={c.vinculo_id}
                  type="button"
                  onClick={() => selecionar(c)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate text-clareza">{c.nome}</span>
                  {c.telefone && <span className="shrink-0 text-xs text-gray">{c.telefone}</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
