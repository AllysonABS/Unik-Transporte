-- Tokens FCM dos entregadores (app mobile) — mesmo padrão de
-- empresa_fcm_tokens (001_notificacoes.sql), um entregador pode ter mais de
-- um aparelho logado ao mesmo tempo.
CREATE TABLE IF NOT EXISTS entregador_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id UUID NOT NULL REFERENCES entregadores(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  atualizado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(entregador_id, token)
);

CREATE INDEX IF NOT EXISTS idx_entregador_fcm_tokens_entregador_id ON entregador_fcm_tokens(entregador_id);
