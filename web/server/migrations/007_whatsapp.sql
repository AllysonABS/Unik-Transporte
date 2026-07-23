-- Configuração da instância WhatsApp (uazapi) da plataforma
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id VARCHAR(255),
  instance_token VARCHAR(255),
  instance_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'disconnected',
  profile_name VARCHAR(255),
  numero_conectado VARCHAR(20),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Telefone do cliente denormalizado no pedido (necessário para notificar via WhatsApp
-- mesmo quando o cliente foi cadastrado manualmente pela empresa, sem conta no app)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_telefone VARCHAR(20);
