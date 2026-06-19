-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'geral',
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  dados JSONB DEFAULT '{}',
  lida BOOLEAN DEFAULT false,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa ON notificacoes(empresa_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_nao_lidas ON notificacoes(empresa_id) WHERE lida = false;

-- Tabela de tokens FCM das empresas
CREATE TABLE IF NOT EXISTS empresa_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  atualizado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(empresa_id, token)
);
