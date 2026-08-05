-- Empresa pode se cadastrar com CNPJ ou CPF (informal/MEI que ainda não
-- abriu CNPJ). CNPJ deixa de ser obrigatório — CPF entra como alternativa.
-- Sempre precisa ter pelo menos um dos dois.
ALTER TABLE empresas ALTER COLUMN cnpj DROP NOT NULL;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cpf VARCHAR(11) UNIQUE;

ALTER TABLE empresas DROP CONSTRAINT IF EXISTS empresas_doc_check;
ALTER TABLE empresas ADD CONSTRAINT empresas_doc_check CHECK (cnpj IS NOT NULL OR cpf IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_empresas_cpf ON empresas(cpf);
