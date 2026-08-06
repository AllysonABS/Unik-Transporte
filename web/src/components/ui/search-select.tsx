import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchSelectItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  items: SearchSelectItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  emptyLabel?: string;
  disabled?: boolean;
}

// Combobox com busca por digitação, pra usar no lugar de um <Select> comum
// quando a lista tem itens demais pra rolar de uma vez (ex.: entregador,
// excursão). Filtra os itens já carregados — não busca no servidor (ver
// ClientePicker pra esse caso, quando a lista pode ter milhares de itens).
export default function SearchSelect({ items, value, onChange, placeholder, emptyLabel, disabled }: Props) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selecionado = useMemo(() => items.find(i => i.id === value) ?? null, [items, value]);

  const filtrados = useMemo(() => {
    const t = termo.trim().toLowerCase();
    if (!t) return items;
    return items.filter(i => i.label.toLowerCase().includes(t) || i.sublabel?.toLowerCase().includes(t));
  }, [items, termo]);

  useEffect(() => {
    function fecharAoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', fecharAoClicarFora);
    return () => document.removeEventListener('mousedown', fecharAoClicarFora);
  }, []);

  function selecionar(item: SearchSelectItem) {
    onChange(item.id);
    setTermo('');
    setAberto(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {selecionado && !aberto ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAberto(true)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate text-left text-clareza">
            {selecionado.label}
            {selecionado.sublabel && <span className="text-gray"> · {selecionado.sublabel}</span>}
          </span>
          <X
            className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={e => {
              e.stopPropagation();
              onChange('');
            }}
          />
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={placeholder}
            value={termo}
            disabled={disabled}
            onFocus={() => setAberto(true)}
            onChange={e => setTermo(e.target.value)}
          />
        </div>
      )}

      {aberto && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {filtrados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray">
              {items.length === 0 ? (emptyLabel ?? 'Nada cadastrado ainda.') : 'Nenhum resultado encontrado.'}
            </p>
          ) : (
            filtrados.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => selecionar(item)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate text-clareza">{item.label}</span>
                {item.sublabel && <span className="shrink-0 text-xs text-gray">{item.sublabel}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
