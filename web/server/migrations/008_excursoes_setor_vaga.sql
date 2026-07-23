-- Amplia setor e vaga de excursoes: eram varchar(10), causando erro ao
-- cadastrar setores com nome mais longo que uma letra/número.
ALTER TABLE excursoes ALTER COLUMN setor TYPE VARCHAR(200);
ALTER TABLE excursoes ALTER COLUMN vaga TYPE VARCHAR(200);
