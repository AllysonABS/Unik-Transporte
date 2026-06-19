-- Adiciona numero e bairro na tabela de empresas
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS numero VARCHAR(10),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(80);

-- Adiciona numero e bairro na tabela de clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS numero VARCHAR(10),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(80);

-- Adiciona numero e bairro na tabela de vínculos cliente-empresa
ALTER TABLE cliente_empresa
  ADD COLUMN IF NOT EXISTS numero VARCHAR(10),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(80);
