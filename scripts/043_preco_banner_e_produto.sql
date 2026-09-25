ALTER TABLE public.banners_home
  ADD COLUMN IF NOT EXISTS preco NUMERIC(10, 2);

ALTER TABLE public.banners_home
  DROP CONSTRAINT IF EXISTS banners_home_preco_check;

ALTER TABLE public.banners_home
  ADD CONSTRAINT banners_home_preco_check
  CHECK (preco IS NULL OR preco >= 0);

COMMENT ON COLUMN public.banners_home.preco IS
  'Preço em verde do cartão da oferta. Se vazio, usa o preço do produto ou do combo.';

ALTER TABLE public.itens_cardapio
  ADD COLUMN IF NOT EXISTS preco_riscado NUMERIC(10, 2);

ALTER TABLE public.itens_cardapio
  DROP CONSTRAINT IF EXISTS itens_cardapio_preco_riscado_check;

ALTER TABLE public.itens_cardapio
  ADD CONSTRAINT itens_cardapio_preco_riscado_check
  CHECK (preco_riscado IS NULL OR preco_riscado > 0);

COMMENT ON COLUMN public.itens_cardapio.preco_riscado IS
  'Preço original exibido riscado no banner quando o produto é o destino e o banner não informa outro valor.';
