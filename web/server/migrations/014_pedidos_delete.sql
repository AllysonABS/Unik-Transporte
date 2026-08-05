-- Empresa passa a poder excluir um pedido manual (ex.: criado por engano).
-- pedido_etapas/pedido_fotos já removem em cascata. pedidos_importados
-- referenciava pedidos sem ON DELETE definido (= RESTRICT), o que bloquearia
-- a exclusão de qualquer pedido nascido de uma importação — troca pra
-- SET NULL, mantendo o histórico da importação mesmo sem o pedido.
ALTER TABLE pedidos_importados DROP CONSTRAINT IF EXISTS pedidos_importados_pedido_id_fkey;
ALTER TABLE pedidos_importados ADD CONSTRAINT pedidos_importados_pedido_id_fkey
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL;
