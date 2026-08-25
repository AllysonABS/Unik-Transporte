-- Filtro por loja na integração Bling: uma conta Bling pode ter várias
-- lojas cadastradas dentro dela (site próprio, Mercado Livre, Shopee etc.),
-- e a empresa pode querer sincronizar pedido só de um subconjunto delas —
-- sem isso a importação traz pedido de todas as lojas da conta, misturado.
--
-- NULL = sem filtro, importa de todas as lojas (comportamento anterior,
-- mantido como padrão pra não quebrar quem já está integrado sem nunca ter
-- configurado isso). Array de IDs (JSONB) = importa só dessas lojas.
ALTER TABLE bling_integracoes ADD COLUMN IF NOT EXISTS lojas_selecionadas JSONB;
