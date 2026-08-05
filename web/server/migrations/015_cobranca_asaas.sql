-- Cobrança recorrente via Asaas — cartão de crédito, sem período grátis.
-- status_assinatura passa a valer de verdade: 'ativa' libera acesso,
-- 'inadimplente'/'cancelada' (fora do período pago) bloqueia.
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cartao_final VARCHAR(4);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cartao_bandeira TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMP;

ALTER TABLE empresas DROP CONSTRAINT IF EXISTS empresas_status_assinatura_check;
ALTER TABLE empresas ADD CONSTRAINT empresas_status_assinatura_check
  CHECK (status_assinatura IN ('ativa', 'pendente', 'inadimplente', 'cancelada'));

CREATE INDEX IF NOT EXISTS idx_empresas_asaas_customer ON empresas(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_empresas_asaas_subscription ON empresas(asaas_subscription_id);

-- Log bruto de cada evento de webhook do Asaas — pra auditoria/debug de
-- cobrança, já que é dinheiro de verdade. Não é usado pra lógica, só histórico.
CREATE TABLE IF NOT EXISTS asaas_webhook_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento TEXT,
  asaas_payment_id TEXT,
  asaas_subscription_id TEXT,
  payload JSONB,
  processado BOOLEAN NOT NULL DEFAULT false,
  erro TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);
