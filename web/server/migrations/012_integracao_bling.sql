-- Integração com Bling: cada empresa conecta a própria conta (OAuth2, um
-- app Unik Transporte único cadastrado no developer.bling.com.br — mesmo
-- modelo do WhatsApp: uma credencial nossa, N autorizações por empresa).

-- Token de acesso por empresa. UNIQUE em empresa_id porque só permitimos
-- uma conta Bling conectada por empresa.
CREATE TABLE IF NOT EXISTS bling_integracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expira_em TIMESTAMP NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultima_sincronizacao TIMESTAMP,
  ultimo_erro TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Fila de pedidos puxados do Bling que ainda não têm excursão/entregador
-- definidos — a empresa completa esses dados manualmente no nosso painel
-- antes do pedido virar um registro de verdade em "pedidos".
CREATE TABLE IF NOT EXISTS pedidos_importados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  origem TEXT NOT NULL DEFAULT 'bling',
  origem_pedido_id TEXT NOT NULL,
  numero_pedido TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT,
  cliente_documento TEXT,
  cliente_empresa_id UUID REFERENCES cliente_empresa(id),
  volumes INT NOT NULL DEFAULT 1,
  itens_resumo TEXT,
  valor_total NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'finalizado', 'ignorado')),
  pedido_id UUID REFERENCES pedidos(id),
  dados_brutos JSONB,
  criado_em TIMESTAMP DEFAULT NOW(),
  finalizado_em TIMESTAMP,
  UNIQUE(empresa_id, origem, origem_pedido_id)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_importados_fila
  ON pedidos_importados(empresa_id, status);

-- Número do pedido de verdade (o que fica escrito no volume/etiqueta física
-- pra dar pra identificar um pacote de meio de 12). Independe de vir do
-- Bling ou ser digitado manualmente no cadastro direto do pedido.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero_pedido TEXT;
CREATE INDEX IF NOT EXISTS idx_pedidos_numero_pedido ON pedidos(empresa_id, numero_pedido);
