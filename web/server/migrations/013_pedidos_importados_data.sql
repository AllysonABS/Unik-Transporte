-- Data do pedido (do Bling, campo "data" do pedido de venda) — necessária
-- pro filtro por mês na tela de Pedidos importados.
ALTER TABLE pedidos_importados ADD COLUMN IF NOT EXISTS data_pedido DATE;
CREATE INDEX IF NOT EXISTS idx_pedidos_importados_data ON pedidos_importados(empresa_id, data_pedido);
