ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS nome_en TEXT;

COMMENT ON COLUMN public.categorias.nome_en IS
  'Nome da categoria em inglês (opcional).';

