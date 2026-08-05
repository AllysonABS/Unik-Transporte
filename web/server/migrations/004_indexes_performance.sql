-- Migration 004: Índices de performance
-- Sem esses índices, as subqueries correlacionadas de etapas/fotos fazem
-- full table scan para cada pedido retornado, causando lentidão grave.

-- Pedidos: filtros principais
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_empresa_id
  ON pedidos(empresa_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_despachante_id
  ON pedidos(despachante_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_criado_em
  ON pedidos(criado_em DESC);

-- Etapas: lookup por pedido (subquery no SELECT)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedido_etapas_pedido_id
  ON pedido_etapas(pedido_id);

-- Fotos: lookup por pedido (subquery no SELECT)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedido_fotos_pedido_id
  ON pedido_fotos(pedido_id);

-- Cliente-empresa: lookup por empresa (listagem de clientes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cliente_empresa_empresa_id
  ON cliente_empresa(empresa_id);

-- Despachante-empresa: lookup por empresa
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_despachante_empresa_empresa_id
  ON despachante_empresa(empresa_id);

-- Notificações: lookup por empresa
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notificacoes_empresa_id
  ON notificacoes(empresa_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notificacoes_empresa_lida
  ON notificacoes(empresa_id, lida);

-- FCM tokens
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_empresa_fcm_tokens_empresa_id
  ON empresa_fcm_tokens(empresa_id);
