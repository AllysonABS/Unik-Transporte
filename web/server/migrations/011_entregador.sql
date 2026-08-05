-- "Despachante" confundia com despachante de documento/veículo. Renomeado
-- pra "entregador" — mais claro pra quem nunca usou o sistema.
ALTER TABLE despachantes RENAME TO entregadores;
ALTER TABLE despachante_empresa RENAME TO entregador_empresa;
ALTER TABLE entregador_empresa RENAME COLUMN despachante_id TO entregador_id;
ALTER TABLE pedidos RENAME COLUMN despachante_id TO entregador_id;
ALTER TABLE pedidos RENAME COLUMN despachante_nome TO entregador_nome;

-- recuperacao_senha.tipo_check nunca foi atualizado quando o tipo de conta
-- "cliente" foi removido do sistema — a constraint atual (cliente/empresa/despachante)
-- nem sequer permite tipo='entregador', o que quebraria a recuperação de senha
-- do app. Ajustando para os únicos dois tipos de conta que existem hoje.
UPDATE recuperacao_senha SET tipo = 'entregador' WHERE tipo = 'despachante';
DELETE FROM recuperacao_senha WHERE tipo = 'cliente';
ALTER TABLE recuperacao_senha DROP CONSTRAINT IF EXISTS recuperacao_senha_tipo_check;
ALTER TABLE recuperacao_senha ADD CONSTRAINT recuperacao_senha_tipo_check
  CHECK (tipo IN ('empresa', 'entregador'));
