-- Suporte a internacionalizacao (ingles) no cardapio.
-- Mantemos "nome" e "descricao" como fonte PT e adicionamos colunas EN opcionais.

ALTER TABLE public.itens_cardapio
  ADD COLUMN IF NOT EXISTS nome_en TEXT,
  ADD COLUMN IF NOT EXISTS descricao_en TEXT;

COMMENT ON COLUMN public.itens_cardapio.nome_en IS
  'Nome do item em ingles (opcional). Se vazio, a aplicacao usa "nome".';

COMMENT ON COLUMN public.itens_cardapio.descricao_en IS
  'Descricao do item em ingles (opcional). Se vazio, a aplicacao usa "descricao".';

