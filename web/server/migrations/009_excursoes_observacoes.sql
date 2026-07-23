-- Campo de observação livre no cadastro de excursão
ALTER TABLE excursoes ADD COLUMN IF NOT EXISTS observacoes TEXT;
