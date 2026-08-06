-- Guarda a identificação da conta Bling conectada (nome/CNPJ), pra dar pra
-- ver na tela de Integrações com qual empresa Bling a conta está de fato
-- ligada — sem isso não tinha como conferir, se a empresa tiver mais de uma
-- conta Bling. Preenchido na hora de conectar; pra conexões feitas antes
-- dessa coluna existir, é preenchido de forma preguiçosa na próxima
-- sincronização (ver bling.ts).
ALTER TABLE bling_integracoes ADD COLUMN IF NOT EXISTS conta_nome TEXT;
ALTER TABLE bling_integracoes ADD COLUMN IF NOT EXISTS conta_cnpj TEXT;
