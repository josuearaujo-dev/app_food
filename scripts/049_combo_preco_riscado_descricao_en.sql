-- Preço riscado e descrição em inglês no cadastro do combo.

ALTER TABLE public.combos
  ADD COLUMN IF NOT EXISTS preco_riscado NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS descricao_en TEXT;

ALTER TABLE public.combos
  DROP CONSTRAINT IF EXISTS combos_preco_riscado_check;

ALTER TABLE public.combos
  ADD CONSTRAINT combos_preco_riscado_check
  CHECK (preco_riscado IS NULL OR preco_riscado >= 0);

COMMENT ON COLUMN public.combos.preco_riscado IS
  'Valor riscado no card da oferta. Se vazio, a loja soma os preços dos itens do combo.';

COMMENT ON COLUMN public.combos.descricao_en IS
  'Descrição do combo em inglês. Se vazia, a loja usa a descrição em português.';
