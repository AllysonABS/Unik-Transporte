-- Situação do pedido dentro do próprio Bling (Em aberto, Atendido,
-- Cancelado etc.) — separada do nosso status interno de fila (pendente,
-- finalizado, ignorado). Guarda o id bruto do Bling e o nome já resolvido
-- (ver SITUACOES_PEDIDO_VENDA_BLING em bling.ts), pra filtrar/exibir na
-- tela sem precisar decodificar o id toda vez.
ALTER TABLE pedidos_importados ADD COLUMN IF NOT EXISTS situacao_bling_id INT;
ALTER TABLE pedidos_importados ADD COLUMN IF NOT EXISTS situacao_bling_nome TEXT;
CREATE INDEX IF NOT EXISTS idx_pedidos_importados_situacao_bling ON pedidos_importados(empresa_id, situacao_bling_id);

-- Backfill dos pedidos importados antes dessa coluna existir — o id da
-- situação já estava salvo dentro de dados_brutos, então dá pra preencher
-- sem precisar buscar de novo no Bling. Os nomes cobrem só os ids padrão
-- (não-customizados) — o resto fica NULL e é preenchido no próximo ciclo
-- de sincronização, que já resolve pelo código em bling.ts.
UPDATE pedidos_importados
SET situacao_bling_id = (dados_brutos->'situacao'->>'id')::int
WHERE situacao_bling_id IS NULL AND dados_brutos->'situacao'->>'id' IS NOT NULL;

UPDATE pedidos_importados SET situacao_bling_nome = CASE situacao_bling_id
  WHEN 6 THEN 'Em aberto'
  WHEN 9 THEN 'Atendido'
  WHEN 12 THEN 'Cancelado'
  WHEN 15 THEN 'Em andamento'
  WHEN 18 THEN 'Venda agenciada'
  WHEN 21 THEN 'Em digitação'
  WHEN 24 THEN 'Verificado'
  ELSE NULL
END
WHERE situacao_bling_nome IS NULL AND situacao_bling_id IS NOT NULL;
