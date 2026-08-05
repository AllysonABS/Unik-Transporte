-- Schema base da plataforma (empresas, despachantes, pedidos etc.)
--
-- Reconstruído a partir das queries em server/index.ts: o projeto nunca teve
-- essa base versionada como migration (foi criada manualmente num banco
-- anterior que não existe mais). As migrations 001-009 sempre assumiram que
-- essas tabelas já existiam. Larguras/CHECKs sem confirmação direta no código
-- foram deixados como TEXT livre em vez de VARCHAR curto, para não arriscar
-- um erro de truncamento em produção.
--
-- Modelo de acesso: só empresa (web) e despachante (app) têm conta própria.
-- O cliente final nunca loga em lugar nenhum — o cadastro dele é só um
-- registro de contato preenchido manualmente pela empresa (cliente_empresa).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- usada por 006_admins.sql e 007_whatsapp.sql

-- === EMPRESAS ===
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL,
  cnpj VARCHAR(14) NOT NULL UNIQUE,
  nome_responsavel TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  endereco TEXT,
  numero VARCHAR(10),
  bairro VARCHAR(80),
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  horario_funcionamento TEXT,
  plano TEXT,
  valor_plano NUMERIC(10,2),
  status_assinatura TEXT NOT NULL DEFAULT 'ativa',
  ativa BOOLEAN NOT NULL DEFAULT true,
  data_cadastro TIMESTAMP DEFAULT NOW(),
  data_vencimento TIMESTAMP
);

-- === DESPACHANTES (conta própria, criada por eles mesmos no app) ===
CREATE TABLE IF NOT EXISTS despachantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf VARCHAR(11) NOT NULL UNIQUE,
  telefone TEXT,
  senha_hash TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_cadastro TIMESTAMP DEFAULT NOW()
);

-- === ASSINATURAS (uma por empresa, criada no cadastro) ===
CREATE TABLE IF NOT EXISTS assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ativa',
  valor NUMERIC(10,2),
  data_vencimento TIMESTAMP,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- === CLIENTE_EMPRESA (cadastro de cliente final — sempre feito pela empresa
-- manualmente — o cliente não tem conta nem login em lugar nenhum) ===
CREATE TABLE IF NOT EXISTS cliente_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT,
  cpf TEXT,
  cnpj TEXT,
  rg TEXT,
  telefone TEXT,
  email TEXT,
  data_nascimento DATE,
  cep TEXT,
  endereco TEXT,
  numero VARCHAR(10),
  bairro VARCHAR(80),
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'bloqueado')),
  data_vinculo TIMESTAMP DEFAULT NOW()
);

-- === DESPACHANTE_EMPRESA (vínculo — empresa busca o despachante pelo CPF
-- que ele já cadastrou sozinho no app e vincula — nunca cria a conta) ===
CREATE TABLE IF NOT EXISTS despachante_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  despachante_id UUID NOT NULL REFERENCES despachantes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_vinculo TIMESTAMP DEFAULT NOW()
);

-- === EXCURSÕES ===
CREATE TABLE IF NOT EXISTS excursoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  setor VARCHAR(200) NOT NULL,
  vaga VARCHAR(200) NOT NULL,
  responsavel TEXT NOT NULL,
  telefone TEXT,
  observacoes TEXT,
  data_cadastro TIMESTAMP DEFAULT NOW()
);

-- === PEDIDOS ===
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  despachante_id UUID REFERENCES despachantes(id),
  excursao_id UUID REFERENCES excursoes(id),
  cliente_nome TEXT NOT NULL,
  despachante_nome TEXT NOT NULL,
  excursao_nome TEXT NOT NULL,
  cliente_telefone VARCHAR(20),
  volumes INT NOT NULL DEFAULT 1,
  descricao TEXT,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_transito', 'entregue', 'cancelado')),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP
);

-- === ETAPAS DO PEDIDO ===
CREATE TABLE IF NOT EXISTS pedido_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  concluida BOOLEAN NOT NULL DEFAULT false,
  hora TIMESTAMP,
  ordem INT NOT NULL DEFAULT 0
);

-- === FOTOS DO PEDIDO ===
CREATE TABLE IF NOT EXISTS pedido_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  etapa TEXT NOT NULL DEFAULT 'geral',
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Índices de FK/lookup mais óbvios (004_indexes_performance.sql cobre o resto)
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_despachantes_cpf ON despachantes(cpf);
CREATE INDEX IF NOT EXISTS idx_assinaturas_empresa_id ON assinaturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_excursoes_empresa_id ON excursoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_despachante_empresa_despachante_id ON despachante_empresa(despachante_id);
